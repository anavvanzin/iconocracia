"""Current theory must not erase, reassign or certify historical labels."""
import copy
import json
import unittest
from pathlib import Path

from scripts import acervo, build_data, corpus_sync
from scripts.publication_stats import build_publication_stats
from scripts.taxonomy import present_taxonomy

ROOT = Path(__file__).resolve().parents[1]
REGIMES = ["Fundacional", "Normativo", "Militar"]
# Identity snapshot reviewed on 2026-11-02, not a new classification rule.
LEGACY_IDS = {
    "BR-019", "e0399402-b59d-5050-9776-b67f2c69a6b2",
    "0970108c-1619-50f5-bc85-719eb5f80aee", "6932b9c2-9bb3-5b21-9040-36f6323401e3",
    "FR-022", "FR-031", "FR-032", "FR-033", "DE-015", "SCOUT-571",
    "7b5ea66e-0285-59ea-a652-264f8a5e90bd", "b1966d16-8731-58e4-a898-8ef3c44f59cb",
    "ce773ab1-3bfc-9f6e-754a-efe0c567916d", "US-019", "US-020",
}


class TaxonomyTests(unittest.TestCase):
    def assert_framework(self, stats):
        self.assertEqual(stats["taxonomia"]["regimes_interpretativos"], REGIMES)
        self.assertEqual(stats["taxonomia"]["contra_alegoria"]["estatuto"], "teste_critico")
        self.assertTrue(all(row["regime"].strip().casefold() in
                            {r.casefold() for r in REGIMES} for row in stats["por_regime"]))
        self.assertEqual(sum(row["n"] for row in stats["por_rotulo_catalogado"]), stats["total"])

    def test_public_counts_and_all_fifteen_legacy_identities_survive(self):
        raw = json.loads((ROOT / "site/data/corpus-data-enriched.json").read_text())
        items = json.loads((ROOT / "site/data/acervo.json").read_text())
        stats = json.loads((ROOT / "site/data/stats.json").read_text())
        self.assert_framework(stats)
        self.assertEqual(len(raw), len(items))
        self.assertEqual(stats["total"], 337)
        self.assertEqual(len({i["id"] for i in items}), 337)
        self.assertEqual(stats["recorte_tese_brasil_1822_1922"], 53)
        self.assertEqual({r["regime"]: r["n"] for r in stats["por_regime"]},
                         {"Fundacional": 164, "Normativo": 103, "Militar": 54})
        self.assertEqual({r["regime"]: r["n"] for r in stats["por_rotulo_catalogado"]},
                         {"Fundacional": 164, "Normativo": 103, "Militar": 54,
                          "Contra-alegoria": 15, "Não classificado": 1})
        for records in (raw, items):
            self.assertEqual({i["id"] for i in records
                              if i.get("regime", "").casefold() == "contra-alegoria"}, LEGACY_IDS)
        self.assertEqual({i["id"]: i.get("regime", "").casefold() for i in raw},
                         {i["id"]: i.get("regime", "").casefold() for i in items})

    def test_labels_unknowns_and_raw_case_are_preserved_without_reclassification(self):
        records = [{"id": str(n), "regime": label} for n, label in enumerate(
            ["FUNDACIONAL", "normativo", "MILITAR", "CONTRA-ALEGORIA", "contra-alegoria", "Novo rótulo", ""])]
        before = copy.deepcopy(records)
        stats = build_data.build_stats(records)
        self.assert_framework(stats)
        self.assertEqual([r["chave"] for r in stats["por_rotulo_catalogado"]],
                         [r["regime"] or "não classificado" for r in records])
        self.assertEqual(sum(r["n"] for r in stats["por_regime"]), 3)
        self.assertEqual(records, before)

    def test_empty_catalogue_still_describes_three_regimes_without_invented_counts(self):
        stats = build_data.build_stats([])
        self.assert_framework(stats)
        self.assertEqual(stats["por_regime"], [])
        self.assertEqual(stats["por_rotulo_catalogado"], [])

    def test_historical_aggregate_adapter_is_nonmutating_and_idempotent(self):
        historical = {"total": 3, "por_regime": [
            {"regime": "Normativo", "chave": "NORMATIVO", "n": 1},
            {"regime": "Contra-alegoria", "chave": "CONTRA-ALEGORIA", "n": 2}],
            "meta": {"source": "immutable"}}
        before = copy.deepcopy(historical)
        current = present_taxonomy(historical)
        self.assert_framework(current)
        self.assertEqual(current["por_rotulo_catalogado"], before["por_regime"])
        self.assertEqual(present_taxonomy(current), current)
        current["por_regime"][0]["n"] = 10
        self.assertEqual(current["por_rotulo_catalogado"][0]["n"], 1)
        self.assertEqual(historical, before)

    def test_every_producer_separates_theory_from_legacy_labels(self):
        raw = json.loads((ROOT / "site/data/corpus-data-enriched.json").read_text())
        before = copy.deepcopy(raw)
        for stats in (build_data.build_stats(raw), acervo.build(raw).stats,
                      corpus_sync.build_stats([corpus_sync.transform_item(i) for i in raw], len(raw), "test")):
            with self.subTest(producer=stats.get("meta", {})):
                self.assert_framework(stats)
                self.assertEqual(sum(r["n"] for r in stats["por_rotulo_catalogado"]
                                     if r["regime"] == "Contra-alegoria"), 15)
        self.assertEqual(raw, before)

    def test_pinned_legacy_baseline_addition_and_withdrawal_keep_current_framework(self):
        raw = [{"id": "old", "regime": "CONTRA-ALEGORIA"}]
        baseline = [{"id": "old", "tem_imagem": False}]
        historical = {"total": 1, "com_imagem": 0, "por_regime": [
            {"regime": "Contra-alegoria", "chave": "CONTRA-ALEGORIA", "n": 1}]}
        before = copy.deepcopy((raw, baseline, historical))
        current = build_publication_stats(baseline, baseline, historical, baseline_records=raw)
        self.assert_framework(current)
        self.assertEqual(current["por_regime"], [])
        # Image-only and no-change paths must not republish a fourth regime.
        image_only = build_publication_stats([{"id": "old", "tem_imagem": True}], baseline,
                                             historical, baseline_records=raw)
        self.assert_framework(image_only)
        self.assertEqual(image_only["com_imagem"], 1)
        addition = {"id": "new", "regime": "NORMATIVO"}
        added = build_publication_stats(baseline + [{"id": "new", "tem_imagem": False}],
                                       baseline, historical, baseline_records=raw, added_records=[addition])
        self.assert_framework(added)
        self.assertEqual(added["por_regime"], [{"regime": "Normativo", "chave": "NORMATIVO", "n": 1}])
        withdrawn = build_publication_stats(baseline, baseline, historical,
                                           baseline_records=raw, added_records=[addition])
        self.assertEqual(withdrawn, current)
        self.assertEqual((raw, baseline, historical), before)


if __name__ == "__main__":
    unittest.main()
