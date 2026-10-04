"""Production semantics survive approved additions and their withdrawal."""
import copy
import json
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts import build_data
from scripts.publication_stats import build_publication_stats


ROOT = Path(__file__).resolve().parents[1]


class PublicationStatsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.raw = json.loads((ROOT / "site/data/corpus-data-enriched.json").read_text(encoding="utf-8"))
        cls.baseline = json.loads((ROOT / "site/data/acervo.json").read_text(encoding="utf-8"))
        cls.stats = json.loads((ROOT / "site/data/stats.json").read_text(encoding="utf-8"))

    def test_337_rebuild_matches_every_production_aggregate(self):
        self.assertEqual(len(self.baseline), self.stats["total"])
        result = build_publication_stats(self.baseline, self.baseline, baseline_records=self.raw)
        self.assertEqual(result, self.stats)

    def test_approved_addition_changes_only_relevant_aggregates(self):
        source = {"id": "approved-new", "country": "France (held in Austria)",
                  "regime": "FUNDACIONAL", "date": "c. 1220 / 2025",
                  "motif": [" Justitia ", "descricao_mãos", "figura feminina",
                            "alegoria feminina", "ALLÉGORIE FÉMININE", "", None]}
        items = self.baseline + [{"id": source["id"], "tem_imagem": True}]
        original = copy.deepcopy((self.baseline, self.raw, source, self.stats))
        result = build_publication_stats(items, self.baseline, self.stats,
                                         baseline_records=self.raw, added_records=[source])
        expected = copy.deepcopy(self.stats)
        expected.update(total=self.stats["total"] + 1, com_imagem=self.stats["com_imagem"] + 1,
                        periodo={"min": 1220, "max": 2025})
        expected["por_pais"][0]["n"] += 1
        expected["por_regime"][0]["n"] += 1
        expected["motivos"][0]["n"] += 1
        self.assertEqual(result, expected)
        self.assertEqual((self.baseline, self.raw, source, self.stats), original)

    def test_raw_order_and_regime_case_survive_catalogue_sorting(self):
        raw = [{"id": "fr", "country": "France", "regime": "NORMATIVO", "motif": ["Justice"]},
               {"id": "br", "country": "Brazil", "regime": "FUNDACIONAL", "motif": ["Republica"]}]
        baseline = [{"id": "br", "pais": "Brasil", "regime": "Fundacional", "tem_imagem": False},
                    {"id": "fr", "pais": "França", "regime": "Normativo", "tem_imagem": False}]
        result = build_publication_stats(baseline, baseline, baseline_records=raw)
        self.assertEqual(result["por_pais"], [{"pais": "França", "n": 1}, {"pais": "Brasil", "n": 1}])
        self.assertEqual([row["chave"] for row in result["por_regime"]], ["NORMATIVO", "FUNDACIONAL"])
        self.assertEqual([row["motivo"] for row in result["motivos"]], ["Justice", "Republica"])

    def test_image_supplement_preserves_other_stats_and_withdrawal_restores_baseline(self):
        baseline = [{"id": "known", "tem_imagem": False}]
        stats = {"total": 1, "paises": 1, "com_imagem": 0,
                 "periodo": {"min": 1239, "max": 2021}, "meta": {"custom": "preserved"}}
        result = build_publication_stats([{"id": "known", "tem_imagem": True}], baseline, stats)
        self.assertEqual(result, {**stats, "com_imagem": 1})
        self.assertEqual(build_publication_stats(baseline, baseline, stats), stats)
        self.assertIsNot(result["meta"], stats["meta"])

    def test_addition_withdrawal_and_unpublished_sources_do_not_accumulate(self):
        source = {"id": "new", "country": "Brazil", "regime": "NORMATIVO", "date": "2025"}
        unpublished = {"id": "private", "country": "Never public", "regime": "PRIVATE", "date": "1100"}
        added = {source["id"]: source, unpublished["id"]: unpublished}
        result = build_publication_stats(self.baseline + [{"id": "new", "tem_imagem": True}],
                                         self.baseline, self.stats, baseline_records=self.raw,
                                         added_records=added)
        self.assertEqual(result["total"], self.stats["total"] + 1)
        self.assertEqual(result["paises"], self.stats["paises"])
        self.assertEqual(result["periodo"]["min"], self.stats["periodo"]["min"])
        self.assertEqual(build_publication_stats(self.baseline, self.baseline, self.stats,
                                                 baseline_records=self.raw, added_records=added), self.stats)

    def test_addition_and_image_supplement_preserve_metadata_together(self):
        items = copy.deepcopy(self.baseline)
        next(item for item in items if not item["tem_imagem"])["tem_imagem"] = True
        items.append({"id": "new", "tem_imagem": True})
        source = {"id": "new", "country": "France", "regime": "FUNDACIONAL", "date": "1900"}
        stats = {**self.stats, "meta": {"source": "fixed baseline", "generated_at": "controlled"}}
        result = build_publication_stats(items, self.baseline, stats,
                                         baseline_records=self.raw, added_records=[source])
        self.assertEqual(result["com_imagem"], self.stats["com_imagem"] + 2)
        self.assertEqual(result["meta"], stats["meta"])
        self.assertIsNot(result["meta"], stats["meta"])
        self.assertEqual(result["motivos"], self.stats["motivos"])
        self.assertEqual(result["periodo"], self.stats["periodo"])

    def test_new_ties_follow_projection_order_not_source_map_order(self):
        sources = {"second": {"id": "second", "country": "Brazil", "regime": "NORMATIVO",
                              "motif": ["Republica"]},
                   "first": {"id": "first", "country": "France", "regime": "FUNDACIONAL",
                             "motif": ["Justice"]}}
        items = [{"id": "first", "tem_imagem": True}, {"id": "second", "tem_imagem": True}]
        result = build_publication_stats(items, [], added_records=sources)
        self.assertEqual([row["pais"] for row in result["por_pais"]], ["França", "Brasil"])
        self.assertEqual([row["chave"] for row in result["por_regime"]], ["FUNDACIONAL", "NORMATIVO"])
        self.assertEqual([row["motivo"] for row in result["motivos"]], ["Justice", "Republica"])

    def test_additional_mapping_identity_cannot_silently_diverge(self):
        with self.assertRaisesRegex(ValueError, "ID divergente"):
            build_publication_stats([{"id": "canonical", "tem_imagem": True}], [],
                                    added_records={"canonical": {"id": "wrong", "country": "France"}})

    def test_additions_require_original_baseline_and_complete_sources(self):
        items = self.baseline + [{"id": "new", "tem_imagem": True}]
        with self.assertRaisesRegex(ValueError, "baseline_records"):
            build_publication_stats(items, self.baseline, self.stats,
                                    added_records=[{"id": "new", "country": "France"}])
        with self.assertRaisesRegex(ValueError, "new"):
            build_publication_stats(items, self.baseline, self.stats, baseline_records=self.raw)
        with self.assertRaisesRegex(ValueError, "base"):
            build_publication_stats(items, self.baseline, self.stats, baseline_records=self.raw[:-1],
                                    added_records=[{"id": "new", "country": "France"}])

    def test_missing_baseline_and_duplicate_ids_fail_closed(self):
        with self.assertRaisesRegex(ValueError, "base"):
            build_publication_stats(self.baseline[:-1], self.baseline, self.stats)
        with self.assertRaisesRegex(ValueError, "duplicad"):
            build_publication_stats(self.baseline + self.baseline[:1], self.baseline, self.stats)
        with self.assertRaisesRegex(ValueError, "duplicad"):
            build_publication_stats(self.baseline, self.baseline,
                                    baseline_records=self.raw + self.raw[:1])

    def test_image_availability_uses_projection_without_filesystem_probe(self):
        raw = [{"id": "known", "country": "France", "regime": "FUNDACIONAL",
                "thumbnail_url": "https://archive.test/previous.jpg"}]
        baseline = [{"id": "known", "tem_imagem": False}]
        with patch.object(build_data, "ACERVO_DIR", Path("/this-must-not-be-probed")), \
             patch.object(Path, "is_file", side_effect=AssertionError("unexpected image probe")):
            result = build_publication_stats(baseline, baseline, baseline_records=raw)
        self.assertEqual(result["com_imagem"], 0)


if __name__ == "__main__":
    unittest.main()
