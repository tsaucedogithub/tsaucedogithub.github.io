import json, os, sys, tempfile, unittest
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import build_library as bl


class BuildLibrary(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.out = os.path.join(cls.tmp.name, 'blue_book_library.json')
        bl.main(['--out', cls.out])
        with open(cls.out, encoding='utf-8') as f:
            cls.lib = json.load(f)

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_writes_a_big_enough_library(self):
        self.assertIsInstance(self.lib, list)
        self.assertGreaterEqual(len(self.lib), 300)

    def test_no_duplicate_title_author_pairs(self):
        pairs = [(e['title'], e['author']) for e in self.lib]
        dupes = {p for p in pairs if pairs.count(p) > 1}
        self.assertEqual(dupes, set())

    def test_contains_a_canon_title(self):
        self.assertIn('The Great Gatsby', [e['title'] for e in self.lib])

    def test_every_entry_has_a_title(self):
        for e in self.lib:
            self.assertTrue(e['title'].strip(), e)

    def test_entries_carry_title_and_author_only(self):
        for e in self.lib:
            self.assertEqual(sorted(e.keys()), ['author', 'title'], e)

    def test_sorted_by_title_ignoring_a_leading_article(self):
        keys = [bl.sort_key(e['title']) for e in self.lib]
        self.assertEqual(keys, sorted(keys))

    def test_series_suffix_is_dropped(self):
        titles = [e['title'] for e in self.lib]
        self.assertIn('Harry Potter', titles)
        self.assertEqual([t for t in titles if '(series)' in t], [])

    def test_display_overrides_reach_the_library(self):
        titles = [e['title'] for e in self.lib]
        self.assertIn('U.S.A.', titles)
        self.assertNotIn('Usa', titles)

    def test_suggested_appendix_lands_in_the_library(self):
        titles = [e['title'] for e in self.lib]
        self.assertIn('Nicomachean Ethics', titles)
        self.assertIn('Six Characters in Search of an Author', titles)

    def test_build_dedupes_by_normalised_title_and_author_surname(self):
        rows = [('The Odyssey', 'Homer'), ('Odyssey', 'Homer'), ('The Odyssey', 'Emily Wilson')]
        out = bl.build(rows, [])
        self.assertEqual(out, [{'title': 'The Odyssey', 'author': 'Emily Wilson'}, {'title': 'The Odyssey', 'author': 'Homer'}])

    def test_build_drops_empty_titles(self):
        self.assertEqual(bl.build([('', 'Nobody'), ('   ', '')], []), [])


if __name__ == '__main__':
    unittest.main()
