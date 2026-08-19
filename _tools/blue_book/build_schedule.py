"""Build _data/blue_book_schedule.json: day N -> five passage ids.

Usage: python3 _tools/blue_book/build_schedule.py [--days 400] [--epoch YYYY-MM-DD] [--from-day N] [--seed N]
Deterministic for a given canon + seed. When the schedule file already exists, days
before --from-day (default: tomorrow, computed from the epoch) are kept verbatim so
past puzzles never change; everything from --from-day on is regenerated, which is how
newly added books enter the rotation.

Hard constraints per day: five distinct passages, distinct books, distinct authors.
Soft: prefer books and passages that have not appeared for the longest time. As tie-breaks
only (when recency is equal): at most two books from the same century, at least one
pre-1800 book when the canon has any.
"""
import argparse, datetime, json, os, random, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import canon

OUT = os.path.normpath(os.path.join(HERE, '..', '..', '_data', 'blue_book_schedule.json'))
PER_DAY = 5
DEFAULT_SEED = 20260818


class ScheduleError(Exception):
    pass


def _century(y):
    return y // 100


def build(passages, days, seed=DEFAULT_SEED, existing=None, from_day=0):
    by_id = {p['id']: p for p in passages}
    books = {p['book']['id'] for p in passages}
    if len(books) < PER_DAY:
        raise ScheduleError(f'need at least {PER_DAY} books, have {len(books)}')
    rng = random.Random(seed)
    out = [list(d) for d in (existing or [])[:from_day]]
    # last-seen day per book / passage, from the preserved prefix
    last_book, last_pass = {}, {}
    for di, d in enumerate(out):
        for pid in d:
            if pid in by_id:
                last_pass[pid] = di
                last_book[by_id[pid]['book']['id']] = di
    have_old = any(p['book']['year'] < 1800 for p in passages)
    for di in range(len(out), days):
        chosen, used_books, used_authors, cents = [], set(), set(), {}
        for slot in range(PER_DAY):
            best, best_score = None, None
            for p in passages:
                b = p['book']
                if b['id'] in used_books or b['author'] in used_authors:
                    continue
                gap_b = di - last_book.get(b['id'], -10_000)
                gap_p = di - last_pass.get(p['id'], -10_000)
                # Recency dominates: a book unseen one day longer beats any tie-break below.
                score = min(gap_b, 400) * 1000 + min(gap_p, 400) * 10 + rng.random()
                if cents.get(_century(b['year']), 0) >= 2:
                    score -= 20   # tie-break only: prefer century variety within a day
                if have_old and slot == PER_DAY - 1 and not any(by_id[c]['book']['year'] < 1800 for c in chosen) and b['year'] < 1800:
                    score += 30   # tie-break only: try to include one pre-1800 book
                if best_score is None or score > best_score:
                    best, best_score = p, score
            if best is None:
                raise ScheduleError(f'day {di}: could not fill slot {slot} (too few distinct authors?)')
            chosen.append(best['id'])
            used_books.add(best['book']['id'])
            used_authors.add(best['book']['author'])
            cents[_century(best['book']['year'])] = cents.get(_century(best['book']['year']), 0) + 1
            last_book[best['book']['id']] = di
            last_pass[best['id']] = di
        out.append(chosen)
    return out


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument('--days', type=int, default=400)
    ap.add_argument('--epoch', default=None, help='YYYY-MM-DD of day #1; default: existing file or today')
    ap.add_argument('--from-day', type=int, default=None, help='first day index to regenerate; default: tomorrow')
    ap.add_argument('--seed', type=int, default=DEFAULT_SEED)
    ap.add_argument('--out', default=OUT)
    args = ap.parse_args(argv)
    passages = canon.all_passages(canon.load_canon())
    existing, epoch = None, args.epoch
    if os.path.exists(args.out):
        with open(args.out, encoding='utf-8') as f:
            prev = json.load(f)
        existing, epoch = prev['days'], epoch or prev['epoch']
    epoch = epoch or datetime.date.today().isoformat()
    if args.from_day is None:
        today = (datetime.date.today() - datetime.date.fromisoformat(epoch)).days
        from_day = max(0, today + 1) if existing else 0
    else:
        from_day = args.from_day
    days = build(passages, args.days, seed=args.seed, existing=existing, from_day=from_day)
    with open(args.out, 'w', encoding='utf-8') as f:
        json.dump({'epoch': epoch, 'days': days}, f, indent=0)
        f.write('\n')
    print(f'wrote {len(days)} days to {args.out} (epoch {epoch}, regenerated from day {from_day})')
    return 0


if __name__ == '__main__':
    sys.exit(main())
