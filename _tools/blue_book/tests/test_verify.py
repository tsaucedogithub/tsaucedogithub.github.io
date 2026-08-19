import os, sys, unittest
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import canon, verify_passages as vp

FIX = os.path.join(HERE, 'fixtures')

class Normalize(unittest.TestCase):
    def test_collapses_whitespace_and_typography(self):
        self.assertEqual(vp.normalize('a  b\n\nc'), 'a b c')
        self.assertEqual(vp.normalize('“Hi,” he said—no.'), '"Hi," he said-no.')
        self.assertEqual(vp.normalize('I _am_ here'), 'I am here')
        self.assertEqual(vp.normalize('it’s'), "it's")

    def test_spaced_hyphen_matches_the_sources_em_dash(self):
        # The canon holds "Daisy - they", Gutenberg prints "Daisy—they".
        self.assertEqual(vp.normalize('Daisy - they'), vp.normalize('Daisy—they'))

class CheckBook(unittest.TestCase):
    def setUp(self):
        self.books = canon.load_canon(os.path.join(FIX, 'canon_small.yml'))
        self.text = open(os.path.join(FIX, 'pg99999.txt'), encoding='utf-8').read()

    def test_all_sample_passages_verify(self):
        results = vp.check_book(self.books[0], self.text)
        self.assertEqual([(pid, ok) for pid, ok, note in results],
                         [('sample-book-1', True), ('custom-id', True), ('sample-book-famous', True)])

    def test_altered_passage_fails_with_first_missing_words(self):
        book = dict(self.books[0])
        book['passages'] = [dict(book['passages'][0], text='Sing to me of the woman, Muse')]
        book.pop('famous')
        results = vp.check_book(book, self.text)
        self.assertFalse(results[0][1])
        self.assertIn('Sing to me of the', results[0][2])   # note shows the longest matching prefix

    def test_word_count_warning(self):
        book = dict(self.books[0]); book.pop('famous')
        book['passages'] = [dict(book['passages'][0], text='Sing to me of the man, Muse')]
        results = vp.check_book(book, self.text)
        self.assertTrue(results[0][1])
        self.assertIn('short', results[0][2])

class Main(unittest.TestCase):
    def test_main_reports_unverified_and_returns_zero_when_all_ok(self):
        rc = vp.main(['--canon', os.path.join(FIX, 'canon_small.yml'), '--text-dir', FIX])
        self.assertEqual(rc, 0)

    def test_main_returns_one_on_failure(self):
        bad = os.path.join(FIX, 'canon_bad.yml')
        with open(os.path.join(FIX, 'canon_small.yml'), encoding='utf-8') as f:
            src = f.read()
        with open(bad, 'w', encoding='utf-8') as f:
            f.write(src.replace('driven time and again off course.', 'driven time and again ON course.'))
        try:
            self.assertEqual(vp.main(['--canon', bad, '--text-dir', FIX]), 1)
        finally:
            os.remove(bad)

if __name__ == '__main__':
    unittest.main()
