"""Check every canon passage is verbatim from its Project Gutenberg edition.

Usage: python3 _tools/blue_book/verify_passages.py [--canon PATH] [--text-dir DIR] [--book ID]
Texts are downloaded once into _tools/blue_book/cache/ (gitignored). Books without a
`gutenberg` number are listed as UNVERIFIED (check them against a copy by hand).
Exit code 1 if any verifiable passage fails.
"""
import argparse, os, re, sys, unicodedata, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import canon

CACHE = os.path.join(HERE, 'cache')
URL = 'https://www.gutenberg.org/cache/epub/{id}/pg{id}.txt'
MIN_WORDS, MAX_WORDS = 40, 260

_TYPO = {
    '‘': "'",  # LEFT SINGLE QUOTATION MARK -> apostrophe
    '’': "'",  # RIGHT SINGLE QUOTATION MARK -> apostrophe
    '“': '"',  # LEFT DOUBLE QUOTATION MARK -> straight quote
    '”': '"',  # RIGHT DOUBLE QUOTATION MARK -> straight quote
    '—': '-',  # EM DASH -> hyphen
    '–': '-',  # EN DASH -> hyphen
    '…': '...',  # ELLIPSIS -> three dots
    ' ': ' ',  # NON-BREAKING SPACE -> space
}


def normalize(s):
    s = unicodedata.normalize('NFC', s)
    for k, v in _TYPO.items():
        s = s.replace(k, v)
    s = s.replace('--', '-')
    s = re.sub(r'(?<!\w)_|_(?!\w)', '', s)   # Gutenberg _italics_ markers
    s = re.sub(r'\s+', ' ', s)
    return s.strip()


def fetch_text(gid, text_dir=None):
    d = text_dir or CACHE
    os.makedirs(d, exist_ok=True)
    path = os.path.join(d, f'pg{gid}.txt')
    if not os.path.exists(path):
        req = urllib.request.Request(URL.format(id=gid), headers={'User-Agent': 'Mozilla/5.0 (blue-book verify)'})
        with urllib.request.urlopen(req, timeout=60) as r, open(path, 'wb') as f:
            f.write(r.read())
    with open(path, encoding='utf-8-sig') as f:
        return f.read()


def _longest_prefix(needle, hay):
    words = needle.split(' ')
    lo, hi = 0, len(words)
    while lo < hi:
        mid = (lo + hi + 1) // 2
        if ' '.join(words[:mid]) in hay:
            lo = mid
        else:
            hi = mid - 1
    return ' '.join(words[:lo])


def check_passage(pid, text, hay_norm):
    needle = normalize(text)
    n = len(needle.split())
    if needle in hay_norm:
        note = 'ok'
        if n < MIN_WORDS:
            note = f'ok, but short ({n} words)'
        elif n > MAX_WORDS:
            note = f'ok, but long ({n} words)'
        return (pid, True, note)
    pref = _longest_prefix(needle, hay_norm)
    return (pid, False, f'NOT FOUND. Matches through: {pref[-80:]!r}' if pref else 'NOT FOUND (no prefix matches)')


def check_book(book, text):
    hay = normalize(text)
    out = [check_passage(p['id'], p['text'], hay) for p in book['passages']]
    if 'famous' in book:
        out.append(check_passage(book['famous']['id'], book['famous']['text'], hay))
    return out


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument('--canon', default=None)
    ap.add_argument('--text-dir', default=None)
    ap.add_argument('--book', default=None, help='only this book id')
    args = ap.parse_args(argv)
    books = canon.load_canon(args.canon)
    failed, unverified = 0, []
    for b in books:
        if args.book and b['id'] != args.book:
            continue
        if not b.get('gutenberg'):
            unverified.append(b['id'])
            continue
        try:
            text = fetch_text(b['gutenberg'], args.text_dir)
        except Exception as e:  # network or missing fixture
            print(f"{b['id']}: could not load text ({e})")
            failed += 1
            continue
        for pid, ok, note in check_book(b, text):
            print(f"{'PASS' if ok else 'FAIL'}  {pid:40} {note}")
            failed += 0 if ok else 1
    if unverified:
        print('\nUNVERIFIED (no gutenberg id, check by hand): ' + ', '.join(unverified))
    print(f'\n{failed} failure(s)')
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
