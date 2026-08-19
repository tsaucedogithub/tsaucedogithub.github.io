import os, re, sys, unittest
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import canon

FIX = os.path.join(HERE, 'fixtures', 'canon_small.yml')

class LoadCanon(unittest.TestCase):
    def test_loads_books_and_defaults(self):
        books = canon.load_canon(FIX)
        self.assertEqual([b['id'] for b in books], ['sample-book', 'no-gutenberg'])
        self.assertEqual(books[1]['window'], 2)          # default
        self.assertEqual(books[0]['window'], 150)

    def test_passage_ids_default_to_position(self):
        books = canon.load_canon(FIX)
        self.assertEqual(books[0]['passages'][0]['id'], 'sample-book-1')
        self.assertEqual(books[0]['passages'][1]['id'], 'custom-id')
        self.assertEqual(books[0]['famous']['id'], 'sample-book-famous')
        self.assertNotIn('famous', books[1])

    def test_rejects_duplicate_book_ids(self):
        with self.assertRaises(canon.CanonError):
            canon.validate([{'id': 'a', 'title': 't', 'author': 'a', 'year': 1, 'passages': [{'text': 'x', 'locus': 'l', 'difficulty': 1}]}] * 2)

    def test_rejects_missing_required_fields(self):
        with self.assertRaises(canon.CanonError):
            canon.validate([{'id': 'a', 'title': 't', 'year': 1, 'passages': []}])

    def test_all_passages_flattens_main_only(self):
        books = canon.load_canon(FIX)
        ids = [p['id'] for p in canon.all_passages(books)]
        self.assertEqual(ids, ['sample-book-1', 'custom-id', 'no-gutenberg-1'])

class NoEmDashes(unittest.TestCase):
    """No em dash, en dash or "--" may exist anywhere in the real canon: the
    passages are stored with one spaced hyphen instead."""

    DASH = re.compile(r'--|\u2014|\u2013')

    def test_real_canon_is_free_of_dashes(self):
        if not os.path.exists(canon.DEFAULT_PATH):
            self.skipTest('canon file not present')
        offenders = []
        for b in canon.load_canon():
            fields = [('title', b.get('title')), ('clue', b.get('clue'))]
            for p in b['passages']:
                fields.append((p['id'] + ' text', p.get('text')))
                fields.append((p['id'] + ' significance', p.get('significance')))
            if 'famous' in b:
                fields.append((b['famous']['id'] + ' text', b['famous'].get('text')))
            for name, value in fields:
                if isinstance(value, str) and self.DASH.search(value):
                    offenders.append(f"{b['id']}: {name}")
        self.assertEqual(offenders, [], 'dashes must be written as one spaced hyphen')

if __name__ == '__main__':
    unittest.main()
