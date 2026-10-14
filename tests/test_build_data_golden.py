"""Freeze the production data boundary before the migration in issue #52."""
import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "tests" / "fixtures" / "acervo-production"
ARTIFACTS = ("acervo.json", "stats.json")


class BuildDataGoldenTests(unittest.TestCase):
    def assert_same_bytes(self, actual: Path, expected: Path):
        actual_bytes = actual.read_bytes()
        expected_bytes = expected.read_bytes()
        if expected == FIXTURE / "stats.json":
            # The historical fixture predates #67. Keep its bytes/hash intact,
            # while checking only the explicitly reviewed date-span correction.
            self.assertEqual(json.loads(expected_bytes)["periodo"],
                             {"min": 1707, "max": 1981})
            expected_bytes = expected_bytes.replace(b'"min": 1707', b'"min": 1239')
            expected_bytes = expected_bytes.replace(b'"max": 1981', b'"max": 2021')
        # Avoid dumping the entire corpus when the byte-level contract changes.
        self.assertTrue(
            actual_bytes == expected_bytes,
            f"{actual.name} differs from {expected}: "
            f"expected sha256={hashlib.sha256(expected_bytes).hexdigest()}, "
            f"got sha256={hashlib.sha256(actual_bytes).hexdigest()}. "
            "Review the artifact diff; do not regenerate the golden automatically.",
        )

    def run_build(self, script: Path, cwd: Path, *args: str):
        result = subprocess.run(
            [sys.executable, str(script), *args],
            cwd=cwd, capture_output=True, text=True, timeout=30,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_frozen_production_snapshot_is_reproduced_byte_for_byte(self):
        manifest = json.loads((FIXTURE / "manifest.json").read_text(encoding="utf-8"))
        for name, metadata in manifest["files"].items():
            with self.subTest(fixture=name):
                data = (FIXTURE / name).read_bytes()
                self.assertEqual(len(data), metadata["bytes"])
                self.assertEqual(hashlib.sha256(data).hexdigest(), metadata["sha256"])

        with tempfile.TemporaryDirectory(prefix="acervo-golden-") as tmp:
            isolated = Path(tmp)
            script = isolated / "scripts" / "build_data.py"
            script.parent.mkdir()
            # Always exercise the current implementation, never a frozen script.
            shutil.copyfile(ROOT / "scripts" / "build_data.py", script)
            data_dir = isolated / "site" / "data"
            data_dir.mkdir(parents=True)
            shutil.copyfile(FIXTURE / "corpus-data-enriched.json",
                            data_dir / "corpus-data-enriched.json")
            mirrors = isolated / "site" / "assets" / "acervo"
            mirrors.mkdir(parents=True)
            # The current boundary only observes is_file() and nonzero size.
            # Keep that state fixed without duplicating 57 MiB of image payloads.
            for name in manifest["nonempty_webp_files"]:
                (mirrors / name).write_bytes(b"\0")

            # No corpus/ directory, inherited checkout data, or expected outputs.
            # This exercises the production CLI's public-source fallback.
            self.run_build(script, isolated)
            for name in ARTIFACTS:
                with self.subTest(run="default", artifact=name):
                    self.assert_same_bytes(data_dir / name, FIXTURE / name)

            # A second invocation must preserve the exact serialization/order.
            repeated = isolated / "repeated"
            self.run_build(script, isolated, "--out", str(repeated))
            for name in ARTIFACTS:
                with self.subTest(run="repeat", artifact=name):
                    self.assert_same_bytes(repeated / name, FIXTURE / name)

    def test_current_public_source_reproduces_versioned_artifacts(self):
        source = ROOT / "site" / "data" / "corpus-data-enriched.json"
        with tempfile.TemporaryDirectory(prefix="acervo-current-") as tmp:
            # Explicit public input prevents a developer's optional corpus/ from
            # changing this check; the script still observes the real WebP files.
            self.run_build(
                ROOT / "scripts" / "build_data.py", ROOT,
                "--corpus", str(source), "--enriched", str(source), "--out", tmp,
            )
            for name in ARTIFACTS:
                with self.subTest(artifact=name):
                    self.assert_same_bytes(Path(tmp) / name, ROOT / "site" / "data" / name)


if __name__ == "__main__":
    unittest.main()
