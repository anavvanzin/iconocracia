"""Behavior of the RFC #52 data boundary, without network or publication."""
import copy
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts import acervo

ROOT = Path(__file__).resolve().parents[1]


def record(id='a', **fields):
    return {'id': id, 'title': 'Justice', 'country': 'Brazil', 'date': 'c. 1531–2021',
            'regime': 'Normativo', 'motif': ['Alegoria feminina', 'descricao_pre_iconografica', 'Balança'], **fields}


class AcervoTests(unittest.TestCase):
    def test_credentials_split_by_controls_abort_before_writing(self):
        for control in ('\n', '\r', '\t', '\x00', '\x1f', '\x7f'):
            url = 'https://user:' + control + 'secret@example.org/a'
            for field in ('citation_abnt', 'description', 'iconographic_metadata'):
                extra = {'nested': [url]} if field == 'iconographic_metadata' else 'Reference ' + url
                with self.subTest(control=repr(control), field=field), tempfile.TemporaryDirectory() as tmp:
                    out = Path(tmp) / 'out'
                    with self.assertRaisesRegex(ValueError, '^URL com credenciais proibida na projeção$'):
                        acervo.build([record(**{field: extra})], out_dir=out)
                    self.assertFalse(out.exists())

    def test_placeholder_citations_do_not_depend_on_portuguese_labels(self):
        for citation in ('Reference. URL: https://iconocracy.local/object',
                         'Reference (https://iconocracy-corpus.corpus/object).',
                         'Reference https://iconocracy.local/object and https://example.org/source'):
            with self.subTest(citation=citation), tempfile.TemporaryDirectory() as tmp:
                package = acervo.build([record(citation_abnt=citation)], out_dir=tmp)
                self.assertNotRegex(package.itens[0]['citacao'], acervo.PLACEHOLDER)
                self.assertNotRegex((Path(tmp) / 'acervo.json').read_text(), acervo.PLACEHOLDER)
                if 'example.org' in citation:
                    self.assertIn('https://example.org/source', package.itens[0]['citacao'])

    def test_provenance_identifies_equal_size_editorial_projections(self):
        sources = [record(), record('b', editorialStatus='review'), record('c', editorialStatus='review')]
        # Equal selected counts, but two review records exist in the full corpus.
        enriched = sources[:2]
        public = acervo.build(sources, enriched)
        private = acervo.build(sources, enriched, status='review')
        self.assertNotEqual(public.stats['meta'], private.stats['meta'])
        for package, status in ((public, 'published'), (private, 'review')):
            self.assertEqual(package.stats['meta']['selected_status'], status)
            self.assertEqual(package.stats['meta']['selected_count'], 1)
            self.assertEqual(package.stats['meta']['published_count'], 1)
        only_private = acervo.build([sources[1]], status='review')
        self.assertEqual(only_private.meta.published_count, 0)

    def test_invalid_ports_do_not_inflate_image_statistics(self):
        for port in ('bad', '99999', '-1'):
            with self.subTest(port=port):
                url = f'https://example.org:{port}/a'
                package = acervo.build([record(url=url, thumbnail_url=url, url_iiif=url, url_image_download=url)])
                self.assertEqual(package.itens[0]['fonte_url'], '')
                self.assertEqual(package.itens[0]['imagem'], '')
                self.assertEqual(package.stats['com_imagem'], 0)
        package = acervo.build([record(thumbnail_url='https://example.org:443/a')])
        self.assertEqual(package.stats['com_imagem'], 1)

    def test_stdlib_applies_schema_valued_additional_properties(self):
        schema = {'type': 'array', 'items': {'type': 'object', 'additionalProperties': {'type': 'string'}}}
        with tempfile.TemporaryDirectory() as tmp, patch.dict(sys.modules, {'jsonschema': None}):
            path = Path(tmp) / 'schema.json'
            path.write_text(json.dumps(schema))
            with self.assertRaises(ValueError):
                acervo.build([record()], schema=path)
            acervo._fallback_validate([{'extra': 'valid'}], schema)
            with self.assertRaises(ValueError):
                acervo._fallback_validate([{'extra': 3}], schema)

    def test_write_revalidates_nested_mutations_before_touching_files(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / 'out'
            out.mkdir()
            for name in ('acervo.json', 'stats.json'):
                (out / name).write_bytes(b'previous')
            package = acervo.build([record()])
            package.itens[0]['motivos'] = [3]
            with self.assertRaises(ValueError):
                package.escrever(out)
            for name in ('acervo.json', 'stats.json'):
                self.assertEqual((out / name).read_bytes(), b'previous')
            self.assertEqual(len(list(out.iterdir())), 2)

    def test_write_retains_custom_schema_after_source_is_removed(self):
        with tempfile.TemporaryDirectory() as tmp:
            schema = Path(tmp) / 'schema.json'
            schema.write_text(json.dumps({'type': 'array', 'items': {'type': 'object',
                'properties': {'suporte': {'enum': ['paper']}}}}))
            package = acervo.build([record(medium='paper')], schema=schema)
            schema.unlink()
            package.escrever(Path(tmp) / 'valid')
            package.itens[0]['suporte'] = 'metal'
            with self.assertRaises(ValueError):
                package.escrever(Path(tmp) / 'invalid')
            self.assertFalse((Path(tmp) / 'invalid').exists())

    def test_write_rejects_stale_statistics_and_provenance(self):
        for mutation in ('item', 'stats', 'meta', 'credentials'):
            with self.subTest(mutation=mutation), tempfile.TemporaryDirectory() as tmp:
                package = acervo.build([record()])
                if mutation == 'item':
                    package.itens[0]['titulo'] = 'Changed title'
                elif mutation == 'stats':
                    package.stats['total'] = 2
                elif mutation == 'meta':
                    package.stats['meta']['selected_status'] = 'review'
                else:
                    package.itens[0]['citacao'] = 'https://user:\nsecret@example.org/a'
                out = Path(tmp) / 'out'
                with self.assertRaises(ValueError):
                    package.escrever(out)
                self.assertFalse(out.exists())

    def test_local_nonempty_mirror_precedes_remote_and_empty_is_ignored(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(acervo, 'ROOT', Path(tmp)):
            mirror = Path(tmp) / 'site/assets/acervo/a.webp'
            mirror.parent.mkdir(parents=True)
            mirror.write_bytes(b'image')
            item = record(thumbnail_url='https://example.org/a.jpg')
            package = acervo.build([item])
            self.assertEqual(package.itens[0]['imagem'], 'assets/acervo/a.webp')
            self.assertEqual(package.stats['com_imagem'], 1)
            mirror.write_bytes(b'')
            self.assertEqual(acervo.build([item]).itens[0]['imagem'], item['thumbnail_url'])

    def test_local_paths_must_exist_inside_published_package(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(acervo, 'ROOT', Path(tmp)):
            image = Path(tmp) / 'site/assets/custom.jpg'
            image.parent.mkdir(parents=True)
            image.write_bytes(b'image')
            source = record(local_image_path='assets/custom.jpg')
            self.assertFalse(acervo.build([source]).itens[0]['tem_imagem'])
            image.unlink()
            self.assertFalse(acervo.build([source]).itens[0]['tem_imagem'])
            source['local_image_path'] = '../secret.jpg'
            self.assertFalse(acervo.build([source]).itens[0]['tem_imagem'])

    def test_normalization_keeps_motifs_and_independent_attributes(self):
        source = record(description='x' * 700, url='https://iconocracy.local/object',
                        citation_abnt='Reference. Disponível em: https://iconocracy.local/object',
                        iconographic_metadata={'endurecimento_score': 2, 'attributes': {str(i): i for i in range(10)}})
        before = copy.deepcopy(source)
        package = acervo.build([source])
        item = package.itens[0]
        self.assertEqual(item['pais'], 'Brasil')
        self.assertEqual(item['regime'], 'Normativo')
        self.assertEqual(item['motivos'], source['motif'])
        self.assertEqual(len(item['descricao']), 600)
        self.assertEqual(item['fonte_url'], '')
        self.assertEqual(item['citacao'], 'Reference.')
        self.assertEqual(item['iconographic_metadata'], {'attributes': source['iconographic_metadata']['attributes']})
        self.assertEqual([x['motivo'] for x in package.stats['motivos']], ['Alegoria feminina', 'Balança'])
        self.assertEqual(source, before)

    def test_stats_only_selected_items_and_missing_status_means_published(self):
        sources = [record(), record('b', editorialStatus='review')]
        package = acervo.build(sources)
        self.assertEqual(package.stats['total'], 1)
        self.assertEqual(package.meta.source_count, 2)
        self.assertEqual(package.stats['periodo'], {'min': 1531, 'max': 2021})
        self.assertEqual([x['id'] for x in acervo.build(sources, status='review').itens], ['b'])
        self.assertEqual(acervo.build(sources, enriched=[sources[1]]).itens, [])
        self.assertEqual(acervo.build(sources, enriched=[record('b')]).itens, [])

    def test_bytes_and_provenance_repeat_across_order_and_location(self):
        with tempfile.TemporaryDirectory() as tmp:
            sources = [record('b'), record('a')]
            paths = [Path(tmp) / 'one', Path(tmp) / 'two']
            for data, out in zip((sources, sources[::-1]), paths):
                package = acervo.build(data)
                self.assertEqual(len(package.fichas()), 2)
                package.escrever(out)
            for name in ('acervo.json', 'stats.json'):
                self.assertEqual((paths[0] / name).read_bytes(), (paths[1] / name).read_bytes())
            self.assertNotIn('generated_at', package.stats['meta'])
            self.assertNotIn(str(tmp), json.dumps(package.stats))

    def test_credential_urls_never_reach_public_json(self):
        for url in ('https://user:token@example.org/a', 'https://user@example.org/a',
                    'https://:token@example.org/a', 'https://user%40name:secret@example.org/a'):
            with self.subTest(url=url), tempfile.TemporaryDirectory() as tmp:
                source = record(url=url, thumbnail_url=url, url_iiif=url,
                                url_image_download=url)
                package = acervo.build([source], out_dir=tmp)
                self.assertEqual(package.itens[0]['fonte_url'], '')
                self.assertFalse(package.itens[0]['tem_imagem'])
                self.assertNotIn(url, (Path(tmp) / 'acervo.json').read_text())
                for field in ('citation_abnt', 'description', 'iconographic_metadata'):
                    extra = {'nested': [url]} if field == 'iconographic_metadata' else 'Reference ' + url
                    with self.assertRaisesRegex(ValueError, '^URL com credenciais proibida na projeção$'):
                        acervo.build([record(**{field: extra})])

    def test_private_outputs_are_blocked_in_cli_and_api_including_symlinks(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(acervo, 'ROOT', Path(tmp)):
            site = Path(tmp) / 'site'
            site.mkdir()
            alias = Path(tmp) / 'alias'
            alias.symlink_to(site, target_is_directory=True)
            for status in ('review', 'draft', 'archived'):
                source = record(editorialStatus=status)
                package = acervo.build([source], status=status)
                for out in (site, site / 'data', alias / 'data'):
                    with self.subTest(status=status, out=out), self.assertRaises(ValueError):
                        package.escrever(out)
                    with self.assertRaises(ValueError):
                        acervo.build([source], status=status, out_dir=out)
                private = Path(tmp) / status
                package.escrever(private)
                self.assertEqual(json.loads((private / 'acervo.json').read_text())[0]['id'], 'a')
                source_path = Path(tmp) / 'source.json'
                source_path.write_text(json.dumps([source]))
                base = ['acervo.py', '--corpus', str(source_path), '--status', status]
                for argv, expected in ((base, 1), (base + ['--out', str(site / 'data')], 1),
                                       (base + ['--check'], 0)):
                    with patch.object(sys, 'argv', argv):
                        self.assertEqual(acervo.main(), expected)
            self.assertEqual(list(site.iterdir()), [])

    def test_nested_object_key_order_has_identical_bytes_and_provenance(self):
        first = record(iconographic_metadata={'z': [{'b': 2, 'a': 1}], 'a': {'y': 2, 'x': 1}})
        second = record(iconographic_metadata={'a': {'x': 1, 'y': 2}, 'z': [{'a': 1, 'b': 2}]})
        with tempfile.TemporaryDirectory() as tmp:
            one = acervo.build([first], out_dir=Path(tmp) / 'one')
            two = acervo.build([second], out_dir=Path(tmp) / 'two')
            self.assertEqual(one.meta, two.meta)
            for name in ('acervo.json', 'stats.json'):
                self.assertEqual((Path(tmp) / 'one' / name).read_bytes(),
                                 (Path(tmp) / 'two' / name).read_bytes())

    def test_unloadable_local_files_do_not_inflate_image_statistics(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(acervo, 'ROOT', Path(tmp)):
            local = Path(tmp) / 'site/assets/custom.jpg'
            local.parent.mkdir(parents=True)
            local.write_bytes(b'image')
            for fields in ({'local_image_path': 'assets/custom.jpg'},
                           {'files': [{'type': 'image', 'path': 'assets/custom.jpg'}]}):
                package = acervo.build([record(**fields)])
                self.assertEqual(package.itens[0]['imagem'], '')
                self.assertEqual(package.stats['com_imagem'], 0)
                package = acervo.build([record(**fields, thumbnail_url='https://example.org/a.jpg')])
                self.assertEqual(package.itens[0]['imagem'], 'https://example.org/a.jpg')
                self.assertEqual(package.stats['com_imagem'], 1)

    def test_invalid_input_output_schema_and_missing_schema_fail(self):
        for sources in ([record(), record()], [record(motif=[3])], [{'id': 'a'}]):
            with self.subTest(sources=sources), self.assertRaises(ValueError):
                acervo.build(sources)
        with self.assertRaises((ValueError, OSError)):
            acervo.build([record()], schema=Path('/missing-schema.json'))
        with tempfile.TemporaryDirectory() as tmp:
            schema = Path(tmp) / 'schema.json'
            schema.write_text('{"type":"array","maxItems":0}')
            with self.assertRaises(ValueError):
                acervo.build([record()], schema=schema)

    def test_files_iiif_and_placeholder_image_chain(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(acervo, 'ROOT', Path(tmp)):
            image = Path(tmp) / 'site/assets/file.jpg'
            image.parent.mkdir(parents=True)
            image.write_bytes(b'image')
            source = record(files=[{'type': 'image', 'role': 'primary', 'path': 'assets/file.jpg'}],
                            thumbnail_url='https://iconocracy.local/placeholder',
                            url_iiif='https://example.org/iiif', url_image_download='https://example.org/download')
            self.assertEqual(acervo.build([source]).itens[0]['imagem'], source['url_iiif'])
            image.unlink()
            self.assertEqual(acervo.build([source]).itens[0]['imagem'], source['url_iiif'])

    def test_date_spans_are_aggregated_without_discarding_undated_items(self):
        for date, period in [('1239–1240', (1239, 1240)), ('2014-01-01', (2014, 2014)),
                             ('séculos XVI–XVIII', (None, None)), ('12345', (None, None))]:
            with self.subTest(date=date):
                package = acervo.build([record(date=date)])
                self.assertEqual(package.itens[0]['data'], date)
                self.assertEqual(package.stats['total'], 1)
                self.assertEqual(package.stats['periodo'], dict(zip(('min', 'max'), period)))

    def test_stdlib_validation_does_not_silently_skip_contract(self):
        with patch.dict(sys.modules, {'jsonschema': None}):
            self.assertTrue(acervo.build([record()]).meta.warnings)
            with self.assertRaises(ValueError):
                acervo.build([record(motif=[3])])

    def test_enriched_subset_has_its_own_statistics(self):
        sources = [record(), record('b', country='France', date='1900')]
        package = acervo.build(sources, [sources[1]], incluir_meta=False)
        self.assertEqual(package.stats['total'], 1)
        self.assertEqual(package.stats['por_pais'], [{'pais': 'França', 'n': 1}])
        self.assertNotIn('meta', package.stats)
        with self.assertRaises(ValueError):
            acervo.build(sources, [record('unknown')])

    def test_atomic_staging_failure_preserves_existing_files(self):
        package = acervo.build([record()])
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp)
            (out / 'acervo.json').write_bytes(b'old catalogue')
            (out / 'stats.json').write_bytes(b'old stats')
            with patch.object(acervo.os, 'fsync', side_effect=OSError('disk failure')):
                with self.assertRaises(OSError):
                    package.escrever(out)
            self.assertEqual((out / 'acervo.json').read_bytes(), b'old catalogue')
            self.assertEqual((out / 'stats.json').read_bytes(), b'old stats')
            self.assertEqual(sorted(p.name for p in out.iterdir()), ['acervo.json', 'stats.json'])

    def test_current_migration_diff_is_exactly_the_documented_review_snapshot(self):
        report = json.loads((ROOT / 'docs/acervo-boundary-diff.json').read_text())
        package = acervo.build()
        published = json.loads((ROOT / 'site/data/acervo.json').read_text())
        old = {item['id']: item for item in published}
        changes = {}
        for item in package.itens:
            for key in sorted(set(old[item['id']]) | set(item)):
                if old[item['id']].get(key) != item.get(key):
                    changes.setdefault(key, []).append(item['id'])
        self.assertEqual(package.stats, report['proposed_stats'])
        self.assertEqual({key: {'count': len(ids), 'ids': sorted(ids)} for key, ids in changes.items()},
                         report['changed_fields'])
        self.assertEqual([i['id'] for i in package.itens], [i['id'] for i in published])
        self.assertEqual(report['ids_added'], [])
        self.assertEqual(report['ids_removed'], [])
        self.assertEqual(acervo.build(incluir_meta=False).stats,
                         {k: v for k, v in package.stats.items() if k != 'meta'})

    def test_check_never_writes_and_cli_exit_codes(self):
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / 'source.json'
            source.write_text(json.dumps([record()]))
            out = Path(tmp) / 'out'
            command = [sys.executable, str(ROOT / 'scripts/acervo.py'), '--corpus', str(source), '--out', str(out)]
            result = subprocess.run(command + ['--check'], capture_output=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertFalse(out.exists())
            source.write_text('[{"id":"broken"}]')
            self.assertEqual(subprocess.run(command + ['--check'], capture_output=True).returncode, 1)
            self.assertEqual(subprocess.run(command + ['--unknown'], capture_output=True).returncode, 2)


if __name__ == '__main__':
    unittest.main()
