"""Testes do manifesto de lotes do arcade FUNDIÇÃO (/jogo).

O manifesto é produzido por scripts/build_game_data.py a partir do corpus
canônico. A suíte é hermética: a fatiagem fixada em
tests/fixtures/jogo-production/ reproduz byte-a-byte o manifesto commitado
(site/data/jogo.json) sem depender do clone do corpus nem de rede.

O núcleo metodológico é a regra de não-agregação: os dez eixos NUNCA são
somados. Nenhuma chave — nem no JSON, nem nos módulos JS do jogo — pode
guardar um total, um índice, uma média ou um escore.
"""
from __future__ import annotations

import glob
import hashlib
import json
import re
import subprocess
import sys
import tempfile
import unittest
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "tests" / "fixtures" / "jogo-production"
GERADOR = ROOT / "scripts" / "build_game_data.py"
COMMITADO = ROOT / "site" / "data" / "jogo.json"
SCHEMA = ROOT / "schemas" / "jogo.schema.json"
VERSAO_CORPUS = "iconocracy-corpus@d5f8ad1"

# Os dez indicadores, em ordem canônica (codebook-MASTER v2.2.1).
# Atenção: a chave é heraldizacao (com z).
EIXOS_CANONICOS = [
    "desincorporacao",
    "rigidez_postural",
    "dessexualizacao",
    "uniformizacao_facial",
    "heraldizacao",
    "enquadramento_arquitetonico",
    "apagamento_narrativo",
    "monocromatizacao",
    "serialidade",
    "inscricao_estatal",
]

# Qualquer chave com estes tokens agregaria (ou nomearia) um total.
# "total_lotes" é legítimo: o token proibido é "score_total", não "total".
REGEX_AGREGADO = re.compile(r"endurecimento|indice|score_total|media|sum", re.IGNORECASE)

# Vocabulario fechado de motivos de exclusao (scripts/build_game_data.py).
MOTIVOS_EXCLUSAO = {
    "base_textual",
    "codificacao_pendente",
    "codificacao_tentativa",
    "sem_imagem",
    "sem_linha_no_ledger",
    "vetor_incompleto",
    "conflito_ledgers",
    "imagem_ausente_em_disco",
    "regime_fora_do_nucleo_jogavel",
    "id_inexistente_no_acervo",
}

# --- Varredura dos modulos JS ---------------------------------------------
#
# O mesmo conjunto de tokens proibidos, lido a nivel de identificador: um
# token so e infracao quando aparece como palavra inteira dentro de um
# identificador (ou, nos casos explicitos, como parte de um identificador
# composto: "indice", "endurecimento", "score_total").
#
# Por que nao uma busca crua de substringa no texto? Porque ela acusaria
# "resume" (API Web Audio: AudioContext.resume), "resumo" (palavra comum) e
# "matchMedia" (API DOM, usada por prefers-reduced-motion) — nenhum deles e
# um agregado. A regra metodologica proibe agregar os dez eixos; nao proibe
# o vocabulario da plataforma.
PALAVRAS_PROIBIDAS = {"endurecimento", "indice", "media", "sum"}
SEQUENCIAS_PROIBIDAS = (("score", "total"),)
COMPOSTOS_PROIBIDOS = ("indice", "endurecimento", "score_total")
# APIs de plataforma cujo nome contem um token, mas que nao sao agregados.
APIS_DE_PLATAFORMA = {"matchmedia", "mediadevices", "mediaquery", "mediastream"}

IDENTIFICADOR = re.compile(r"[A-Za-z_$][A-Za-z0-9_$]*")
PALAVRA_CAMEL = re.compile(r"[A-Z]+(?![a-z])|[A-Z][a-z0-9]*|[a-z0-9]+")

CODERS_PENDENTES = {"vault-import", "migration"}
NOTAS_TEXTUAL = ("textual", "not visual", "#sem-iiif")
NOTAS_TENTATIVAS = ("pending_review", "tentativ")

ETAPA_MILITAR = ["BR-009"]
ETAPA_CONTRA = ["DE-015", "US-019", "FR-031", "SCOUT-571"]

# Universo de chaves fechado do documento: nenhuma chave nova pode aparecer,
# portanto nenhum total derivado pode ser guardado.
CHAVES_CONHECIDAS = set(EIXOS_CANONICOS) | {
    "schema_version", "eixos", "lotes", "meta",
    "chave", "nome", "tratamento",
    "id", "etapa", "ordem", "year", "regime", "titulo", "suporte", "pais",
    "image", "matriz", "carimbos", "segundos", "inicio", "citacao",
    "fonte_url", "direitos", "codificacao", "escopo", "nota_escopo",
    "coded_by", "coded_at", "regime_justificativa", "notas",
    "corpus_version", "total_lotes", "excluidos", "gerado_em",
}

# Campos ordinais e de orçamento do lote. carimbos/segundos são deduzidos em
# tempo de build a partir da soma, mas não são a soma: são valores de budget.
CAMPOS_ORDINAIS = {"ordem", "year", "inicio", "segundos", "carimbos"}


def norm_title(valor) -> str:
    """Normalização de título (espelha scripts/build_game_data.py)."""
    return " ".join(str(valor or "").lower().replace(chr(0x2014), "-").split())


def ano_de(valor):
    """Ano de quatro dígitos (espelha scripts/build_game_data.py)."""
    achado = re.search(r"(1[6-9][0-9][0-9]|20[0-9][0-9])", str(valor or ""))
    return int(achado.group(1)) if achado else None


def ler_jsonl(caminho: Path) -> list:
    return [
        json.loads(linha)
        for linha in caminho.read_text(encoding="utf-8").splitlines()
        if linha.strip()
    ]


class JogoDataTests(unittest.TestCase):
    """Contrato de dados do arcade FUNDIÇÃO."""

    # --- infraestrutura ----------------------------------------------------

    @classmethod
    def setUpClass(cls):
        cls._tmp = tempfile.TemporaryDirectory(prefix="jogo-dados-")
        cls.arquivo = cls.gerar(Path(cls._tmp.name) / "primeira")
        cls.documento = json.loads(cls.arquivo.read_text(encoding="utf-8"))

    @classmethod
    def tearDownClass(cls):
        cls._tmp.cleanup()

    @staticmethod
    def gerar(out_dir: Path) -> Path:
        """Roda o gerador contra a fatiagem fixada e devolve o arquivo."""
        out_dir.mkdir(parents=True, exist_ok=True)
        comando = [
            sys.executable, str(GERADOR),
            "--ledger", str(FIXTURE / "purification-slice.jsonl"),
            "--records", str(FIXTURE / "records-slice.jsonl"),
            "--acervo", str(FIXTURE / "acervo-slice.json"),
            "--version", VERSAO_CORPUS,
            "--out", str(out_dir),
        ]
        resultado = subprocess.run(
            comando, cwd=ROOT, capture_output=True, text=True, timeout=120
        )
        if resultado.returncode != 0:
            raise AssertionError(
                "gerador falhou (" + str(resultado.returncode) + "): "
                + resultado.stdout + resultado.stderr
            )
        destino = out_dir / "jogo.json"
        if not destino.is_file():
            raise AssertionError("gerador nao escreveu " + str(destino))
        return destino

    @staticmethod
    def _tokens_agregados_em_js(texto: str):
        """Devolve (linha, identificador, token) para cada infracao no JS."""
        ofensas = []
        for achado in IDENTIFICADOR.finditer(texto):
            identificador = achado.group(0)
            baixo = identificador.lower()
            if baixo in APIS_DE_PLATAFORMA:
                continue
            palavras = [p.lower() for p in PALAVRA_CAMEL.findall(identificador)]
            token = None
            for palavra in palavras:
                if palavra in PALAVRAS_PROIBIDAS:
                    token = palavra
                    break
            if token is None:
                for inicio in range(len(palavras) - 1):
                    par = (palavras[inicio], palavras[inicio + 1])
                    if par in SEQUENCIAS_PROIBIDAS:
                        token = par[0] + "_" + par[1]
                        break
            if token is None:
                for composto in COMPOSTOS_PROIBIDOS:
                    if composto in baixo:
                        token = composto
                        break
            if token is not None:
                linha = texto.count(chr(10), 0, achado.start()) + 1
                ofensas.append((linha, identificador, token))
        return ofensas

    @staticmethod
    def _chaves(no, caminho=""):
        """Percorre o documento e devolve (caminho, chave) de cada chave."""
        if isinstance(no, dict):
            for chave, valor in no.items():
                novo = caminho + "/" + str(chave)
                yield novo, str(chave)
                yield from JogoDataTests._chaves(valor, novo)
        elif isinstance(no, list):
            for indice, valor in enumerate(no):
                yield from JogoDataTests._chaves(valor, caminho + "[" + str(indice) + "]")

    def _acervo_slice(self) -> list:
        return json.loads((FIXTURE / "acervo-slice.json").read_text(encoding="utf-8"))

    def _ledger_slice(self) -> list:
        return ler_jsonl(FIXTURE / "purification-slice.jsonl")

    def _records_slice(self) -> list:
        return ler_jsonl(FIXTURE / "records-slice.jsonl")

    # --- 1. idempotência / golden ------------------------------------------

    def test_regeneracao_e_byte_identica_ao_golden_e_ao_manifesto_commitado(self):
        golden = (FIXTURE / "jogo.json").read_bytes()
        commitado = COMMITADO.read_bytes()
        primeira = self.arquivo.read_bytes()

        self.assertEqual(
            primeira, golden,
            "a regeneração a partir da fatia fixada diverge do golden do fixture",
        )
        self.assertEqual(
            primeira, commitado,
            "a regeneração a partir da fatia fixada diverge de site/data/jogo.json",
        )

        # Segunda execução: a saída precisa ser byte-idêntica (idempotência).
        segunda = self.gerar(Path(self._tmp.name) / "segunda").read_bytes()
        self.assertEqual(segunda, primeira, "a segunda execução não é byte-idêntica")
        self.assertEqual(segunda, golden)

        # O golden do fixture e o manifesto commitado são o mesmo artefato.
        self.assertEqual(golden, commitado)
        self.assertEqual(
            hashlib.sha256(primeira).hexdigest(),
            hashlib.sha256(commitado).hexdigest(),
        )

    def test_manifesto_do_fixture_casa_com_o_golden(self):
        pin = json.loads((FIXTURE / "manifest.json").read_text(encoding="utf-8"))
        for nome, metadados in pin["files"].items():
            with self.subTest(fixture=nome):
                dados = (FIXTURE / nome).read_bytes()
                self.assertEqual(len(dados), metadados["bytes"])
                self.assertEqual(hashlib.sha256(dados).hexdigest(), metadados["sha256"])
        self.assertEqual(pin["corpus_version"], VERSAO_CORPUS)
        self.assertEqual(pin["total_lotes"], self.documento["meta"]["total_lotes"])
        self.assertEqual(pin["excluidos"], self.documento["meta"]["excluidos"])
        self.assertEqual(
            pin["lotes_por_etapa"],
            dict(sorted(Counter(lote["etapa"] for lote in self.documento["lotes"]).items())),
        )

    # --- 2. schema ---------------------------------------------------------

    def test_manifesto_valida_contra_o_schema(self):
        try:
            import jsonschema
        except ModuleNotFoundError:
            self.skipTest("jsonschema nao instalado: validacao de schema indisponivel")
        schema = json.loads(SCHEMA.read_text(encoding="utf-8"))
        erros = sorted(
            jsonschema.Draft7Validator(schema).iter_errors(self.documento),
            key=lambda erro: list(erro.absolute_path),
        )
        self.assertEqual(
            [
                ("/".join(map(str, erro.absolute_path)) or "<root>") + ": " + erro.message
                for erro in erros
            ],
            [],
        )

    # --- 3. não-agregação --------------------------------------------------

    def test_json_sem_agregado_em_nenhuma_chave(self):
        ofensas = [
            caminho + " -> " + chave
            for caminho, chave in self._chaves(self.documento)
            if REGEX_AGREGADO.search(chave)
        ]
        self.assertEqual(
            ofensas, [],
            "chave agregada no manifesto: os dez eixos nunca são somados",
        )

    def test_modulos_js_do_jogo_sem_agregado(self):
        arquivos = sorted(glob.glob(str(ROOT / "site" / "assets" / "jogo" / "*.js")))
        if not arquivos:
            self.skipTest(
                "modulos do jogo ainda nao presentes em site/assets/jogo/*.js"
            )
        for arquivo in arquivos:
            texto = Path(arquivo).read_text(encoding="utf-8")
            for numero, identificador, token in self._tokens_agregados_em_js(texto):
                self.fail(
                    Path(arquivo).name + ":" + str(numero)
                    + " identificador agregado " + repr(identificador)
                    + " (token " + repr(token) + ")"
                )

    def test_matriz_dez_eixos_sem_total_derivado(self):
        for lote in self.documento["lotes"]:
            matriz = lote["matriz"]
            self.assertEqual(len(matriz), 10, "a matriz tem de ter dez eixos")
            self.assertEqual(list(matriz.keys()), EIXOS_CANONICOS)
            for chave, valor in matriz.items():
                self.assertIsInstance(valor, int)
                self.assertNotIsInstance(valor, bool)
                self.assertGreaterEqual(valor, 0)
                self.assertLessEqual(valor, 3)
            soma = sum(matriz.values())
            # A soma existe apenas em tempo de build (orçamento de carimbos).
            # O manifesto guarda o vetor por eixo, nunca um total.
            for chave, valor in lote.items():
                if chave in CAMPOS_ORDINAIS or chave == "matriz":
                    continue
                self.assertNotEqual(
                    valor, soma,
                    "lote " + str(lote["id"]) + ": a soma dos dez eixos esta guardada em "
                    + str(chave),
                )
        # Universo de chaves fechado: nenhuma chave capaz de guardar um total.
        for caminho, chave in self._chaves(self.documento):
            if caminho.startswith("/meta/excluidos/"):
                # Vocabulario de motivos do gerador (dicionario de contagem).
                self.assertIn(chave, MOTIVOS_EXCLUSAO, "motivo inesperado em " + caminho)
            else:
                self.assertIn(
                    chave, CHAVES_CONHECIDAS,
                    "chave inesperada em " + caminho + ": o universo de chaves e fechado",
                )

    # --- 4. nenhum nível pendente -------------------------------------------

    def test_nenhum_lote_pendente_e_scout_571_presente_com_matriz_zero(self):
        lotes = self.documento["lotes"]
        ids = [lote["id"] for lote in lotes]

        # Codificadores pendentes nunca viram lote.
        for lote in lotes:
            self.assertNotIn(
                lote["codificacao"]["coded_by"], CODERS_PENDENTES,
                "lote " + str(lote["id"]) + " vem de codificação pendente",
            )

        # Base textual e codificação tentativa nunca viram lote.
        for lote in lotes:
            notas = lote["codificacao"]["notas"].lower()
            for marca in NOTAS_TEXTUAL + NOTAS_TENTATIVAS:
                self.assertNotIn(
                    marca, notas,
                    "lote " + str(lote["id"]) + " tem nota " + repr(marca),
                )

        # BE-004 não é elegível.
        self.assertNotIn("BE-004", ids)

        # Nuance: matriz toda-zero NÃO é motivo de exclusão — 0 é observação
        # válida de ausência. O que separa "ausência observada" de "não
        # codificado" é o codificador. SCOUT-571 (plinto vazio) é legítimo.
        scout = [lote for lote in lotes if lote["id"] == "SCOUT-571"]
        self.assertEqual(len(scout), 1, "SCOUT-571 deve estar presente")
        self.assertEqual(set(scout[0]["matriz"].values()), {0})
        self.assertNotIn(scout[0]["codificacao"]["coded_by"], CODERS_PENDENTES)

        # Nenhum lote com matriz toda-zero vem de codificador pendente.
        for lote in lotes:
            if set(lote["matriz"].values()) == {0}:
                self.assertNotIn(
                    lote["codificacao"]["coded_by"], CODERS_PENDENTES,
                    "lote " + str(lote["id"]) + ": matriz toda-zero de codificação pendente",
                )

        # As linhas pendentes existem no ledger fixado e ficaram de fora.
        pendentes = {
            str(linha.get("id"))
            for linha in self._ledger_slice()
            if str(linha.get("coded_by") or "") in CODERS_PENDENTES
        }
        self.assertTrue(pendentes, "o ledger fixado deve conter linhas pendentes")
        self.assertEqual(pendentes & set(ids), set())

    # --- 5. conjunto de níveis ---------------------------------------------

    def test_conjunto_de_lotes(self):
        lotes = self.documento["lotes"]
        self.assertEqual(len(lotes), 24)
        self.assertEqual(self.documento["meta"]["total_lotes"], 24)

        por_etapa = Counter(lote["etapa"] for lote in lotes)
        self.assertEqual(
            por_etapa,
            Counter({"fundacional": 10, "normativo": 9, "militar": 1, "contra-alegoria": 4}),
        )

        # Núcleo analítico: Brasil 1822-1922 nas etapas I-II.
        nucleo = [lote for lote in lotes if lote["etapa"] in ("fundacional", "normativo")]
        self.assertEqual(len(nucleo), 19)
        for lote in nucleo:
            self.assertEqual(lote["pais"], "Brasil")
            self.assertIsNotNone(lote["year"])
            self.assertGreaterEqual(lote["year"], 1822)
            self.assertLessEqual(lote["year"], 1922)
            self.assertEqual(lote["escopo"], "nucleo")

        # Etapas III-IV: listas de autorização explícita.
        self.assertEqual(
            [lote["id"] for lote in lotes if lote["etapa"] == "militar"], ETAPA_MILITAR
        )
        self.assertEqual(
            [lote["id"] for lote in lotes if lote["etapa"] == "contra-alegoria"], ETAPA_CONTRA
        )

        # Toda imagem aponta para um arquivo existente em disco.
        for lote in lotes:
            caminho = ROOT / "site" / lote["image"]
            self.assertTrue(
                caminho.is_file(),
                "imagem ausente: " + str(caminho),
            )

        # Toda citação é obrigatória e não vazia.
        for lote in lotes:
            self.assertTrue(lote["citacao"].strip(), "citação vazia em " + str(lote["id"]))

        # Matriz: exatamente os dez eixos canônicos, na ordem canônica.
        for lote in lotes:
            self.assertEqual(list(lote["matriz"].keys()), EIXOS_CANONICOS)
        self.assertEqual(
            [eixo["chave"] for eixo in self.documento["eixos"]], EIXOS_CANONICOS
        )

    def test_nota_escopo_presente_apenas_fora_do_nucleo(self):
        """A nota de escopo explica por que o lote entra fora do recorte."""
        for lote in self.documento["lotes"]:
            if lote["escopo"] == "nucleo":
                self.assertNotIn(
                    "nota_escopo", lote,
                    "lote do nucleo nao traz nota de escopo: " + str(lote["id"]),
                )
            else:
                self.assertIn(
                    "nota_escopo", lote,
                    "lote fora do nucleo deve trazer nota de escopo: " + str(lote["id"]),
                )
                self.assertTrue(
                    str(lote["nota_escopo"]).strip(),
                    "nota de escopo vazia em " + str(lote["id"]),
                )

        # BR-009: a nota do icone precisa citar as duas datas — 1961 (a
        # escultura) e 8 de janeiro de 2023 (o ataque).
        icone = [lote for lote in self.documento["lotes"] if lote["id"] == "BR-009"]
        self.assertEqual(len(icone), 1)
        self.assertEqual(icone[0]["escopo"], "icone")
        nota_icone = icone[0]["nota_escopo"]
        self.assertIn("1961", nota_icone)
        self.assertIn("8 de janeiro de 2023", nota_icone)

        # Cada nota de comparador nomeia o proprio pais e o proprio ano do lote.
        comparadores = [
            lote for lote in self.documento["lotes"] if lote["escopo"] == "comparador"
        ]
        self.assertEqual(len(comparadores), 4)
        for lote in comparadores:
            nota = lote["nota_escopo"]
            self.assertIn(
                lote["pais"], nota,
                "a nota de " + str(lote["id"]) + " nao nomeia o proprio pais",
            )
            self.assertIn(
                str(lote["year"]), nota,
                "a nota de " + str(lote["id"]) + " nao nomeia o proprio ano",
            )

    # --- 6. concordância entre ledgers (re-verificada) ----------------------

    def test_concordancia_entre_ledgers_reverificada(self):
        """Regra 7 do gerador, re-derivada aqui, sem confiar no gerador."""
        acervo = self._acervo_slice()
        ledger = {
            str(linha.get("id")): linha for linha in self._ledger_slice()
        }
        records = self._records_slice()

        # Índice de títulos normalizado (mesma regra do gerador).
        indice = {}
        for item in acervo:
            indice.setdefault(norm_title(item.get("titulo")), []).append(str(item.get("id")))
        site_ids = {str(item.get("id")) for item in acervo}

        vetores_records = {}
        for record in records:
            item_id = str(record.get("item_id") or "")
            alvo = item_id if item_id in site_ids else None
            if alvo is None:
                dica = norm_title((record.get("input") or {}).get("title_hint"))
                candidatos = indice.get(dica) or []
                if len(candidatos) == 1:
                    alvo = candidatos[0]
            if alvo is None:
                continue
            purificacao = record.get("purificacao") or {}
            vetor = {chave: purificacao.get(chave) for chave in EIXOS_CANONICOS}
            if all(
                isinstance(valor, int) and not isinstance(valor, bool) and 0 <= valor <= 3
                for valor in vetor.values()
            ):
                vetores_records.setdefault(alvo, vetor)

        conferidos = 0
        for lote in self.documento["lotes"]:
            item_id = lote["id"]
            linha = ledger.get(item_id)
            self.assertIsNotNone(linha, "lote sem linha no ledger fixado: " + item_id)
            vetor_ledger = {chave: linha.get(chave) for chave in EIXOS_CANONICOS}
            self.assertEqual(
                vetor_ledger, lote["matriz"],
                "lote " + item_id + ": a matriz emitida diverge do ledger",
            )
            vetor_records = vetores_records.get(item_id)
            if vetor_records is None:
                # Sem registro correspondente, a regra 7 não tem contra o que
                # ser comparada; a concordância com o ledger já foi verificada.
                continue
            conferidos += 1
            self.assertEqual(
                vetor_records, vetor_ledger,
                "lote " + item_id + ": purification.jsonl e records.jsonl divergem",
            )

        # A verificação cruzada precisa ter de fato exercitado os ledgers.
        self.assertGreaterEqual(conferidos, 23)

    # --- 7. relatório de exclusões ------------------------------------------

    def test_relatorio_de_exclusoes_estavel(self):
        commitado = json.loads(COMMITADO.read_text(encoding="utf-8"))
        self.assertEqual(
            self.documento["meta"]["excluidos"], commitado["meta"]["excluidos"]
        )
        # Re-derivação independente a partir da fatia fixada.
        self.assertEqual(
            self.documento["meta"]["excluidos"], self._re_derivar_exclusoes()
        )

    def _re_derivar_exclusoes(self) -> dict:
        """Conta as exclusões do zero, sobre a fatia fixada."""
        acervo = {str(item.get("id")): item for item in self._acervo_slice()}
        linhas = {str(linha.get("id")): linha for linha in self._ledger_slice()}
        assets = ROOT / "site" / "assets" / "acervo"
        contagem = Counter()

        def classificar(item_id):
            linha = linhas.get(item_id)
            if linha is None:
                return "sem_linha_no_ledger"
            item = acervo.get(item_id) or {}
            if not item.get("tem_imagem"):
                return "sem_imagem"
            if not (assets / (item_id + ".webp")).is_file():
                return "imagem_ausente_em_disco"
            codificador = str(linha.get("coded_by") or "")
            notas = str(linha.get("notes") or "").lower()
            if codificador in CODERS_PENDENTES:
                return "codificacao_pendente"
            if any(marca in notas for marca in NOTAS_TEXTUAL):
                return "base_textual"
            if any(marca in notas for marca in NOTAS_TENTATIVAS):
                return "codificacao_tentativa"
            return None

        for item_id, item in acervo.items():
            if str(item.get("pais") or "") != "Brasil":
                continue
            ano = ano_de(item.get("data"))
            if ano is None or not (1822 <= ano <= 1922):
                continue
            motivo = classificar(item_id)
            if motivo:
                contagem[motivo] += 1

        for item_id in ETAPA_MILITAR + ETAPA_CONTRA:
            motivo = classificar(item_id)
            if motivo:
                contagem[motivo] += 1

        return dict(sorted(contagem.items()))


if __name__ == "__main__":
    unittest.main()
