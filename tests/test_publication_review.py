"""Regressions for PR 69 review, including transitions across fresh processes."""
import copy
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from scripts import publication_sync as sync
from tests import test_publication_sync as fixtures


class PublicationReviewTests(unittest.TestCase):
    def setUp(self):
        self.helpers = fixtures.PublicationSecurityTests()

    def record(self, item_id):
        value = self.helpers.record(item_id)
        value["url"] = "https://archive.test/" + item_id
        return value

    def test_alias_cannot_take_another_new_canonical_id_in_either_order(self):
        with tempfile.TemporaryDirectory() as tmp:
            site = Path(tmp)
            (site / "assets").mkdir()
            (site / "assets/justice.webp").write_bytes(b"approved image")
            first, second = self.helpers.entry("A"), self.helpers.entry("B")
            first["legacy_ids"] = ["B"]
            for entries in ([first, second], [second, first]):
                with self.subTest(order=[entry["canonical_id"] for entry in entries]), self.assertRaises(ValueError):
                    sync.generate([self.record("A"), self.record("B")], self.helpers.manifest(entries), [], site_root=site)

    def test_url_identity_must_agree_across_corpus_and_baseline(self):
        records = [{"id": "A", "url": "https://archive.test/shared"}]
        for baseline in ([{"id": "B", "fonte_url": "https://archive.test/shared"}],
                         [{"id": "B", "fonte_url": "https://archive.test/shared"},
                          {"id": "C", "fonte_url": "https://archive.test/shared"}]):
            for canonical in ("A", "stale"):
                with self.subTest(canonical=canonical, baseline_ids=[item["id"] for item in baseline]), self.assertRaises(sync.AmbiguousResolution):
                    sync.resolve_entry({"canonical_id": canonical, "source_url": "https://archive.test/shared"}, records, baseline)

    def test_analysis_serialization_is_identical_across_hash_seeds(self):
        code = (
            'import json; from scripts.publication_sync import transform_item; '
            'analysis={"status":"approved","approved_by":"ana","approved_at":"2026-09-15",'
            '"summary":"s","panofsky":{"level_3":"three","level_1":"one"},'
            '"method_note":"m","limitation":"l","gender_attributed":"g"}; '
            'print(json.dumps(transform_item({"id":"a"},{"editorial_status":"published",'
            '"public_analysis":analysis})["analise_publica"]))'
        )
        outputs = []
        for seed in ("1", "2", "3"):
            process = subprocess.run([sys.executable, "-c", code], cwd=sync.ROOT, capture_output=True, check=True,
                                     env={**os.environ, "PYTHONHASHSEED": seed, "PYTHONDONTWRITEBYTECODE": "1"})
            outputs.append(process.stdout)
        self.assertEqual(len(set(outputs)), 1, outputs)

    def fixture(self, directory):
        root = Path(directory)
        subprocess.run(["git", "clone", "--shared", "--no-checkout", str(sync.ROOT), str(root)],
                       capture_output=True, check=True)
        for folder in ("scripts", "schemas", "site/data", "site/assets", "editorial"):
            (root / folder).mkdir(parents=True, exist_ok=True)
        for source in (sync.ROOT / "scripts").glob("*.py"):
            shutil.copyfile(source, root / "scripts" / source.name)
        for source in (sync.ROOT / "schemas").glob("*.json"):
            shutil.copyfile(source, root / "schemas" / source.name)
        current = sync.load_json(sync.DEFAULT_PUBLICATION)
        raw = sync.validate_baseline(current)
        for name, data in raw.items():
            (root / "site/data" / name).write_bytes(data)
        (root / "site/data/publication-overlay.json").write_text(json.dumps({"version": 1, "items": []}, indent=2) + '\n')
        (root / "site/data/constellations.json").write_text('[]\n')
        (root / "site/assets/justice.webp").write_bytes(b"approved image")
        source = json.loads(raw["corpus-data-enriched.json"]) + [self.record("new-A"), self.record("new-B")]
        (root / "corpus.json").write_text(json.dumps(source), encoding="utf-8")
        publication = self.helpers.manifest()
        publication["baseline"] = current["baseline"]
        publication["corpus_sha256"] = hashlib.sha256((root / "corpus.json").read_bytes()).hexdigest()
        return root, publication, raw

    def run_projection(self, root, publication, *, out=None, check=False, schema=None):
        (root / "editorial/publication.json").write_text(json.dumps(publication), encoding="utf-8")
        command = [sys.executable, "scripts/publication_sync.py", "--corpus", "corpus.json"]
        if out is not None:
            command += ["--out", str(out)]
        if check:
            command.append("--check")
        if schema is not None:
            command += ["--schema", str(schema)]
        return subprocess.run(command, cwd=root, text=True, capture_output=True,
                              env={**os.environ, "PYTHONDONTWRITEBYTECODE": "1"})

    def test_cli_custom_schema_validates_new_and_previous_receipts(self):
        with tempfile.TemporaryDirectory() as tmp:
            root, publication, _ = self.fixture(tmp)
            schema = json.loads((root / "schemas/corpus-input.schema.json").read_bytes())
            schema["items"]["required"].remove("date")
            custom_schema = root / "custom-schema.json"
            custom_schema.write_text(json.dumps(schema), encoding="utf-8")
            corpus = json.loads((root / "corpus.json").read_bytes())
            added = next(record for record in corpus if record["id"] == "new-A")
            del added["date"]
            (root / "corpus.json").write_text(json.dumps(corpus), encoding="utf-8")
            publication["corpus_sha256"] = hashlib.sha256((root / "corpus.json").read_bytes()).hexdigest()
            publication["items"] = [self.helpers.entry("new-A")]
            first = self.run_projection(root, publication, schema=custom_schema)
            self.assertEqual(first.returncode, 0, first.stderr)

            # The active source now satisfies the default schema, but the
            # verified predecessor snapshot still requires the selected schema.
            added["date"] = "1900"
            (root / "corpus.json").write_text(json.dumps(corpus), encoding="utf-8")
            publication["corpus_sha256"] = hashlib.sha256((root / "corpus.json").read_bytes()).hexdigest()
            publication["items"].append(self.helpers.entry("new-B"))
            before = {path.name: path.read_bytes() for path in (root / "site/data").iterdir() if path.is_file()}
            receipt = self.receipt_path(root)
            previous_receipt = receipt.read_bytes()
            for check in (True, False):
                incompatible = self.run_projection(root, publication, check=check)
                self.assertEqual(incompatible.returncode, 1, incompatible.stdout)
                self.assertIn("'date' is a required property", incompatible.stderr)
                self.assertEqual(receipt.read_bytes(), previous_receipt)
                self.assertEqual(before, {path.name: path.read_bytes() for path in (root / "site/data").iterdir() if path.is_file()})

            checked = self.run_projection(root, publication, schema=custom_schema, check=True)
            self.assertEqual(checked.returncode, 0, checked.stderr)
            self.assertEqual(receipt.read_bytes(), previous_receipt)
            self.assertEqual(before, {path.name: path.read_bytes() for path in (root / "site/data").iterdir() if path.is_file()})
            second = self.run_projection(root, publication, schema=custom_schema)
            self.assertEqual(second.returncode, 0, second.stderr)
            self.assertEqual(len(json.loads((root / "site/data/acervo.json").read_bytes())), 339)

    def test_cli_rejects_file_output_root_and_ancestor_before_check_or_write(self):
        with tempfile.TemporaryDirectory() as tmp:
            root, publication, _ = self.fixture(tmp)
            publication["items"] = [self.helpers.entry("new-A")]
            blocker = root / "output-file"
            blocker.write_bytes(b"preserve user file")
            before = {path.name: path.read_bytes() for path in (root / "site/data").iterdir() if path.is_file()}
            for destination in (blocker, blocker / "nested"):
                for check in (True, False):
                    with self.subTest(destination=destination, check=check):
                        process = self.run_projection(root, publication, out=destination, check=check)
                        self.assertEqual(process.returncode, 1, process.stdout)
                        self.assertIn("saída não é diretório", process.stderr)
                        self.assertEqual(blocker.read_bytes(), b"preserve user file")
                        self.assertFalse((root / "editorial/.publication-state").exists())
                        self.assertEqual(before, {path.name: path.read_bytes() for path in (root / "site/data").iterdir() if path.is_file()})

    def test_cli_requires_valid_schema_file_before_check_or_write(self):
        for kind in ("missing", "directory", "invalid-json", "invalid-schema"):
            with tempfile.TemporaryDirectory() as tmp:
                root, publication, _ = self.fixture(tmp)
                publication["items"] = [self.helpers.entry("new-A")]
                first = self.run_projection(root, publication)
                self.assertEqual(first.returncode, 0, first.stderr)
                schema_path = root / "selected-schema.json"
                if kind == "directory":
                    schema_path.mkdir()
                elif kind == "invalid-json":
                    schema_path.write_bytes(b"not JSON")
                elif kind == "invalid-schema":
                    schema_path.write_text(json.dumps({"type": "unknown-type"}), encoding="utf-8")
                corpus = json.loads((root / "corpus.json").read_bytes())
                del next(record for record in corpus if record["id"] == "new-A")["date"]
                (root / "corpus.json").write_text(json.dumps(corpus), encoding="utf-8")
                publication["corpus_sha256"] = hashlib.sha256((root / "corpus.json").read_bytes()).hexdigest()
                publication["items"].append(self.helpers.entry("new-B"))
                before = {path.name: path.read_bytes() for path in (root / "site/data").iterdir() if path.is_file()}
                receipt = self.receipt_path(root)
                previous_receipt = receipt.read_bytes()
                for check in (True, False):
                    with self.subTest(kind=kind, check=check):
                        blocked = self.run_projection(root, publication, schema=schema_path, check=check)
                        self.assertEqual(blocked.returncode, 1, blocked.stdout)
                        self.assertIn("Schema do corpus", blocked.stderr[:1200])
                        self.assertNotIn("Traceback", blocked.stderr[:1200])
                        self.assertEqual(receipt.read_bytes(), previous_receipt)
                        self.assertEqual(before, {path.name: path.read_bytes() for path in (root / "site/data").iterdir() if path.is_file()})

    def test_cli_rejects_file_receipt_directory_before_check_or_write(self):
        with tempfile.TemporaryDirectory() as tmp:
            root, publication, _ = self.fixture(tmp)
            publication["items"] = [self.helpers.entry("new-A")]
            blocker = root / "editorial/.publication-state"
            blocker.write_bytes(b"preserve private user file")
            before = {name: (root / "site/data" / name).read_bytes() for name in sync.OUTPUT_NAMES}
            for check in (True, False):
                with self.subTest(check=check):
                    process = self.run_projection(root, publication, check=check)
                    self.assertEqual(blocker.read_bytes(), b"preserve private user file")
                    self.assertEqual(before, {name: (root / "site/data" / name).read_bytes() for name in sync.OUTPUT_NAMES})
                    self.assertEqual(process.returncode, 1, process.stdout)
                    self.assertIn("Estado privado", process.stderr)

    def test_fresh_cli_accepts_verified_increment_and_restores_last_addition(self):
        with tempfile.TemporaryDirectory() as tmp:
            root, publication, raw = self.fixture(tmp)
            for entries in ([self.helpers.entry("new-A")],
                            [self.helpers.entry("new-A"), self.helpers.entry("new-B")],
                            [self.helpers.entry("new-B")], []):
                publication["items"] = entries
                process = self.run_projection(root, publication)
                self.assertEqual(process.returncode, 0, process.stderr)
                self.assertEqual(len(json.loads((root / "site/data/acervo.json").read_bytes())),
                                 len(json.loads(raw["acervo.json"])) + len(entries))
            self.assertEqual((root / "site/data/acervo.json").read_bytes(), raw["acervo.json"])
            self.assertEqual((root / "site/data/stats.json").read_bytes(), raw["stats.json"])
            self.assertEqual(json.loads((root / "site/data/publication-overlay.json").read_bytes()), {"version": 1, "items": []})

    def test_reused_out_restores_removed_addition_and_image_supplement(self):
        with tempfile.TemporaryDirectory() as tmp:
            root, publication, raw = self.fixture(tmp)
            destination = root / "export"
            publication["items"] = [self.helpers.entry("new-A")]
            first = self.run_projection(root, publication, out=destination)
            self.assertEqual(first.returncode, 0, first.stderr)
            publication["items"] = []
            second = self.run_projection(root, publication, out=destination)
            self.assertEqual(second.returncode, 0, second.stderr)
            self.assertEqual((destination / "acervo.json").read_bytes(), raw["acervo.json"])
            self.assertEqual((destination / "stats.json").read_bytes(), raw["stats.json"])
            missing_image = next(item["id"] for item in json.loads(raw["acervo.json"]) if not item["tem_imagem"])
            publication["items"] = [self.helpers.entry(missing_image)]
            third = self.run_projection(root, publication, out=destination)
            self.assertEqual(third.returncode, 0, third.stderr)
            self.assertEqual(json.loads((destination / "stats.json").read_bytes())["com_imagem"],
                             json.loads(raw["stats.json"])["com_imagem"] + 1)
            publication["items"] = []
            fourth = self.run_projection(root, publication, out=destination)
            self.assertEqual(fourth.returncode, 0, fourth.stderr)
            self.assertEqual((destination / "stats.json").read_bytes(), raw["stats.json"])

    def test_reused_out_external_edit_is_rejected_before_any_write(self):
        with tempfile.TemporaryDirectory() as tmp:
            root, publication, _ = self.fixture(tmp)
            destination = root / "export"
            publication["items"] = [self.helpers.entry("new-A")]
            first = self.run_projection(root, publication, out=destination)
            self.assertEqual(first.returncode, 0, first.stderr)
            for name in ("acervo.json", "stats.json", "publication-overlay.json", "constellations.json"):
                with self.subTest(name=name):
                    saved = {path.name: path.read_bytes() for path in destination.iterdir() if path.is_file()}
                    (destination / name).write_bytes(b"external user edit")
                    before = {path.name: path.read_bytes() for path in destination.iterdir() if path.is_file()}
                    process = self.run_projection(root, publication, out=destination)
                    self.assertEqual(process.returncode, 1, process.stdout)
                    self.assertEqual(before, {path.name: path.read_bytes() for path in destination.iterdir() if path.is_file()})
                    for filename, data in saved.items():
                        (destination / filename).write_bytes(data)

    def receipt_path(self, root):
        return next((root / "editorial/.publication-state").glob("*.json"))

    def test_checkout_without_receipt_proves_desired_but_not_unverified_predecessor(self):
        with tempfile.TemporaryDirectory() as tmp:
            root, publication, _ = self.fixture(tmp)
            publication["items"] = [self.helpers.entry("new-A")]
            first = self.run_projection(root, publication)
            self.assertEqual(first.returncode, 0, first.stderr)
            self.receipt_path(root).unlink()
            before = {path.name: path.read_bytes() for path in (root / "site/data").iterdir() if path.is_file()}
            checked = self.run_projection(root, publication, check=True)
            self.assertEqual(checked.returncode, 0, checked.stderr)
            self.assertEqual(list((root / "editorial/.publication-state").glob("*.json")), [])
            self.assertEqual(before, {path.name: path.read_bytes() for path in (root / "site/data").iterdir() if path.is_file()})
            publication["items"].append(self.helpers.entry("new-B"))
            unverified = self.run_projection(root, publication)
            self.assertEqual(unverified.returncode, 1)
            self.assertIn("Estado privado ausente", unverified.stderr)
            self.assertEqual(before, {path.name: path.read_bytes() for path in (root / "site/data").iterdir() if path.is_file()})

    def test_corrupt_receipt_hash_cannot_authorize_overwrite(self):
        with tempfile.TemporaryDirectory() as tmp:
            root, publication, _ = self.fixture(tmp)
            publication["items"] = [self.helpers.entry("new-A")]
            first = self.run_projection(root, publication)
            self.assertEqual(first.returncode, 0, first.stderr)
            path = self.receipt_path(root)
            receipt = json.loads(path.read_bytes())
            receipt["outputs"]["acervo.json"] = "0" * 64
            path.write_text(json.dumps(receipt))
            before = {file.name: file.read_bytes() for file in (root / "site/data").iterdir() if file.is_file()}
            publication["items"].append(self.helpers.entry("new-B"))
            process = self.run_projection(root, publication)
            self.assertEqual(process.returncode, 1)
            self.assertIn("recalculada", process.stderr)
            self.assertEqual(before, {file.name: file.read_bytes() for file in (root / "site/data").iterdir() if file.is_file()})

    def test_mixed_or_missing_previous_bundle_is_rejected_before_first_write(self):
        with tempfile.TemporaryDirectory() as tmp:
            root, publication, raw = self.fixture(tmp)
            publication["items"] = [self.helpers.entry("new-A")]
            first = self.run_projection(root, publication)
            self.assertEqual(first.returncode, 0, first.stderr)
            original = (root / "site/data/acervo.json").read_bytes()
            publication["items"].append(self.helpers.entry("new-B"))
            for partial in ("mixed", "missing"):
                with self.subTest(partial=partial):
                    catalogue = root / "site/data/acervo.json"
                    if partial == "mixed":
                        catalogue.write_bytes(raw["acervo.json"])
                    else:
                        catalogue.unlink()
                    before = {file.name: file.read_bytes() for file in (root / "site/data").iterdir() if file.is_file()}
                    process = self.run_projection(root, publication)
                    self.assertEqual(process.returncode, 1)
                    self.assertIn("estado parcial", process.stderr)
                    self.assertEqual(before, {file.name: file.read_bytes() for file in (root / "site/data").iterdir() if file.is_file()})
                    catalogue.write_bytes(original)

    def test_output_and_state_symlinks_are_rejected_without_touching_destination(self):
        with tempfile.TemporaryDirectory() as tmp:
            root, publication, _ = self.fixture(tmp)
            publication["items"] = [self.helpers.entry("new-A")]
            destination = root / "export"
            destination.mkdir()
            target = root / "external.json"
            target.write_bytes(b"keep external user file")
            (destination / "stats.json").symlink_to(target)
            process = self.run_projection(root, publication, out=destination)
            self.assertEqual(process.returncode, 1)
            self.assertEqual(target.read_bytes(), b"keep external user file")
            self.assertEqual(sorted(path.name for path in destination.iterdir()), ["stats.json"])
            (destination / "stats.json").unlink()
            first = self.run_projection(root, publication, out=destination)
            self.assertEqual(first.returncode, 0, first.stderr)
            receipt = self.receipt_path(root)
            receipt.unlink()
            receipt.symlink_to(target)
            blocked = self.run_projection(root, publication, out=destination)
            self.assertEqual(blocked.returncode, 1)
            self.assertEqual(target.read_bytes(), b"keep external user file")

    def test_withdrawal_replays_history_after_old_image_is_removed(self):
        with tempfile.TemporaryDirectory() as tmp:
            root, publication, raw = self.fixture(tmp)
            publication["items"] = [self.helpers.entry("new-A")]
            first = self.run_projection(root, publication)
            self.assertEqual(first.returncode, 0, first.stderr)
            (root / "site/assets/justice.webp").unlink()
            publication["items"][0]["editorial_status"] = "withheld"
            removed = self.run_projection(root, publication)
            self.assertEqual(removed.returncode, 0, removed.stderr)
            self.assertEqual((root / "site/data/acervo.json").read_bytes(), raw["acervo.json"])
            self.assertEqual((root / "site/data/stats.json").read_bytes(), raw["stats.json"])
            self.assertEqual(json.loads((root / "site/data/publication-overlay.json").read_bytes())["items"], [])


if __name__ == "__main__":
    unittest.main()
