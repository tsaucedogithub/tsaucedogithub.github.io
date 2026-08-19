import json, os, sys, unittest
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import build_schedule as bs
import canon

def fake_passages(n_books, per_book=2, authors=None):
    out = []
    for b in range(n_books):
        book = {'id': f'b{b}', 'author': (authors or {}).get(b, f'author{b}'), 'year': 1800 + b}
        for i in range(1, per_book + 1):
            out.append({'id': f'b{b}-{i}', 'difficulty': 1 + (i % 3), 'book': book})
    return out

class Build(unittest.TestCase):
    def test_shape_and_ids(self):
        days = bs.build(fake_passages(10), days=30)
        self.assertEqual(len(days), 30)
        ids = {p['id'] for p in fake_passages(10)}
        for d in days:
            self.assertEqual(len(d), 5)
            for pid in d:
                self.assertIn(pid, ids)

    def test_no_book_twice_in_a_day(self):
        for d in bs.build(fake_passages(10), days=60):
            books = [pid.rsplit('-', 1)[0] for pid in d]
            self.assertEqual(len(set(books)), 5, d)

    def test_no_author_twice_in_a_day(self):
        ps = fake_passages(12, authors={0: 'shared', 1: 'shared'})
        for d in bs.build(ps, days=40):
            authors = [next(p for p in ps if p['id'] == pid)['book']['author'] for pid in d]
            self.assertEqual(len(set(authors)), 5, d)

    def test_deterministic(self):
        self.assertEqual(bs.build(fake_passages(10), days=20), bs.build(fake_passages(10), days=20))
        self.assertNotEqual(bs.build(fake_passages(10), days=20, seed=1), bs.build(fake_passages(10), days=20, seed=2))

    def test_spacing_no_book_on_consecutive_days_when_ten_books(self):
        days = bs.build(fake_passages(10), days=40)
        for a, b in zip(days, days[1:]):
            self.assertFalse({p.rsplit('-', 1)[0] for p in a} & {p.rsplit('-', 1)[0] for p in b})

    def test_passages_spread_before_repeating(self):
        # 10 books x 2 passages = 20 passages = 4 full days before any passage must repeat
        days = bs.build(fake_passages(10), days=4)
        flat = [pid for d in days for pid in d]
        self.assertEqual(len(set(flat)), 20)

    def test_preserves_past_days_and_regenerates_future(self):
        old = bs.build(fake_passages(10), days=10)
        new = bs.build(fake_passages(11), days=12, existing=old, from_day=6)
        self.assertEqual(new[:6], old[:6])
        self.assertEqual(len(new), 12)

    def test_too_few_books_raises(self):
        with self.assertRaises(bs.ScheduleError):
            bs.build(fake_passages(4), days=1)

    def test_real_shaped_canon_spreads_books_evenly(self):
        # 7 books in one century + 3 outside it, like the seed canon; recency must dominate the century tie-break
        ps = fake_passages(10)
        years = {'b0': 1605, 'b1': 1922, 'b2': 1925}
        for p in ps:
            p['book']['year'] = years.get(p['book']['id'], 1800 + int(p['book']['id'][1:]))
        days = bs.build(ps, days=40)
        for a, b in zip(days, days[1:]):
            self.assertFalse({x.rsplit('-', 1)[0] for x in a} & {x.rsplit('-', 1)[0] for x in b}, (a, b))
        counts = {}
        for d in days:
            for pid in d:
                counts[pid.rsplit('-', 1)[0]] = counts.get(pid.rsplit('-', 1)[0], 0) + 1
        self.assertEqual(len(counts), 10)
        self.assertTrue(all(15 <= c <= 25 for c in counts.values()), counts)

    def test_real_schedule_ids_are_current_main_passages(self):
        schedule_path = os.path.normpath(os.path.join(HERE, '..', '..', '..', '_data', 'blue_book_schedule.json'))
        if not os.path.exists(schedule_path):
            self.skipTest('no generated schedule at ' + schedule_path)
        with open(schedule_path, encoding='utf-8') as f:
            schedule = json.load(f)
        books = canon.load_canon()
        passages = canon.all_passages(books)
        main_ids = {p['id'] for p in passages}
        book_of_id = {p['id']: p['book']['id'] for p in passages}
        for day in schedule['days']:
            for pid in day:
                self.assertIn(pid, main_ids, pid)
            book_ids = [book_of_id[pid] for pid in day]
            self.assertEqual(len(set(book_ids)), len(day), day)

if __name__ == '__main__':
    unittest.main()
