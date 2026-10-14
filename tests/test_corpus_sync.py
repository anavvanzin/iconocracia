import json
import tempfile
import unittest
from pathlib import Path

from scripts.corpus_sync import build_stats, transform_item, validate_records
from scripts.build_data import build_stats as build_editorial_stats


class CorpusSyncTests(unittest.TestCase):
    def test_period_includes_early_and_late_years_and_both_interval_ends(self):
        cases = [
            ("1239–1240", {"min": 1239, "max": 1240}),
            ("1537", {"min": 1537, "max": 1537}),
            ("1958-2001", {"min": 1958, "max": 2001}),
            ("2014-01-01", {"min": 2014, "max": 2014}),
            ("c. 2021", {"min": 2021, "max": 2021}),
            ("séculos XVI–XVIII", {"min": None, "max": None}),
            ("12345", {"min": None, "max": None}),
            (None, {"min": None, "max": None}),
        ]
        for date, expected in cases:
            with self.subTest(date=date):
                source = {"id": "a", "country": "Brazil", "date": date}
                self.assertEqual(build_editorial_stats([source])["periodo"], expected)
                item = transform_item(source)
                self.assertEqual(build_stats([item], 1, "test")["periodo"], expected)

    def test_transform_prefers_local_image_and_keeps_analysis(self):
        item = {
            "id": "uuid-1", "title": "Justice", "country": "France",
            "date": "1900", "regime": "normativo", "motif": ["female allegory", "Balança"],
            "local_image_path": "assets/justice.webp", "thumbnail_url": "https://example.test/image",
            "endurecimento_score": 0.5, "indicadores": {"rigidez_postural": 2},
            "iconographic_metadata": {"visual_regime": "normativo", "endurecimento_score": 0.5}
        }
        result = transform_item(item)
        self.assertEqual(result["pais"], "França")
        self.assertEqual(result["imagem"], "assets/justice.webp")
        self.assertEqual(result["motivos"], ["Balança"])
        # escore composto aposentado: nunca propagado (metodologia = inventário verbal de atributos)
        self.assertNotIn("endurecimento_score", result)
        self.assertNotIn("indicadores", result)
        self.assertEqual(result["iconographic_metadata"], {"visual_regime": "normativo"})

    def test_validation_rejects_duplicate_ids(self):
        records = [{"id": "same", "title": "A", "country": "Brazil", "date": "1900", "regime": "militar"},
                   {"id": "same", "title": "B", "country": "Brazil", "date": "1901", "regime": "militar"}]
        with self.assertRaisesRegex(ValueError, "ID duplicado"):
            validate_records(records, Path("/does/not/exist"))

    def test_stats_count_published_items_only(self):
        items = [transform_item({
            "id": "a", "title": "A", "country": "Brazil", "date": "1900",
            "regime": "militar", "motif": ["Espada"]
        })]
        stats = build_stats(items, 2, "test")
        self.assertEqual(stats["total"], 1)
        self.assertEqual(stats["meta"]["source_count"], 2)


if __name__ == "__main__":
    unittest.main()
