#!/usr/bin/env python3
"""Gera o manifesto de lotes do arcade FUNDIÇÃO (/jogo) a partir do corpus canônico.

Este gerador não cria leitura nem dado novo: ele *seleciona* objetos já
catalogados e já codificados, aplicando filtros de elegibilidade explícitos, e
publica a matriz por eixo (0-3) de cada lote elegível.

Filtros, na ordem (cada um é um teste em tests/test_game_data.py):

  1. ID presente em site/data/acervo.json, tem_imagem verdadeiro e
     site/assets/acervo/<id>.webp existente em disco.
  2. Linha presente em data/processed/purification.jsonl (chave de junção).
  3. coded_by fora de {vault-import, migration} — linhas importadas com vetor
     todo-zero são *codificação pendente*, não observação de ausência.
  4. Vetor completo (dez eixos 0-3). Vetor todo-zero NÃO exclui: 0 é
     observação válida de ausência do traço; o que distingue ausência
     observada de "não codificado" é o codificador (regra 3).
  5. Notas livres de TEXTUAL / not visual / #sem-iiif — base textual não vira
     transformação visual.
  6. Notas livres de PENDING_REVIEW / tentativ.
  7. Vetores de purification.jsonl e records.jsonl coincidentes.
  8. Janela de ano por etapa: Brasil 1822-1922 nas etapas I-II; lista de
     autorização explícita nas etapas III-IV.

Regra metodológica: os dez eixos NUNCA são somados. A soma serve apenas,
em tempo de build, para dimensionar o orçamento de carimbos do lote; nem o
agregado, nem o escore aposentado entram no artefato.

Uso:
    python scripts/build_game_data.py --corpus /caminho/para/iconocracy-corpus
    python scripts/build_game_data.py --ledger-url <url> --records-url <url>
"""
from __future__ import annotations

import argparse
import json
import pathlib
import re
import sys
import urllib.error
import urllib.request
from collections import Counter
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[1]
DEFAULT_ACERVO = ROOT / "site/data/acervo.json"
DEFAULT_ASSETS = ROOT / "site/assets/acervo"
DEFAULT_OUT = ROOT / "site/data"
DEFAULT_SCHEMA = ROOT / "schemas/jogo.schema.json"

SCHEMA_VERSION = "mnemosyne-viva/jogo@1"

# Os dez indicadores, em ordem canônica (codebook-MASTER v2.2.1).
EIXOS: list[tuple[str, str, str]] = [
    ("desincorporacao", "desincorporação",
     "a figura se desprende: escala e contraste, o corpo recua"),
    ("rigidez_postural", "rigidez postural",
     "a imagem se retifica; a pose perde o balanço"),
    ("dessexualizacao", "dessexualização",
     "o corte fecha para o busto; os tons de pele achatam"),
    ("uniformizacao_facial", "uniformização facial",
     "uma máscara suave em violeta assenta sobre o rosto"),
    ("heraldizacao", "heraldicização",
     "moldura dourada e brasão seguram a imagem"),
    ("enquadramento_arquitetonico", "enquadramento arquitetônico",
     "colunas em gradiente repetido ladeiam a figura"),
    ("apagamento_narrativo", "apagamento narrativo",
     "máscara radial devora o entorno; a figura fica sozinha"),
    ("monocromatizacao", "monocromatização",
     "escala de cinza e sépia"),
    ("serialidade", "serialidade",
     "a figura se duplica numa fileira de três"),
    ("inscricao_estatal", "inscrição estatal",
     "uma faixa de legenda carimba o terço inferior"),
]
EIXOS_CHAVES = [chave for chave, _, _ in EIXOS]

# Codificadores cujas linhas importadas não são codificação observada.
CODERS_PENDENTES = {"vault-import", "migration"}
NOTAS_TEXTUAL = ("textual", "not visual", "#sem-iiif")
NOTAS_TENTATIVAS = ("pending_review", "tentativ")

# Núcleo analítico da tese.
NUCLEO_PAIS = "Brasil"
NUCLEO_ANO_MIN = 1822
NUCLEO_ANO_MAX = 1922

# Etapas III e IV: listas de autorização explícita (fora do recorte).
ETAPA_MILITAR = ["BR-009"]
ETAPA_CONTRA = ["DE-015", "US-019", "FR-031", "SCOUT-571"]

# Duração e folga de carimbos por etapa.
TEMPO_BASE = {"fundacional": 95, "normativo": 80, "militar": 70, "contra-alegoria": 85}
FOLGA_CARIMBOS = {"fundacional": 6, "normativo": 4, "militar": 3, "contra-alegoria": 5}

REGIME_PT = {
    "fundacional": "Fundacional", "normativo": "Normativo",
    "militar": "Militar", "contra-alegoria": "Contra-alegoria",
}

# Notas de escopo: porque estes lotes entram no jogo fora do recorte
# Brasil 1822–1922. O texto não interpreta a imagem — situa o objeto no
# recorte e declara as datas que a interface precisa mostrar.
NOTA_ESCOPO_ICONE = {
    "BR-009": (
        "Fora do recorte de 1822–1922: a escultura é de 1961 e foi atacada em "
        "8 de janeiro de 2023. Entra no jogo como ícone — a âncora de iconoclastia "
        "do acervo."
    ),
}


def nota_de_escopo(item_id: str, escopo: str, item: dict[str, Any], ano: int | None) -> str | None:
    """Nota de escopo do lote, ou None quando o lote está no núcleo."""
    if escopo == "icone":
        return NOTA_ESCOPO_ICONE.get(item_id)
    if escopo == "comparador":
        pais = str(item.get("pais") or "").strip()
        quando = str(ano) if ano else "sem data"
        return (
            "Fora do núcleo da tese (Brasil, 1822–1922): "
            + (pais or "objeto de outro país")
            + ", " + quando
            + ". Entra no jogo como comparador."
        )
    return None


def norm_title(value: Any) -> str:
    return " ".join(str(value or "").lower().replace("\u2014", "-").split())


def ano_de(value: Any) -> int | None:
    match = re.search(r"(1[6-9]\d\d|20\d\d)", str(value or ""))
    return int(match.group(1)) if match else None


def carregar_jsonl(path: pathlib.Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            rows.append(json.loads(line))
    return rows


def baixar(url: str) -> str:
    with urllib.request.urlopen(url, timeout=30) as response:
        return response.read().decode("utf-8")


def carregar_ledger(url: str | None, path: pathlib.Path | None) -> list[dict[str, Any]]:
    if url:
        return [json.loads(line) for line in baixar(url).splitlines() if line.strip()]
    if path is None:
        raise ValueError("Informe --ledger ou --ledger-url.")
    return carregar_jsonl(path)


def carregar_records(url: str | None, path: pathlib.Path | None) -> list[dict[str, Any]]:
    if url:
        return [json.loads(line) for line in baixar(url).splitlines() if line.strip()]
    if path is None:
        raise ValueError("Informe --records ou --records-url.")
    return carregar_jsonl(path)


def vetor_de(row: dict[str, Any]) -> dict[str, int] | None:
    """Extrai o vetor de dez eixos; None quando incompleto."""
    valores = {chave: row.get(chave) for chave in EIXOS_CHAVES}
    if not all(isinstance(valor, int) and 0 <= valor <= 3 for valor in valores.values()):
        return None
    return {chave: int(valor) for chave, valor in valores.items()}


def indice_titulos(acervo: list[dict[str, Any]]) -> dict[str, list[str]]:
    indice: dict[str, list[str]] = {}
    for item in acervo:
        indice.setdefault(norm_title(item.get("titulo")), []).append(str(item.get("id")))
    return indice


def vetores_por_site(
    records: list[dict[str, Any]], acervo: list[dict[str, Any]]
) -> dict[str, dict[str, int]]:
    """Dicionário site_id -> vetor de dez eixos, lido de records.jsonl."""
    site_ids = {str(item.get("id")) for item in acervo}
    indice = indice_titulos(acervo)
    saida: dict[str, dict[str, int]] = {}
    for record in records:
        item_id = str(record.get("item_id") or "")
        alvo: str | None = item_id if item_id in site_ids else None
        if alvo is None:
            dica = norm_title((record.get("input") or {}).get("title_hint"))
            candidatos = indice.get(dica) or []
            if len(candidatos) == 1:
                alvo = candidatos[0]
        if alvo is None:
            continue
        vetor = vetor_de(record.get("purificacao") or {})
        if vetor is not None:
            saida.setdefault(alvo, vetor)
    return saida


def classificar(
    item_id: str,
    linha: dict[str, Any],
    vetor_records: dict[str, int] | None,
) -> str | None:
    """Devolve o motivo da exclusão, ou None se o lote é elegível."""
    codificador = str(linha.get("coded_by") or "")
    notas = str(linha.get("notes") or "")
    notas_low = notas.lower()

    if codificador in CODERS_PENDENTES:
        return "codificacao_pendente"
    if any(marca in notas_low for marca in NOTAS_TEXTUAL):
        return "base_textual"
    if any(marca in notas_low for marca in NOTAS_TENTATIVAS):
        return "codificacao_tentativa"
    vetor = vetor_de(linha)
    if vetor is None:
        return "vetor_incompleto"
    # Vetor todo-zero NÃO é motivo de exclusão por si: 0 é observação válida
    # de ausência do traço. O que separa "ausência observada" de "não
    # codificado" é o codificador (regra 3, acima) e o conflito entre os
    # ledgers (regra 7, abaixo). Um item com plinto vazio, por exemplo, tem
    # legitimately todos os eixos em zero.
    if vetor_records is not None and vetor_records != vetor:
        return "conflito_ledgers"
    return None


def montar_lote(
    item: dict[str, Any],
    linha: dict[str, Any],
    etapa: str,
    ordem: int,
    escopo: str,
    vetor: dict[str, int],
) -> dict[str, Any]:
    item_id = str(item.get("id"))
    # A soma vive só aqui, em tempo de build, para dimensionar o orçamento de
    # carimbos. Ela nunca é gravada, nomeada nem exibida.
    if etapa == "contra-alegoria":
        # Etapa invertida: a figura começa no máximo da fixidez (a demanda do
        # Estado) e cada RECUSA é um ato decisivo — o eixo cai direto ao perfil
        # real do objeto, que numa contra-alegoria é baixo e vivo. Uma recusa
        # por eixo que difere da demanda; tocar num eixo já correto desperdiça
        # um carimbo.
        custo_minimo = sum(1 for chave in EIXOS_CHAVES if vetor[chave] < 3)
    else:
        custo_minimo = sum(vetor[chave] for chave in EIXOS_CHAVES)
    carimbos = max(1, custo_minimo + FOLGA_CARIMBOS[etapa])
    segundos = TEMPO_BASE[etapa] + custo_minimo * 4
    ano = ano_de(item.get("data"))
    nota = nota_de_escopo(item_id, escopo, item, ano)
    lote = {
        "id": item_id,
        "etapa": etapa,
        "ordem": ordem,
        "year": ano_de(item.get("data")),
        "regime": REGIME_PT.get(str(linha.get("regime_iconocratico") or "").lower(),
                                str(item.get("regime") or "")),
        "titulo": str(item.get("titulo") or "(sem título)"),
        "suporte": str(item.get("suporte") or ""),
        "pais": str(item.get("pais") or ""),
        "image": f"assets/acervo/{item_id}.webp",
        "matriz": {chave: vetor[chave] for chave in EIXOS_CHAVES},
        "carimbos": carimbos,
        "segundos": segundos,
        "inicio": 3 if etapa == "contra-alegoria" else 0,
        "citacao": str(item.get("citacao") or ""),
        "fonte_url": str(item.get("fonte_url") or ""),
        "direitos": (str(item.get("direitos")).strip() or None) if item.get("direitos") else None,
        "codificacao": {
            "coded_by": str(linha.get("coded_by") or ""),
            "coded_at": str(linha.get("coded_at") or ""),
            "regime_justificativa": str(linha.get("regime_justificativa") or ""),
            "notas": str(linha.get("notes") or ""),
        },
        "escopo": escopo,
    }
    if nota:
        lote["nota_escopo"] = nota
    return lote


def validar(documento: dict[str, Any], schema_path: pathlib.Path) -> None:
    if not schema_path.exists():
        return
    try:
        import jsonschema  # type: ignore
    except ModuleNotFoundError:
        return
    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    erros = sorted(
        jsonschema.Draft7Validator(schema).iter_errors(documento),
        key=lambda erro: list(erro.absolute_path),
    )
    if erros:
        detalhe = "; ".join(
            f"{'/'.join(map(str, erro.absolute_path)) or '<root>'}: {erro.message}"
            for erro in erros[:10]
        )
        raise ValueError(f"Manifesto inválido segundo o schema: {detalhe}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--corpus", type=pathlib.Path,
                        help="Raiz do clone do corpus canônico.")
    parser.add_argument("--ledger", type=pathlib.Path,
                        help="Caminho para data/processed/purification.jsonl.")
    parser.add_argument("--ledger-url", help="URL do ledger fixado (commit).")
    parser.add_argument("--records", type=pathlib.Path,
                        help="Caminho para data/processed/records.jsonl.")
    parser.add_argument("--records-url", help="URL dos registros fixada (commit).")
    parser.add_argument("--acervo", type=pathlib.Path, default=DEFAULT_ACERVO)
    parser.add_argument("--assets", type=pathlib.Path, default=DEFAULT_ASSETS)
    parser.add_argument("--out", type=pathlib.Path, default=DEFAULT_OUT)
    parser.add_argument("--schema", type=pathlib.Path, default=DEFAULT_SCHEMA)
    parser.add_argument("--version", default="working",
                        help="Rótulo da versão do corpus usada.")
    parser.add_argument("--stamp", default=None,
                        help="Valor explícito para meta.gerado_em (mantém a saída estável).")
    args = parser.parse_args()

    ledger_path = args.ledger
    records_path = args.records
    if args.corpus and not (ledger_path and records_path):
        ledger_path = ledger_path or args.corpus / "data/processed/purification.jsonl"
        records_path = records_path or args.corpus / "data/processed/records.jsonl"

    try:
        acervo = json.loads(args.acervo.read_text(encoding="utf-8"))
        ledger = carregar_ledger(args.ledger_url, ledger_path)
        records = carregar_records(args.records_url, records_path)
    except (OSError, ValueError, json.JSONDecodeError, urllib.error.URLError) as erro:
        print(f"[build_game_data] erro: {erro}", file=sys.stderr)
        return 1

    vetores_records = vetores_por_site(records, acervo)
    por_id = {str(item.get("id")): item for item in acervo}
    linhas = {str(linha.get("id")): linha for linha in ledger}

    excluidos: Counter[str] = Counter()
    lotes: list[dict[str, Any]] = []
    contador_etapa = Counter()

    # Etapas I e II: núcleo Brasil 1822-1922, por regime.
    for item_id, item in por_id.items():
        if str(item.get("pais") or "") != NUCLEO_PAIS:
            continue
        ano = ano_de(item.get("data"))
        if ano is None or not (NUCLEO_ANO_MIN <= ano <= NUCLEO_ANO_MAX):
            continue
        linha = linhas.get(item_id)
        if linha is None:
            excluidos["sem_linha_no_ledger"] += 1
            continue
        if not item.get("tem_imagem"):
            excluidos["sem_imagem"] += 1
            continue
        if not (args.assets / f"{item_id}.webp").is_file():
            excluidos["imagem_ausente_em_disco"] += 1
            continue
        motivo = classificar(item_id, linha, vetores_records.get(item_id))
        if motivo:
            excluidos[motivo] += 1
            continue
        regime = str(linha.get("regime_iconocratico") or "").lower()
        etapa = {"fundacional": "fundacional", "normativo": "normativo"}.get(regime)
        if etapa is None:
            excluidos["regime_fora_do_nucleo_jogavel"] += 1
            continue
        contador_etapa[etapa] += 1
        vetor = vetor_de(linha) or {}
        lotes.append(montar_lote(item, linha, etapa, contador_etapa[etapa], "nucleo", vetor))

    # Etapas III e IV: listas de autorização explícita, fora do recorte.
    for etapa, permitidos, escopo in (
        ("militar", ETAPA_MILITAR, "icone"),
        ("contra-alegoria", ETAPA_CONTRA, "comparador"),
    ):
        for item_id in permitidos:
            item = por_id.get(item_id)
            if item is None:
                excluidos["id_inexistente_no_acervo"] += 1
                continue
            linha = linhas.get(item_id)
            if linha is None:
                excluidos["sem_linha_no_ledger"] += 1
                continue
            if not item.get("tem_imagem") or not (args.assets / f"{item_id}.webp").is_file():
                excluidos["imagem_ausente_em_disco"] += 1
                continue
            motivo = classificar(item_id, linha, vetores_records.get(item_id))
            if motivo:
                excluidos[motivo] += 1
                continue
            contador_etapa[etapa] += 1
            vetor = vetor_de(linha) or {}
            lotes.append(montar_lote(item, linha, etapa, contador_etapa[etapa], escopo, vetor))

    ordem_etapas = {"fundacional": 0, "normativo": 1, "militar": 2, "contra-alegoria": 3}
    lotes.sort(key=lambda lote: (ordem_etapas[lote["etapa"]], lote["ordem"]))

    documento: dict[str, Any] = {
        "schema_version": SCHEMA_VERSION,
        "eixos": [
            {"chave": chave, "nome": nome, "tratamento": tratamento}
            for chave, nome, tratamento in EIXOS
        ],
        "lotes": lotes,
        "meta": {
            "corpus_version": args.version,
            "total_lotes": len(lotes),
            "excluidos": dict(sorted(excluidos.items())),
        },
    }
    if args.stamp:
        documento["meta"]["gerado_em"] = args.stamp

    try:
        validar(documento, args.schema)
    except ValueError as erro:
        print(f"[build_game_data] erro: {erro}", file=sys.stderr)
        return 1

    args.out.mkdir(parents=True, exist_ok=True)
    destino = args.out / "jogo.json"
    destino.write_text(json.dumps(documento, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"manifesto: {destino}")
    print(f"lotes: {len(lotes)}")
    for etapa in ("fundacional", "normativo", "militar", "contra-alegoria"):
        n = sum(1 for lote in lotes if lote["etapa"] == etapa)
        if n:
            print(f"  etapa {etapa}: {n}")
    print("excluídos por regra:")
    for motivo, n in sorted(documento["meta"]["excluidos"].items()):
        print(f"  {motivo}: {n}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
