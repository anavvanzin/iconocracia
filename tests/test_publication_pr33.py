"""Reconciliation with Columbia and the opt-in RFC #52 boundary."""
import copy
import json
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from scripts import publication_sync as sync
from tests import test_publication_sync as fixtures


class PR33ReconciliationTests(unittest.TestCase):
    def test_stats_anchor_changes_no_catalogue_or_canonical_source_bytes(self):
        # Historical diagnosis stays pinned when newer reviewed baselines land.
        names = ('acervo.json', 'stats.json', 'corpus-data-enriched.json')
        current = {
            name: subprocess.run(
                ['git', 'show', f'529fb580545079581b066031d08a140705ceb997:site/data/{name}'],
                cwd=sync.ROOT, capture_output=True, check=True,
            ).stdout for name in names
        }
        previous = {
            name: subprocess.run(
                ['git', 'show', f'fd97da1560bd24826ee9d4bcd69e786668ce5311:site/data/{name}'],
                cwd=sync.ROOT, capture_output=True, check=True,
            ).stdout for name in current
        }
        for name in ('acervo.json', 'corpus-data-enriched.json'):
            self.assertEqual(current[name], previous[name], name)
        # A fixed, reviewed Git predecessor, never the mutable output directory.
        expected = previous['stats.json'].replace(
            b'  "com_imagem": 332,\n',
            b'  "com_imagem": 332,\n  "recorte_tese_brasil_1822_1922": 53,\n',
        ) + b'\n'
        self.assertEqual(current['stats.json'], expected)

    def test_current_package_needs_no_receipt_and_rejects_unrelated_drift(self):
        publication = sync.load_json(sync.DEFAULT_PUBLICATION)
        raw = sync.validate_baseline(publication)
        result = sync.generate([], publication, json.loads(raw['acervo.json']),
                               baseline_stats=json.loads(raw['stats.json']),
                               baseline_records=json.loads(raw['corpus-data-enriched.json']))
        bundle = sync._projection_bundle(raw, *result)
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / 'public'
            out.mkdir()
            state = Path(tmp) / 'private' / 'receipt.json'
            with patch.object(sync, '_state_path', return_value=state):
                for name in sync.OUTPUT_NAMES:
                    (out / name).write_bytes((sync.DEFAULT_OUT / name).read_bytes())
                before = {name: (out / name).read_bytes() for name in sync.OUTPUT_NAMES}
                sync._publish_bundle(out, bundle, publication, b'[]', raw, check=True)
                self.assertFalse(state.parent.exists())
                for name in sync.OUTPUT_NAMES:
                    with self.subTest(tampered=name):
                        # Even a whitespace-only change must not be adopted.
                        (out / name).write_bytes(before[name] + b' ')
                        with self.assertRaisesRegex(ValueError, 'Estado privado ausente'):
                            sync._publish_bundle(out, bundle, publication, b'[]', raw, check=True)
                        self.assertEqual((out / name).read_bytes(), before[name] + b' ')
                        self.assertFalse(state.parent.exists())
                        (out / name).write_bytes(before[name])
                self.assertEqual(before, {name: (out / name).read_bytes() for name in sync.OUTPUT_NAMES})

    def test_current_manifest_reproduces_complete_columbia_package(self):
        publication = sync.load_json(sync.DEFAULT_PUBLICATION)
        review = [item for item in publication['items'] if item['editorial_status'] == 'review']
        self.assertEqual(len(review), 8)
        atlantic = next(c for c in publication['constellations'] if c['slug'] == 'constituicoes-atlanticas')
        self.assertEqual(atlantic['editorial_status'], 'review')
        self.assertEqual(atlantic['item_ids'], [item['canonical_id'] for item in review])
        raw = sync.validate_baseline(publication)
        baseline = json.loads(raw['acervo.json'])
        result = sync.generate([], publication, baseline,
                               baseline_stats=json.loads(raw['stats.json']),
                               baseline_records=json.loads(raw['corpus-data-enriched.json']))
        self.assertEqual(len(result[0]), 337)
        self.assertEqual([c['slug'] for c in result[2]], ['columbia-dois-chamados'])
        # Compare bytes, including order, captions, alt text and formatting.
        for name, data in sync._projection_bundle(raw, *result).items():
            self.assertEqual(data, (sync.DEFAULT_OUT / name).read_bytes(), name)
        overlay = sync.build_overlay(result[0], baseline)
        self.assertTrue({item['canonical_id'] for item in review}.isdisjoint(
            {item['id'] for item in overlay['items']}))

    def test_aliases_resolving_to_one_canonical_record_fail_before_export(self):
        helpers = fixtures.PublicationSecurityTests()
        first = helpers.entry()
        second = copy.deepcopy(first)
        second['canonical_id'] = 'stale'
        second['source_url'] = 'https://archive.test/item/1'
        with tempfile.TemporaryDirectory() as tmp:
            site = Path(tmp)
            (site / 'assets').mkdir()
            (site / 'assets/justice.webp').write_bytes(b'approved image')
            for entries in ([first, second], [second, first]):
                with self.subTest(order=[e['canonical_id'] for e in entries]):
                    with self.assertRaisesRegex(ValueError, 'mesmo ID'):
                        sync.generate([helpers.record()], helpers.manifest(entries), [], site_root=site)

    def test_legacy_identity_cannot_substitute_for_publication_approval(self):
        helpers = fixtures.PublicationSecurityTests()
        for legacy in ('canonical', 'missing'):
            entry = {'canonical_id': 'canonical', 'legacy_record_id': legacy,
                     'editorial_status': 'published', 'grandfathered': True}
            with self.subTest(legacy=legacy), self.assertRaises(ValueError):
                sync.generate([helpers.record()], helpers.manifest([entry]),
                              [sync.transform_item(helpers.record())])
