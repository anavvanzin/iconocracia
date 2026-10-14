import copy
import json
import unittest
from pathlib import Path
from scripts.publication_sync import build_constellations

class ColumbiaPublicationTests(unittest.TestCase):
    def test_approved_cards_reproduce_public_projection_and_strip_internal_fields(self):
        manifest = json.loads(Path('editorial/publication.json').read_text())
        definition = next(d for d in manifest['constellations'] if d['slug'] == 'columbia-dois-chamados')
        definition = copy.deepcopy(definition)
        for card in definition['cards']:
            card['internal_notes'] = 'PRIVATE'
            card['approved_by'] = 'ana'
        items = [{'id': i} for i in definition['item_ids']]
        result = build_constellations([definition], items)
        self.assertEqual(result, json.loads(Path('site/data/constellations.json').read_text()))
        self.assertNotIn('PRIVATE', json.dumps(result))
        for cards in [[], definition['cards'][1:], list(reversed(definition['cards']))]:
            with self.assertRaises(ValueError):
                build_constellations([{**definition, 'cards': cards}], items)
        self.assertEqual(build_constellations([{**definition, 'editorial_status': 'review'}], items), [])
