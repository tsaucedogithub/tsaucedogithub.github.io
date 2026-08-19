"""Build _data/blue_book_library.json: the search library behind the guess box.

Usage: python3 _tools/blue_book/build_library.py [--tally PATH] [--out PATH]

Sources: every book that made two or more of the lists (tally.tsv) plus the
hand-picked non-novel appendix (tally.SUGGESTED). The canon is a subset of
this library; the extra several hundred titles are what stops the guess box
from being brute-forced letter by letter while the canon is small.

Entries carry a title and an author and nothing else. The year is deliberately
absent: the library is for searching, not for scoring.
"""
import argparse, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import tally

TALLY = os.path.join(HERE, 'tally.tsv')
OUT = os.path.normpath(os.path.join(HERE, '..', '..', '_data', 'blue_book_library.json'))
MIN_LISTS = 2
ARTICLES = ('the ', 'a ', 'an ')
SERIES_SUFFIX = ' (series)'


def clean_title(title):
    title = (title or '').strip()
    if title.lower().endswith(SERIES_SUFFIX):
        title = title[:-len(SERIES_SUFFIX)].strip()
    return title


def sort_key(title):
    """Alphabetical by title, a leading article ignored, case and accents flattened."""
    t = tally.strip_accents(title).lower().strip()
    for a in ARTICLES:
        if t.startswith(a):
            return t[len(a):]
    return t


def read_tally(path=TALLY):
    """(title, author) for every tally row on at least MIN_LISTS lists."""
    rows = []
    with open(path, encoding='utf-8') as f:
        next(f, None)   # header
        for line in f:
            cols = line.rstrip('\n').split('\t')
            if len(cols) < 3 or not cols[0].isdigit() or int(cols[0]) < MIN_LISTS:
                continue
            rows.append((cols[1], cols[2]))
    return rows


def build(rows, suggested):
    """Merge tally rows and the SUGGESTED appendix into sorted, deduplicated entries."""
    entries, seen = [], set()
    for title, author in list(rows) + [(t, a) for _, t, a in suggested]:
        title, author = clean_title(title), (author or '').strip()
        if not title:
            continue
        key = (tally.norm_title(title), tally.norm_author(author))
        if key in seen:
            continue
        seen.add(key)
        entries.append({'title': title, 'author': author})
    entries.sort(key=lambda e: (sort_key(e['title']), e['author'].lower()))
    return entries


def write(entries, path):
    with open(path, 'w', encoding='utf-8') as f:
        f.write('[\n')
        f.write(',\n'.join(json.dumps(e, ensure_ascii=False) for e in entries))
        f.write('\n]\n')


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument('--tally', default=TALLY)
    ap.add_argument('--out', default=OUT)
    args = ap.parse_args(argv)
    entries = build(read_tally(args.tally), tally.SUGGESTED)
    write(entries, args.out)
    print(f'wrote {len(entries)} entries to {args.out}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
