"""Unit tests for the Curatorial & Editorial Steward CLI (scripts/steward.py)."""
from __future__ import annotations

import json
import pathlib
import tempfile
import unittest

from scripts import steward


class StewardTests(unittest.TestCase):
    def test_collect_status_reflects_catalogue_and_sync_gate(self) -> None:
        data = steward.collect_status()
        self.assertEqual(data["catalogue"]["total_items"], 337)
        self.assertEqual(data["catalogue"]["doctoral_strand_brazil_1822_1922"], 53)
        self.assertEqual(data["catalogue"]["brazil_total"], 73)
        self.assertIn("Fundacional", data["catalogue"]["regimes"])
        self.assertTrue(data["sync_gate"]["ok"])
        self.assertEqual(len(data["editorial"]["items"]["review"]), 8)

    def test_bilingual_parity_passes_on_live_site(self) -> None:
        report = steward.check_bilingual_parity()
        self.assertTrue(report["ok"], f"Unexpected parity issues: {report['issues']}")
        self.assertEqual(report["pair_count"], 7)

    def test_inspect_item_and_constellation(self) -> None:
        item_info = steward.inspect_target("BE-004")
        self.assertEqual(item_info["kind"], "item")
        self.assertEqual(item_info["layer_1_record"]["id"], "BE-004")
        self.assertEqual(item_info["layer_2_overlay"]["slug"], "constitution-belgique-1852")
        self.assertTrue(any("rights_approval" in b for b in item_info["readiness_blockers"]))

        const_info = steward.inspect_target("columbia-dois-chamados")
        self.assertEqual(const_info["kind"], "constellation")
        self.assertEqual(const_info["constellation"]["editorial_status"], "published")

        with self.assertRaises(ValueError):
            steward.inspect_target("NON-EXISTENT-ID-999")

    def test_draft_overlay_entry_dry_run_and_write_validation(self) -> None:
        entry = steward.draft_overlay_entry("BR-001", constellation="marmore-a-margem", write=False)
        self.assertEqual(entry["canonical_id"], "BR-001")
        self.assertEqual(entry["editorial_status"], "review")
        self.assertEqual(entry["public_analysis"]["status"], "draft")
        self.assertEqual(entry["constellations"], ["marmore-a-margem"])
        self.assertEqual(len(entry["image"]["sha256"]), 64)

        with self.assertRaises(ValueError):
            steward.draft_overlay_entry("BE-004", write=False)

        with tempfile.TemporaryDirectory() as tmp:
            tmp_pub = pathlib.Path(tmp) / "publication.json"
            tmp_pub.write_text(steward.PUBLICATION_PATH.read_text(encoding="utf-8"), encoding="utf-8")
            written = steward.draft_overlay_entry(
                "BR-002",
                slug="proclamacao-da-republica-1893",
                publication_path=tmp_pub,
                write=True,
            )
            self.assertEqual(written["slug"], "proclamacao-da-republica-1893")
            reloaded = json.loads(tmp_pub.read_text(encoding="utf-8"))
            self.assertTrue(any(it.get("canonical_id") == "BR-002" for it in reloaded["items"]))


if __name__ == "__main__":
    unittest.main()
