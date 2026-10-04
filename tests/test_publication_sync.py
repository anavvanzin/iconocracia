"""Fail-closed regressions for the selectively recovered PR 33 pipeline."""
import copy
import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts import publication_sync as sync


class PublicationSecurityTests(unittest.TestCase):
    def record(self, item_id="canonical"):
        return {
            "id": item_id, "title": "Justice", "country": "France", "date": "1900",
            "url": "https://archive.test/item/1", "regime": "normativo",
            "iconographic_metadata": {"visual_regime": "normativo", "endurecimento_score": 3},
        }

    def entry(self, item_id="canonical"):
        return {
            "canonical_id": item_id, "editorial_status": "published",
            "approved_by": "ana", "approved_at": "2026-09-15",
            "rights_approval": {"status": "approved", "approved_by": "ana",
                                "approved_at": "2026-09-15", "evidence_url": "https://archive.test/rights"},
            "image": {"path": "assets/justice.webp", "sha256": hashlib.sha256(b"approved image").hexdigest(),
                      "source_url": "https://archive.test/image.jpg",
                      "catalog_url": "https://archive.test/item/1", "license": "Public domain",
                      "credit": "Archive", "alt": "Justice holding scales"},
        }

    def manifest(self, entries=None):
        return {
            "schema_version": "2.0", "corpus_repository": "anavvanzin/iconocracy-corpus",
            "corpus_commit": "a" * 40, "generated_at": "2026-09-15",
            "items": entries or [], "constellations": [],
        }

    def test_01_unapproved_analysis_never_reaches_public_json(self):
        entry = self.entry()
        entry["public_analysis"] = {"status": "draft", "summary": "PRIVATE DRAFT",
                                    "indicators": {"rigidity": 3}}
        result = sync.transform_item(self.record(), entry)
        self.assertIsNone(result.get("analise_publica"))

    def test_02_iconographic_metadata_survives_without_retired_score(self):
        result = sync.transform_item(self.record())
        self.assertEqual(result.get("iconographic_metadata"), {"visual_regime": "normativo"})

    def test_03_grandfathered_boolean_cannot_publish_unknown_record(self):
        entry = {"canonical_id": "unknown", "legacy_record_id": "unknown",
                 "editorial_status": "published", "grandfathered": True}
        with self.assertRaises(ValueError):
            sync.generate([], self.manifest([entry]), [{"id": "unknown", "title": "Unknown"}])

    def test_04_constellation_is_indivisible(self):
        definition = {"slug": "complete", "editorial_status": "published",
                      "approved_by": "ana", "approved_at": "2026-09-15", "item_ids": ["a", "missing"]}
        with self.assertRaises(ValueError):
            sync.build_constellations([definition], [{"id": "a"}])

    def test_05_public_review_preview_is_rejected(self):
        definition = {"slug": "private", "editorial_status": "withheld", "item_ids": ["a"]}
        with self.assertRaises(ValueError):
            sync.build_constellations([definition], [{"id": "a"}], include_review=True)

    def test_06_resolved_canonical_id_replaces_stale_editorial_id(self):
        entry = self.entry("stale")
        entry["source_url"] = "https://archive.test/item/1"
        with tempfile.TemporaryDirectory() as tmp:
            site = Path(tmp)
            (site / "assets").mkdir()
            (site / "assets/justice.webp").write_bytes(b"approved image")
            items, _, _ = sync.generate([self.record()], self.manifest([entry]), [], site_root=site)
        self.assertEqual(items[0]["id"], "canonical")

    def test_07_local_image_cannot_escape_site(self):
        entry = self.entry()
        entry["image"]["path"] = "../../private.webp"
        with self.assertRaises(ValueError):
            sync.validate_publication(self.manifest([entry]))

    def test_review_and_withheld_keep_existing_catalogue_and_stats_bytes(self):
        baseline = [sync.transform_item(self.record())]
        stats = {"total": 1, "paises": 1, "com_imagem": 0, "periodo": {"min": 1900, "max": 1900}}
        original = copy.deepcopy(baseline)
        for status in ("review", "withheld"):
            with self.subTest(status=status), tempfile.TemporaryDirectory() as tmp:
                entry = {"canonical_id": "canonical", "editorial_status": status,
                         "public_analysis": {"status": "draft", "summary": "NEVER PUBLIC"},
                         "legacy_ids": ["PRIVATE-ALIAS"]}
                publication = self.manifest([entry])
                publication["constellations"] = [{"slug": "private", "editorial_status": status,
                                                  "item_ids": ["canonical"], "introduction": "NEVER PUBLIC"}]
                items, result_stats, definitions = sync.generate([], publication, baseline, baseline_stats=stats)
                self.assertEqual(items, original)
                self.assertEqual(result_stats, stats)
                out = Path(tmp)
                acervo_bytes, stats_bytes = b"[  current catalogue ]", b"{ current stats }"
                (out / "acervo.json").write_bytes(acervo_bytes)
                (out / "stats.json").write_bytes(stats_bytes)
                sync.write_outputs(out, items, result_stats, definitions, baseline=baseline)
                self.assertEqual((out / "acervo.json").read_bytes(), acervo_bytes)
                self.assertEqual((out / "stats.json").read_bytes(), stats_bytes)
                self.assertEqual(json.loads((out / "publication-overlay.json").read_text()), {"version": 1, "items": []})
                self.assertEqual(json.loads((out / "constellations.json").read_text()), [])
        self.assertEqual(baseline, original)

    def test_absolute_parent_windows_and_symlink_images_are_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            site = Path(tmp) / "site"
            site.mkdir()
            outside = Path(tmp) / "private.webp"
            outside.write_bytes(b"private")
            (site / "linked.webp").symlink_to(outside)
            for path in (str(outside), "../private.webp", "assets/../private.webp", "C:\\private.webp",
                         "https://archive.test/image.webp", "linked.webp", "./private.webp",
                         "assets/%2e%2e/private.webp", "assets/image?private.webp", "assets/image#private.webp"):
                with self.subTest(path=path), self.assertRaises(ValueError):
                    sync.confined_image(path, site)

    def test_item_approval_does_not_approve_analysis_or_rights(self):
        with tempfile.TemporaryDirectory() as tmp:
            site = Path(tmp)
            (site / "assets").mkdir()
            (site / "assets/justice.webp").write_bytes(b"approved image")
            for change in ("rights", "analysis", "author"):
                entry = self.entry()
                if change == "rights":
                    del entry["rights_approval"]
                elif change == "analysis":
                    entry["public_analysis"] = {"status": "approved", "summary": "Unapproved author"}
                else:
                    entry["approved_by"] = "assistant"
                with self.subTest(change=change), self.assertRaises(ValueError):
                    sync.generate([self.record()], self.manifest([entry]), [], site_root=site)

    def test_approved_analysis_and_metadata_have_recursive_allowlist(self):
        source = self.record()
        source["iconographic_metadata"]["nested"] = {"purificacao_composto": 0.75, "visual_regime": "normativo"}
        source["iconographic_metadata"]["purification_indicators"] = {"rigidity": 3}
        entry = self.entry()
        entry["public_analysis"] = {
            "status": "approved", "approved_by": "ana", "approved_at": "2026-09-15",
            "summary": "Approved reading", "private_note": "PRIVATE", "indicators": {"rigidity": 3},
            "panofsky": {"level_1": "Visible scales", "private_note": "PRIVATE", "purificacao_composto": 1},
        }
        item = sync.transform_item(source, entry)
        self.assertEqual(item["analise_publica"], {"status": "approved", "summary": "Approved reading",
                                                  "panofsky": {"level_1": "Visible scales"}})
        self.assertEqual(item["iconographic_metadata"]["nested"], {"visual_regime": "normativo"})
        self.assertNotIn("purification_indicators", item["iconographic_metadata"])

    def test_published_constellation_preserves_order_and_resolves_aliases(self):
        definition = {"slug": "approved", "title": "A reading", "editorial_status": "published",
                      "approved_by": "ana", "approved_at": "2026-09-15", "item_ids": ["legacy-b", "a"],
                      "private_notes": "PRIVATE"}
        result = sync.build_constellations([definition], [{"id": "a"}, {"id": "b"}], aliases={"legacy-b": "b"})
        self.assertEqual(result[0]["item_ids"], ["b", "a"])
        self.assertNotIn("private_notes", result[0])
        self.assertNotIn("approved_by", result[0])
        for members in ([], ["a", "a"], ["a", "legacy-a"]):
            definition["item_ids"] = members
            with self.subTest(members=members), self.assertRaises(ValueError):
                sync.build_constellations([definition], [{"id": "a"}], aliases={"legacy-a": "a"})

    def test_published_constellation_cannot_use_pending_baseline_member(self):
        baseline = [sync.transform_item(self.record())]
        publication = self.manifest([{"canonical_id": "canonical", "editorial_status": "review"}])
        publication["constellations"] = [{"slug": "approved", "title": "A reading", "editorial_status": "published",
                                           "approved_by": "ana", "approved_at": "2026-09-15", "item_ids": ["canonical"]}]
        with self.assertRaises(ValueError):
            sync.generate([], publication, baseline)

    def test_baseline_supplement_does_not_replace_existing_metadata(self):
        baseline = sync.transform_item(self.record())
        baseline["iconographic_metadata"] = {"curated": "KEEP THIS", "visual_regime": "normativo"}
        original = copy.deepcopy(baseline)
        source = self.record()
        source["title"] = "Older corpus title"
        with tempfile.TemporaryDirectory() as tmp:
            site = Path(tmp)
            (site / "assets").mkdir()
            (site / "assets/justice.webp").write_bytes(b"approved image")
            items, _, _ = sync.generate([source], self.manifest([self.entry()]), [baseline], site_root=site,
                                         baseline_records=[self.record()])
        self.assertEqual(items[0]["iconographic_metadata"], original["iconographic_metadata"])
        self.assertEqual(items[0]["titulo"], original["titulo"])
        self.assertEqual(baseline, original)

    def test_new_additions_are_deterministic_and_retain_baseline_order(self):
        old_source = self.record("existing")
        old_source["url"] = "https://archive.test/existing"
        baseline = [sync.transform_item(old_source)]
        with tempfile.TemporaryDirectory() as tmp:
            site = Path(tmp)
            (site / "assets").mkdir()
            (site / "assets/justice.webp").write_bytes(b"approved image")
            publication = self.manifest([self.entry()])
            first = sync.generate([self.record()], publication, baseline, site_root=site, baseline_records=[old_source])
            second = sync.generate([self.record()], publication, baseline, site_root=site, baseline_records=[old_source])
            self.assertEqual(first, second)
            self.assertEqual(first[0][0], baseline[0])
            self.assertEqual([item["id"] for item in first[0]], ["existing", "canonical"])
            self.assertEqual(first[1]["meta"]["generated_at"], publication["generated_at"])

    def test_local_corpus_requires_matching_content_hash_when_publishing(self):
        with tempfile.TemporaryDirectory() as tmp:
            corpus = Path(tmp) / "corpus.json"
            corpus.write_text(json.dumps([self.record()]))
            publication = self.manifest([self.entry()])
            for expected in (None, "b" * 64):
                publication["corpus_sha256"] = expected
                with self.subTest(expected=expected), self.assertRaises(ValueError):
                    sync.load_corpus(corpus, publication, needed=True)
            publication["corpus_sha256"] = hashlib.sha256(corpus.read_bytes()).hexdigest()
            self.assertEqual(sync.load_corpus(corpus, publication, needed=True), [self.record()])

    def test_baseline_is_pinned_to_actual_git_commit_and_hashes(self):
        publication = sync.load_json(sync.DEFAULT_PUBLICATION)
        sync.validate_baseline(publication)
        publication["baseline"]["commit"] = "0" * 40
        with self.assertRaises(ValueError):
            sync.validate_baseline(publication)

    def test_cli_rejects_public_preview_and_private_manifest_inside_site(self):
        for flags in (["--include-review"], ["--publication", "site/data/private.json"]):
            result = subprocess.run([sys.executable, "scripts/publication_sync.py", *flags],
                                    cwd=sync.ROOT, text=True, capture_output=True)
            with self.subTest(flags=flags):
                self.assertEqual(result.returncode, 1)
                self.assertIn("[publication_sync] erro:", result.stderr)

    def test_review_url_ambiguity_and_canonical_source_conflict_fail_closed(self):
        baseline = [{"id": "a", "fonte_url": "https://archive.test/shared"},
                    {"id": "b", "fonte_url": "https://archive.test/shared"}]
        private = {"canonical_id": "stale", "source_url": "https://archive.test/shared", "editorial_status": "review"}
        with self.assertRaises(sync.AmbiguousResolution):
            sync.generate([], self.manifest([private]), baseline, baseline_stats={})
        records = [{"id": "a", "url": "https://archive.test/a"}, {"id": "b", "url": "https://archive.test/b"}]
        with self.assertRaises(sync.AmbiguousResolution):
            sync.resolve_entry({"canonical_id": "a", "source_url": "https://archive.test/b"}, records, [])

    def test_contradictory_public_and_private_aliases_fail_closed(self):
        with tempfile.TemporaryDirectory() as tmp:
            site = Path(tmp)
            (site / "assets").mkdir()
            (site / "assets/justice.webp").write_bytes(b"approved image")
            private = {"canonical_id": "stale", "source_url": "https://archive.test/item/1", "editorial_status": "withheld"}
            with self.assertRaisesRegex(ValueError, "contraditórios"):
                sync.generate([self.record()], self.manifest([self.entry(), private]), [], site_root=site)

    def test_image_hash_binds_approval_to_exact_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            site = Path(tmp)
            (site / "assets").mkdir()
            (site / "assets/justice.webp").write_bytes(b"different image or placeholder")
            with self.assertRaisesRegex(ValueError, "sha256"):
                sync.generate([self.record()], self.manifest([self.entry()]), [], site_root=site)

    def test_source_urls_cannot_export_userinfo_or_ambiguous_paths(self):
        for value in ("https://user:private@archive.test/image.webp", "https://archive.test\\image.webp",
                      "https://archive.test/image file.webp", "https://archive.test:invalid/image.webp"):
            with self.subTest(value=value):
                self.assertFalse(sync._http_url(value))

    def test_canonical_source_fallback_does_not_export_credentials(self):
        source = self.record()
        source["url"] = "https://user:private@archive.test/catalog"
        entry = self.entry()
        del entry["image"]["catalog_url"]
        with tempfile.TemporaryDirectory() as tmp:
            site = Path(tmp)
            (site / "assets").mkdir()
            (site / "assets/justice.webp").write_bytes(b"approved image")
            items, _, _ = sync.generate([source], self.manifest([entry]), [], site_root=site)
        self.assertEqual(items[0]["fonte_url"], "")
        self.assertNotIn("user:private", json.dumps(items))

    def test_approved_image_supplement_updates_stats_without_rewriting_catalogue(self):
        baseline = [sync.transform_item(self.record())]
        baseline_stats = {"total": 1, "com_imagem": 0, "periodo": {"min": 1239, "max": 2021},
                          "meta": {"KEEP": "unchanged"}}
        with tempfile.TemporaryDirectory() as tmp:
            site = Path(tmp)
            (site / "assets").mkdir()
            (site / "assets/justice.webp").write_bytes(b"approved image")
            out = site / "data"
            out.mkdir()
            raw = {"acervo.json": json.dumps(baseline).encode(), "stats.json": json.dumps(baseline_stats).encode()}
            for name, data in raw.items():
                (out / name).write_bytes(data)
            items, stats, definitions = sync.generate([self.record()], self.manifest([self.entry()]), baseline,
                                                       baseline_stats=baseline_stats, site_root=site)
            self.assertEqual(stats, {**baseline_stats, "com_imagem": 1})
            with patch.object(sync, "DEFAULT_BASELINE", out / "acervo.json"), patch.object(sync, "DEFAULT_STATS", out / "stats.json"):
                sync.validate_live_outputs(raw, items, stats)
                sync.write_outputs(out, items, stats, definitions, baseline=baseline, baseline_stats=baseline_stats)
                sync.validate_live_outputs(raw, items, stats)
            self.assertEqual((out / "acervo.json").read_bytes(), raw["acervo.json"])
            self.assertEqual(json.loads((out / "stats.json").read_bytes()), stats)

    def test_real_cli_new_record_is_idempotent_and_preserves_user_changes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            # A local no-checkout clone provides the real immutable baseline
            # objects without creating commits or changing the shared repository.
            subprocess.run(["git", "clone", "--shared", "--no-checkout", str(sync.ROOT), str(root)],
                           text=True, capture_output=True, check=True)
            for folder in ("scripts", "schemas", "site/data", "site/assets", "editorial"):
                (root / folder).mkdir(parents=True, exist_ok=True)
            for filename in ("publication_sync.py", "corpus_sync.py", "publication_stats.py", "build_data.py"):
                shutil.copyfile(sync.ROOT / "scripts" / filename, root / "scripts" / filename)
            for filename in ("publication.schema.json", "corpus-input.schema.json"):
                shutil.copyfile(sync.ROOT / "schemas" / filename, root / "schemas" / filename)
            current_manifest = sync.load_json(sync.DEFAULT_PUBLICATION)
            raw_baseline = sync.validate_baseline(current_manifest)
            baseline = json.loads(raw_baseline["acervo.json"])
            for name, data in raw_baseline.items():
                (root / "site/data" / name).write_bytes(data)
            publication = self.manifest([self.entry()])
            publication["baseline"] = current_manifest["baseline"]
            corpus = root / "corpus.json"
            corpus.write_text(json.dumps(json.loads(raw_baseline["corpus-data-enriched.json"]) + [self.record()]), encoding="utf-8")
            publication["corpus_sha256"] = hashlib.sha256(corpus.read_bytes()).hexdigest()
            (root / "site/assets/justice.webp").write_bytes(b"approved image")
            (root / "editorial/publication.json").write_text(json.dumps(publication), encoding="utf-8")
            command = [sys.executable, "scripts/publication_sync.py", "--corpus", "corpus.json"]
            first = subprocess.run(command, cwd=root, text=True, capture_output=True)
            self.assertEqual(first.returncode, 0, first.stderr)
            names = ("acervo.json", "stats.json", "publication-overlay.json", "constellations.json")
            first_bytes = {name: (root / "site/data" / name).read_bytes() for name in names}
            second = subprocess.run(command, cwd=root, text=True, capture_output=True)
            self.assertEqual(second.returncode, 0, second.stderr)
            self.assertEqual(first_bytes, {name: (root / "site/data" / name).read_bytes() for name in names})
            catalogue = json.loads(first_bytes["acervo.json"])
            self.assertEqual(catalogue[:-1], baseline)
            self.assertEqual(catalogue[-1]["id"], "canonical")
            overlay = json.loads(first_bytes["publication-overlay.json"])
            self.assertEqual(overlay["items"][0]["imagem"], "assets/justice.webp")
            (root / "site/data/acervo.json").write_bytes(b"[]")
            third = subprocess.run(command, cwd=root, text=True, capture_output=True)
            self.assertEqual(third.returncode, 1)
            self.assertIn("mudanças fora desta projeção", third.stderr)
            self.assertEqual((root / "site/data/acervo.json").read_bytes(), b"[]")


if __name__ == "__main__":
    unittest.main()
