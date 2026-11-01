#!/usr/bin/env python3
"""Re-deriva o fixture de tests/fixtures/jogo-production (FUNDIÇÃO / /jogo).

Este script é a receita auditável do fixture; NÃO é um teste (pytest não o
coleta: o nome não começa por test_). Ele reconstrói a fatiagem a partir de
duas fontes externas ao repo:

* site/data/acervo.json (este repo) — a população de itens;
* o clone canônico do corpus (read-only), para os dois ledgers.

Por que a fatia reproduz o manifesto byte-a-byte
------------------------------------------------
O gerador scripts/build_game_data.py só *conta* uma exclusão para itens de
acervo com pais == "Brasil" e ano 1822-1922. Fatiar exatamente essa população
(mais os cinco ids autorizados das etapas III-IV) preserva meta.excluidos; os
itens sem linha no ledger continuam ausentes de purification-slice.jsonl e,
portanto, ainda contam como sem_linha_no_ledger.

Uso:
    python3 tests/fixtures/jogo-production/make_fixture.py
        --corpus /caminho/para/iconocracy-corpus
        --version iconocracy-corpus@d5f8ad1
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import pathlib
import shutil
from collections import Counter
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[3]
FIXTURE = pathlib.Path(__file__).resolve().parent
GERADOR = ROOT / "scripts" / "build_game_data.py"
NOVA_LINHA = chr(10)


def carregar_gerador():
    """Importa o gerador real (fonte da semântica de fatiagem)."""
    spec = importlib.util.spec_from_file_location("build_game_data", GERADOR)
    assert spec and spec.loader
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo


def sha256(dados: bytes) -> str:
    return hashlib.sha256(dados).hexdigest()


def escrever_jsonl(caminho: pathlib.Path, linhas: list[dict[str, Any]]) -> None:
    caminho.write_text(
        "".join(json.dumps(linha, ensure_ascii=False) + NOVA_LINHA for linha in linhas),
        encoding="utf-8",
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--corpus", type=pathlib.Path, required=True)
    parser.add_argument("--version", default="iconocracy-corpus@d5f8ad1")
    args = parser.parse_args()

    gen = carregar_gerador()

    acervo = json.loads((ROOT / "site" / "data" / "acervo.json").read_text(encoding="utf-8"))
    ledger_path = args.corpus / "data/processed/purification.jsonl"
    records_path = args.corpus / "data/processed/records.jsonl"
    ledger = gen.carregar_jsonl(ledger_path)
    records = gen.carregar_jsonl(records_path)

    # --- populacao da fatia -------------------------------------------------
    ids_autorizados = set(gen.ETAPA_MILITAR) | set(gen.ETAPA_CONTRA)
    ids_nucleo = set()
    for item in acervo:
        if str(item.get("pais") or "") != gen.NUCLEO_PAIS:
            continue
        ano = gen.ano_de(item.get("data"))
        if ano is None or not (gen.NUCLEO_ANO_MIN <= ano <= gen.NUCLEO_ANO_MAX):
            continue
        ids_nucleo.add(str(item.get("id")))
    ids_fatia = ids_nucleo | ids_autorizados

    # acervo-slice: ordem original preservada (a ordem define ordem/carimbos).
    acervo_slice = [item for item in acervo if str(item.get("id")) in ids_fatia]

    # purification-slice: linhas cujo id esta na fatia (itens sem linha
    # permanecem ausentes -> continuam contando como sem_linha_no_ledger).
    ledger_slice = [linha for linha in ledger if str(linha.get("id")) in ids_fatia]

    # records-slice: a resolucao de ids e a do PROPRIO gerador (item_id ou
    # input.title_hint contra o indice normalizado de titulos). So entram as
    # linhas que, no acervo completo, resolvem para um id da fatia.
    indice = gen.indice_titulos(acervo)
    site_ids = {str(item.get("id")) for item in acervo}
    records_slice: list[dict[str, Any]] = []
    for record in records:
        item_id = str(record.get("item_id") or "")
        alvo = item_id if item_id in site_ids else None
        if alvo is None:
            dica = gen.norm_title((record.get("input") or {}).get("title_hint"))
            candidatos = indice.get(dica) or []
            if len(candidatos) == 1:
                alvo = candidatos[0]
        if alvo in ids_fatia:
            records_slice.append(record)

    # --- escrita ------------------------------------------------------------
    FIXTURE.mkdir(parents=True, exist_ok=True)
    (FIXTURE / "acervo-slice.json").write_text(
        json.dumps(acervo_slice, ensure_ascii=False, indent=2) + NOVA_LINHA, encoding="utf-8"
    )
    escrever_jsonl(FIXTURE / "purification-slice.jsonl", ledger_slice)
    escrever_jsonl(FIXTURE / "records-slice.jsonl", records_slice)

    # golden: copia byte-identica do manifesto commitado.
    shutil.copyfile(ROOT / "site" / "data" / "jogo.json", FIXTURE / "jogo.json")

    manifesto = json.loads((FIXTURE / "jogo.json").read_text(encoding="utf-8"))
    ids_lote = [lote["id"] for lote in manifesto["lotes"]]
    # ids da fatia que tem vetor de dez eixos em records.jsonl (mesma resolucao
    # do gerador: item_id ou input.title_hint com titulo unico).
    vetores = gen.vetores_por_site(records_slice, acervo_slice)
    ids_com_registro = sorted(item for item in vetores if item in ids_fatia)

    arquivos = {}
    for nome, origem in (
        ("acervo-slice.json", "site/data/acervo.json (fatia Brasil 1822-1922 + ids autorizados)"),
        ("purification-slice.jsonl", "data/processed/purification.jsonl (fatia)"),
        ("records-slice.jsonl", "data/processed/records.jsonl (fatia)"),
        ("jogo.json", "site/data/jogo.json"),
    ):
        dados = (FIXTURE / nome).read_bytes()
        arquivos[nome] = {
            "source": origem,
            "bytes": len(dados),
            "sha256": sha256(dados),
        }

    manifesto_pin = {
        "repository": "anavvanzin/iconocracia",
        "captured_at_utc": "2026-10-31",
        "corpus_version": args.version,
        "corpus_commit": args.version.split("@")[-1],
        "derivation": "tests/fixtures/jogo-production/make_fixture.py",
        "files": arquivos,
        "upstream": {
            "site/data/acervo.json": sha256((ROOT / "site" / "data" / "acervo.json").read_bytes()),
            "data/processed/purification.jsonl": sha256(ledger_path.read_bytes()),
            "data/processed/records.jsonl": sha256(records_path.read_bytes()),
        },
        "fatia": {
            "ids_total": len(ids_fatia),
            "ids_nucleo_brasil_1822_1922": len(ids_nucleo),
            "ids_autorizados_etapas_iii_iv": sorted(ids_autorizados),
            "ids_com_linha_no_ledger": len(ledger_slice),
            "ids_sem_linha_no_ledger": sorted(
                ids_fatia - {str(linha.get("id")) for linha in ledger_slice}
            ),
            "ids_com_registro_em_records": len(ids_com_registro),
            "ids_dos_lotes_com_registro_em_records": sorted(
                item for item in ids_lote if item in ids_com_registro
            ),
            "ids_dos_lotes_sem_registro_em_records": sorted(
                item for item in ids_lote if item not in ids_com_registro
            ),
        },
        "lotes_por_etapa": dict(
            sorted(Counter(lote["etapa"] for lote in manifesto["lotes"]).items())
        ),
        "total_lotes": manifesto["meta"]["total_lotes"],
        "excluidos": manifesto["meta"]["excluidos"],
        "ids_dos_lotes": ids_lote,
    }
    (FIXTURE / "manifest.json").write_text(
        json.dumps(manifesto_pin, ensure_ascii=False, indent=2) + NOVA_LINHA, encoding="utf-8"
    )

    print("fixture regravado em", FIXTURE)
    print("  acervo-slice.json:", len(acervo_slice), "itens")
    print("  purification-slice.jsonl:", len(ledger_slice), "linhas")
    print("  records-slice.jsonl:", len(records_slice), "linhas")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
