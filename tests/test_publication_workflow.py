"""Exercise the publication workflow's triggers and executable validation steps.

The small readers below support this workflow's block-style YAML only. They
reject unsupported syntax rather than guessing at GitHub Actions semantics.
"""
import fnmatch
import os
import re
import shlex
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github/workflows/publication.yml"


def mapping_block(lines, key, indent, required=True):
    pattern = re.compile(rf"^{' ' * indent}{re.escape(key)}:\s*(?:#.*)?$")
    matches = [index for index, line in enumerate(lines) if pattern.fullmatch(line)]
    if not matches and not required:
        return None
    if len(matches) != 1:
        raise ValueError(f"Expected one block-style {key!r} at indentation {indent}")
    result = []
    for line in lines[matches[0] + 1:]:
        if line.strip() and not line.lstrip().startswith("#"):
            if len(line) - len(line.lstrip()) <= indent:
                break
        result.append(line)
    return result


def pull_request_matches(source, changed_paths):
    events = mapping_block(source.splitlines(), "on", 0)
    request = mapping_block(events, "pull_request", 2)
    if mapping_block(request, "paths-ignore", 4, required=False) is not None:
        raise ValueError("Ignored paths require a separate coverage review")
    paths = mapping_block(request, "paths", 4, required=False)
    if paths is None:
        return True
    patterns = []
    for line in paths:
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if not line.startswith("      - "):
            raise ValueError("Unsupported path-filter syntax")
        pattern = line[8:].strip().strip("\"'")
        if not re.fullmatch(r"[a-zA-Z0-9_./-]+(?:/\*\*)?", pattern):
            raise ValueError(f"Unsupported GitHub path pattern: {pattern}")
        patterns.append(pattern)
    return any(fnmatch.fnmatchcase(path, pattern) for path in changed_paths for pattern in patterns)


def run_steps(source):
    steps = mapping_block(mapping_block(mapping_block(source.splitlines(), "jobs", 0),
                                         "publication", 2), "steps", 4)
    result = []
    index = 0
    while index < len(steps):
        match = re.fullmatch(r"(?:      - |        )run: (.+)", steps[index])
        index += 1
        if not match:
            continue
        command = match[1]
        if command == "|":
            body = []
            while index < len(steps) and (not steps[index].strip() or steps[index].startswith("          ")):
                body.append(steps[index][10:])
                index += 1
            command = "\n".join(body).strip()
        result.append(command)
    return result


class PublicationWorkflowTests(unittest.TestCase):
    def setUp(self):
        self.source = WORKFLOW.read_text(encoding="utf-8")
        self.commands = run_steps(self.source)

    def generation_step(self):
        matches = [command for command in self.commands if command.splitlines()[0].startswith(
            "python scripts/publication_sync.py --out ")]
        self.assertEqual(len(matches), 1, "The workflow must regenerate approved artifacts in temporary storage")
        return matches[0]

    def test_image_only_pull_request_runs_publication_validation(self):
        self.assertTrue(pull_request_matches(self.source, ["site/assets/acervo/BE-004.webp"]),
                        "Changing only an approved image must still validate its recorded SHA-256")

    def test_catalogue_stats_transform_and_new_gate_tests_are_covered(self):
        paths = ["site/data/acervo.json", "site/data/stats.json", "site/data/corpus-data-enriched.json",
                 "scripts/corpus_sync.py", "schemas/corpus-input.schema.json"]
        paths.extend(path.relative_to(ROOT).as_posix() for path in (ROOT / "tests").glob("test_publication*.py"))
        for path in paths:
            with self.subTest(changed_path=path):
                self.assertTrue(pull_request_matches(self.source, [path]))

    def test_workflow_discovers_every_publication_gate_suite(self):
        commands = [shlex.split(command) for command in self.commands
                    if command.startswith("python -m unittest ")]
        self.assertEqual(len(commands), 1)
        command = commands[0]
        self.assertIn("discover", command, "New gate suites must join the workflow automatically")
        start = command[command.index("-s") + 1]
        pattern = command[command.index("-p") + 1]
        suite = unittest.TestLoader().discover(str(ROOT / start), pattern=pattern)

        def cases(node):
            for child in node:
                if isinstance(child, unittest.TestSuite):
                    yield from cases(child)
                else:
                    yield child

        modules = {case.__class__.__module__.split(".")[-1] for case in cases(suite)}
        for path in (ROOT / "tests").glob("test_publication*.py"):
            self.assertIn(path.stem, modules, f"Workflow discovery omitted {path.name}")

    def test_workflow_check_and_generation_execute_without_changing_public_files(self):
        check = [shlex.split(command) for command in self.commands
                 if command.startswith("python scripts/publication_sync.py --check")]
        self.assertEqual(len(check), 1, "The workflow must execute the private manifest and live-output gates")
        before = {path: path.read_bytes() for path in (ROOT / "site/data").glob("*.json")}
        result = subprocess.run([sys.executable, *check[0][1:]], cwd=ROOT, text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        with tempfile.TemporaryDirectory() as tmp:
            env = dict(os.environ, RUNNER_TEMP=tmp, PATH=str(Path(sys.executable).parent) + os.pathsep + os.environ.get("PATH", ""))
            result = subprocess.run(["bash", "-e", "-c", self.generation_step()], cwd=ROOT,
                                    env=env, text=True, capture_output=True)
            self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(before, {path: path.read_bytes() for path in (ROOT / "site/data").glob("*.json")})
        permissions = mapping_block(self.source.splitlines(), "permissions", 0)
        self.assertEqual([line.strip() for line in permissions if line.strip()], ["contents: read"])
        self.assertNotRegex(self.source, r"\b(?:deploy|continue-on-error)\b")

    def test_comparisons_reject_stats_only_drift_and_inconsistent_additions(self):
        # Execute the workflow's real comparison shell, with controlled generated
        # files. In particular, stats.json can exist without a new acervo.json.
        comparison = "\n".join(self.generation_step().splitlines()[1:])
        scenarios = [(False, False, False, True), (False, False, True, False),
                     (True, False, False, True), (True, True, False, False), (True, False, True, False)]
        for additions, wrong_catalogue, wrong_stats, expected_success in scenarios:
            with self.subTest(additions=additions, wrong_catalogue=wrong_catalogue, wrong_stats=wrong_stats), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                public = root / "site/data"
                generated = root / "runner/publication-data"
                public.mkdir(parents=True)
                generated.mkdir(parents=True)
                for name, value in {"publication-overlay.json": b'{"version":1,"items":[]}\n',
                                    "constellations.json": b"[]\n", "acervo.json": b'[{"id":"approved"}]\n',
                                    "stats.json": b'{"com_imagem":1}\n'}.items():
                    (public / name).write_bytes(value)
                    if name != "acervo.json" or additions:
                        (generated / name).write_bytes(value)
                if wrong_catalogue:
                    (generated / "acervo.json").write_bytes(b"[]\n")
                if wrong_stats:
                    (generated / "stats.json").write_bytes(b'{"com_imagem":2}\n')
                result = subprocess.run(["bash", "-e", "-c", comparison], cwd=root,
                                        env=dict(os.environ, RUNNER_TEMP=str(root / "runner")),
                                        text=True, capture_output=True)
                self.assertEqual(result.returncode == 0, expected_success, result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
