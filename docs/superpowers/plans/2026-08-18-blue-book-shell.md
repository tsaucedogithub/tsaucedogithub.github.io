# Blue Book Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A playable Blue Book page on tristansaucedo.com seeded with ten classics, where adding a book to `_data/blue_book.yml` is the only step needed to grow the game.

**Architecture:** Fully static Jekyll page. The canon lives in one hand-edited YAML file; a generated JSON schedule maps day N to five passage ids. Liquid embeds both as JSON blobs; a dependency-free pure-logic module (`blue-book-core.js`, testable in Node) does scoring, day math, search, and share text; a thin DOM module (`blue-book.js`) drives the round → reveal → results flow and localStorage. Two Python tools verify passages against Project Gutenberg and build the schedule.

**Tech Stack:** Jekyll (GitHub Pages), Liquid, vanilla JS (no build step, no dependencies), CSS using the site's existing tokens, Python 3.12 (stdlib only; YAML loaded through a Ruby one-liner fallback because PyYAML is not installed), `node --test` for JS tests, `unittest` for Python tests.

**Spec:** `docs/superpowers/specs/2026-08-18-blue-book-design.md`

## Global Constraints

- Repo: `/Users/TristanSaucedo/Developer/tsaucedogithub.github.io` (Jekyll site; `main` push = deploy). **Never push. Never `git commit`, `git reset`, `git stash`, or `git checkout --`.** All tasks leave changes uncommitted; the lead commits once at the end.
- No build step and no dependencies for the site: plain JS files under `assets/js/`, plain CSS under `assets/css/`. Follow `assets/js/essays.js` conventions (IIFE, `var`, `document.getElementById`, no frameworks). No external network requests from the page.
- Tools are stdlib-only Python 3 in `_tools/blue_book/` (already excluded from the Jekyll build). Node 20 is available for JS tests. `bundle exec jekyll build` works and takes ~1s.
- Scoring, verbatim from the spec: each round is worth 1,000: **600 for the book, 400 for the year. Every hint and every wrong guess costs 100 off the round. Floor at 0.** Year: full 400 inside the book's `window`; outside it, linear decay to zero over `D = max(50, 2 × window)` years past the window: `excess = max(0, |guess − year| − window)`, `points = 400 × max(0, 1 − excess / D)`. Three guesses per round. Three hints per round: era, author clue, famous passage.
- Share text, verbatim from the spec (📗 ≥ 800, 📙 400–799, 📕 below):
  ```
  Blue Book #12 · 3,860 / 5,000
  📗 📗 📙 📕 📗 · 🔥 6
  tristansaucedo.com/blue-book
  ```
- Copy rule: any prose Claude writes for the site (UI labels, significance blurbs, help text) must not contain em dashes or en dashes. Use commas, periods, colons. Quoted passages are verbatim and exempt.
- Style: use the site's tokens `--color-primary` (navy), `--color-accent` (cream), `--color-bg`, `--color-ink`, `--color-link`; the site sets `html { font-size: 62.5% }` so `1rem = 10px`; body font is Satoshi (already loaded by the layout). Mobile first: the game is played on phones.
- Test commands: `python3 -m unittest discover -s _tools/blue_book/tests -p 'test_*.py'`; `node --test _tools/blue_book/tests/`; `node --check assets/js/blue-book.js assets/js/blue-book-core.js`; `bundle exec jekyll build`.
- Passage text is verbatim from the named Project Gutenberg edition. Never type a passage from memory: extract it from the downloaded text.

---

## File structure

| Path | Responsibility |
|---|---|
| `_data/blue_book.yml` | **The canon.** Hand-edited list of books, each with metadata, main passages, and a famous passage. Adding a book = adding an entry here (then re-running the two tools). |
| `_data/blue_book_schedule.json` | Generated. `{"epoch": "YYYY-MM-DD", "days": [[5 passage ids], ...]}`. |
| `_tools/blue_book/canon.py` | Loads and validates the canon YAML into plain dicts; assigns default passage ids. Shared by the two tools. |
| `_tools/blue_book/verify_passages.py` | Downloads Gutenberg texts (cached in `_tools/blue_book/cache/`, gitignored) and checks every passage is an exact substring after normalization. Reports unverifiable books. |
| `_tools/blue_book/build_schedule.py` | Deterministic schedule generator with spacing constraints; preserves past days on regeneration. |
| `_tools/blue_book/tests/test_canon.py`, `test_verify.py`, `test_schedule.py` | Python unit tests (offline, fixtures under `_tools/blue_book/tests/fixtures/`). |
| `assets/js/blue-book-core.js` | Pure logic, no DOM: day index, year points, round score, era band, year labels, slider mapping, book search, rounds-for-day, share text, tiers. Exposes `window.BlueBookCore` in the browser and `module.exports` in Node. |
| `_tools/blue_book/tests/core.test.js` | `node --test` tests for the core module. |
| `assets/js/blue-book.js` | DOM + state machine + localStorage. Reads the JSON blobs, uses `BlueBookCore`. |
| `assets/css/blue-book.css` | All Blue Book styles, prefixed `bb-`. |
| `blue-book.md` | The page: front matter, intro copy, HTML skeleton, JSON blobs, script tag. |
| `_layouts/default.html` | One addition: optional `page.stylesheet` link in `<head>`. |
| `.gitignore` | Add `_tools/blue_book/cache/`. |

## Canon schema (`_data/blue_book.yml`)

```yaml
# Blue Book canon. One entry per book. To add a book: append an entry, then run
#   python3 _tools/blue_book/verify_passages.py      (checks passages against Gutenberg)
#   python3 _tools/blue_book/build_schedule.py       (extends the daily schedule)
# Field notes:
#   year        single integer, negative for BCE (Odyssey: -700)
#   window      years either side of `year` that still earn full year points (default 2)
#   year_label  optional display override ("c. 725 BCE"); default is derived from year
#   era         optional {from, to} override for the era hint band; default is the century block
#   form        novel | play | epic | philosophy | nonfiction | stories
#   clue        the author-clue hint text ("Russian novelist")
#   aliases     extra strings the search box should match
#   gutenberg   Project Gutenberg ebook number; enables automated verification. Omit for
#               books not on Gutenberg (they are reported as unverified).
#   passages    the main passages, in play rotation. Each needs text, locus, difficulty (1-3);
#               significance is optional (2-3 sentences, shown on the reveal). id is optional
#               and defaults to <book id>-<1-based position>.
#   famous      the most recognisable passage, only ever shown as a hint (id <book id>-famous)
- id: great-gatsby
  title: The Great Gatsby
  author: F. Scott Fitzgerald
  year: 1925
  window: 2
  form: novel
  clue: American novelist
  aliases: [Gatsby]
  gutenberg: 64317
  passages:
    - locus: Chapter 6
      difficulty: 2
      text: >-
        “I wouldn’t ask too much of her,” I ventured. “You can’t repeat the past.”
        ...
      significance: >-
        ...
    - locus: Chapter 9
      difficulty: 2
      text: >-
        They were careless people, Tom and Daisy...
  famous:
    locus: Chapter 9
    text: >-
      Gatsby believed in the green light...
```

Passage text is stored as a single string; paragraph breaks are `\n\n` (in `>-` block scalars, leave TWO blank lines between paragraphs: folded YAML turns two blank lines into a paragraph break and one blank line into a bare newline). Dialogue dashes and curly quotes are kept as in the source. Gutenberg's `_underscore_` italics markers are removed.

## Seed books and passage anchors (Task 2 uses this table)

All ten are on Project Gutenberg. Text URL: `https://www.gutenberg.org/cache/epub/<id>/pg<id>.txt` (UTF-8). "Start" and "End" are the first and last words of the passage as they appear in that edition (verified present 2026-08-18). Take the text from Start through End inclusive, at sentence boundaries, keeping paragraph breaks.

| Book (id) | Author · year · window · clue | PG id | Passage | Locus | Start → End |
|---|---|---|---|---|---|
| The Great Gatsby (`great-gatsby`) | F. Scott Fitzgerald · 1925 · 2 · American novelist | 64317 | main 1 (diff 2) | Chapter 6 | `“I wouldn’t ask too much of her,” I ventured.` → `he could find out what that thing was. . . .` |
| | | | main 2 (diff 2) | Chapter 9 | `They were careless people, Tom and Daisy` → `let other people clean up the mess they had made. . . .` |
| | | | famous | Chapter 9 | `Gatsby believed in the green light` → `borne back ceaselessly into the past.` |
| Wuthering Heights (`wuthering-heights`) | Emily Brontë · 1847 · 2 · English novelist | 768 | main 1 (diff 3) | Chapter 16 | `“Catherine Earnshaw, may you not rest as long as I am living!` → `I cannot live without my soul!”` |
| | | | main 2 (diff 2) | Chapter 34 | `I sought, and soon discovered, the three headstones` → `unquiet slumbers for the sleepers in that quiet earth.` |
| | | | famous | Chapter 9 | `My love for Linton is like the foliage in the woods` → `but as my own being.` (contains `Nelly, I am Heathcliff!`; the source prints `_am_`) |
| Ulysses (`ulysses`) | James Joyce · 1922 · 2 · Irish novelist | 4300 | main 1 (diff 3) | Episode 3, Proteus | `Ineluctable modality of the visible: at least that if no more` → `Shut your eyes and see.` (first occurrence, line ~1874 of the file) |
| | | | main 2 (diff 3) | Episode 2, Nestor | `—History, Stephen said, is a nightmare` → `—A shout in the street, Stephen answered, shrugging his shoulders.` |
| | | | famous | Episode 18, Penelope | `and I thought well as well him as another` → `yes I said yes I will Yes.` |
| Pride and Prejudice (`pride-and-prejudice`) | Jane Austen · 1813 · 2 · English novelist | 1342 | main 1 (diff 2) | Chapter 34 | `“In vain have I struggled. It will not do.` → `was very unlikely to recommend his suit.` |
| | | | main 2 (diff 3) | Chapter 36 | `“How despicably have I acted!” she cried` → `Till this moment, I never knew myself.”` |
| | | | famous | Chapter 1 | `It is a truth universally acknowledged` → `the rightful property of some one or other of their daughters.` |
| Jane Eyre (`jane-eyre`) | Charlotte Brontë · 1847 · 2 · English novelist | 1260 | main 1 (diff 2) | Chapter 23 | `“I tell you I must go!” I retorted` → `equal,—as we are!”` |
| | | | main 2 (diff 3) | Chapter 27 | `Still indomitable was the reply—“I care for myself.` → `what would be their worth?` (source prints `“_I_ care`) |
| | | | famous | Chapter 38 | `Reader, I married him.` → `“Mary, I have been married to Mr. Rochester this morning.”` |
| Moby-Dick (`moby-dick`) | Herman Melville · 1851 · 2 · American novelist | 2701 | main 1 (diff 3) | Chapter 36, The Quarter-Deck | `“Hark ye yet again—the little lower layer.` → `I’d strike the sun if it insulted me.` |
| | | | main 2 (diff 2) | Chapter 135, The Chase, Third Day | `“Oh, lonely death on lonely life!` → `Thus, I give up the spear!”` |
| | | | famous | Chapter 1, Loomings | `Call me Ishmael.` → `cherish very nearly the same feelings towards the ocean with me.` |
| Frankenstein (`frankenstein`) | Mary Shelley · 1818 · 2 · English novelist | 84 | main 1 (diff 2) | Chapter 10 | `“I expected this reception,” said the dæmon.` → `Make me happy, and I shall again be virtuous.”` |
| | | | main 2 (diff 3) | Chapter 20 | `“Slave, I before reasoned with you` → `I shall be with you on your wedding-night.”` |
| | | | famous | Chapter 5 | `It was on a dreary night of November` → `and a convulsive motion agitated its limbs.` |
| Don Quixote (`don-quixote`) | Miguel de Cervantes · 1605 · 10 · Spanish novelist; aliases `[Quixote, Quijote, Don Quijote]`; year_label `1605` | 996 (Ormsby translation) | main 1 (diff 2) | Part 1, Chapter 1 | `In a village of La Mancha, the name of which I have no desire to call to mind` → `not to stray a hair’s breadth from the truth in the telling of it.` |
| | | | main 2 (diff 3) | Part 2, Chapter 74 | `Good news for you, good sirs, that I am no longer Don Quixote of La Mancha` → `I loathe them.` |
| | | | famous | Part 1, Chapter 8 | `“Fortune is arranging matters for us better than we could have shaped our desires ourselves` → `the sails that turned by the wind make the millstone go.”` |
| Great Expectations (`great-expectations`) | Charles Dickens · 1861 · 2 · English novelist | 1400 | main 1 (diff 2) | Chapter 8 | `She was dressed in rich materials` → `no brightness left but the brightness of her sunken eyes.` |
| | | | main 2 (diff 3) | Chapter 39 | `“Yes, Pip, dear boy, I’ve made a gentleman on you!` → `and, Pip, you’re him!”` |
| | | | famous | Chapter 1 | `My father’s family name being Pirrip` → `and came to be called Pip.` |
| Crime and Punishment (`crime-and-punishment`) | Fyodor Dostoevsky · 1866 · 2 · Russian novelist; aliases `[Crime & Punishment, Dostoyevsky]` | 2554 (Garnett translation) | main 1 (diff 3) | Part 3, Chapter 5 | `In short, I maintain that all great men or even men a little out of the common` → `men who have the gift or the talent to utter a new word.` |
| | | | main 2 (diff 3) | Epilogue, Chapter 2 | `He did not know that the new life would not be given him for nothing` → `but our present story is ended.` |
| | | | famous | Part 5, Chapter 4 | `“Go at once, this very minute, stand at the cross-roads` → `gazing at him with eyes full of fire.` |

If an anchor phrase turns out to be off by a word in the edition, adjust to the nearest sentence boundary and note it in the task report. Do not substitute a different passage.

Why these ten and not the literal top ten of `candidates.md`: 1984, The Catcher in the Rye, Catch-22, Brave New World, and One Hundred Years of Solitude are not on Gutenberg, so their passages could not be machine-verified for the seed. Moby-Dick, Frankenstein, Don Quixote, Great Expectations, and Crime and Punishment (all top-20) stand in. The five deferred books go in during the batch phase with copy-checked passages.

---

### Task 1: Canon loader and passage verifier

**Files:**
- Create: `_tools/blue_book/canon.py`
- Create: `_tools/blue_book/verify_passages.py`
- Create: `_tools/blue_book/tests/__init__.py` (empty)
- Create: `_tools/blue_book/tests/test_canon.py`
- Create: `_tools/blue_book/tests/test_verify.py`
- Create: `_tools/blue_book/tests/fixtures/canon_small.yml`
- Create: `_tools/blue_book/tests/fixtures/pg99999.txt`
- Modify: `.gitignore` (append `_tools/blue_book/cache/`)

**Interfaces:**
- Produces: `canon.load_canon(path=None) -> list[dict]` (books; every passage dict gains `id`; `famous` gains `id`), `canon.MAIN_DEFAULTS`, `canon.CanonError`; `verify_passages.normalize(text) -> str`; `verify_passages.check_book(book, text) -> list[tuple[str, bool, str]]` (passage id, ok, note); `verify_passages.main(argv) -> int` exit code.

- [ ] **Step 1: Write the failing canon tests**

`_tools/blue_book/tests/fixtures/canon_small.yml`:
```yaml
- id: sample-book
  title: Sample Book
  author: Some Author
  year: -700
  window: 150
  form: epic
  clue: Greek poet
  gutenberg: 99999
  passages:
    - locus: Book 1
      difficulty: 2
      text: >-
        Sing to me of the man, Muse, the man of twists and turns
        driven time and again off course.
    - id: custom-id
      locus: Book 11
      difficulty: 3
      text: >-
        And I saw the mighty Heracles, or his phantom.
  famous:
    locus: Book 1
    text: >-
      Tell me about a complicated man.
- id: no-gutenberg
  title: Modern Book
  author: Living Author
  year: 1961
  form: novel
  clue: American novelist
  passages:
    - locus: Chapter 1
      difficulty: 1
      text: It was love at first sight.
```

`_tools/blue_book/tests/test_canon.py`:
```python
import os, sys, unittest
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

if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 2: Run the canon tests to see them fail**

Run: `python3 -m unittest _tools/blue_book/tests/test_canon.py -v` (from the repo root; if the dotted path is awkward use `python3 -m unittest discover -s _tools/blue_book/tests -p 'test_canon.py' -v`)
Expected: FAIL / ImportError (`canon` does not exist).

- [ ] **Step 3: Implement `canon.py`**

```python
"""Load and validate the Blue Book canon (_data/blue_book.yml).

PyYAML is not installed on this machine and the site must stay dependency-free,
so YAML is parsed by PyYAML if present, else by a Ruby one-liner (Ruby ships
with the Jekyll toolchain). Returns plain dicts.
"""
import json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_PATH = os.path.normpath(os.path.join(HERE, '..', '..', '_data', 'blue_book.yml'))
REQUIRED_BOOK = ('id', 'title', 'author', 'year', 'passages')
REQUIRED_PASSAGE = ('text', 'locus', 'difficulty')
MAIN_DEFAULTS = {'window': 2, 'form': 'novel', 'aliases': []}


class CanonError(Exception):
    pass


def _load_yaml(path):
    try:
        import yaml  # type: ignore
        with open(path, encoding='utf-8') as f:
            return yaml.safe_load(f)
    except ImportError:
        code = "require 'yaml'; require 'json'; puts JSON.generate(YAML.safe_load(File.read(ARGV[0]), permitted_classes: [], aliases: false))"
        out = subprocess.run(['ruby', '-e', code, path], capture_output=True, text=True)
        if out.returncode != 0:
            raise CanonError('ruby yaml load failed: ' + out.stderr.strip())
        return json.loads(out.stdout)


def validate(books):
    if not isinstance(books, list):
        raise CanonError('canon must be a list of books')
    seen = set()
    for b in books:
        for k in REQUIRED_BOOK:
            if k not in b:
                raise CanonError(f"book {b.get('id', '?')!r} missing {k!r}")
        if b['id'] in seen:
            raise CanonError(f"duplicate book id {b['id']!r}")
        seen.add(b['id'])
        if not isinstance(b['year'], int):
            raise CanonError(f"book {b['id']!r}: year must be an integer")
        if not b['passages']:
            raise CanonError(f"book {b['id']!r}: needs at least one passage")
        for p in b['passages']:
            for k in REQUIRED_PASSAGE:
                if k not in p:
                    raise CanonError(f"book {b['id']!r}: passage missing {k!r}")
        if 'famous' in b and 'text' not in b['famous']:
            raise CanonError(f"book {b['id']!r}: famous needs text")
    return books


def apply_defaults(books):
    pids = set()
    for b in books:
        for k, v in MAIN_DEFAULTS.items():
            b.setdefault(k, list(v) if isinstance(v, list) else v)
        for i, p in enumerate(b['passages'], 1):
            p.setdefault('id', f"{b['id']}-{i}")
            if p['id'] in pids:
                raise CanonError(f"duplicate passage id {p['id']!r}")
            pids.add(p['id'])
        if 'famous' in b:
            b['famous'].setdefault('id', f"{b['id']}-famous")
    return books


def load_canon(path=None):
    return apply_defaults(validate(_load_yaml(path or DEFAULT_PATH)))


def all_passages(books):
    """Main passages only (the ones the schedule rotates), each with a 'book' back-reference."""
    out = []
    for b in books:
        for p in b['passages']:
            q = dict(p)
            q['book'] = b
            out.append(q)
    return out
```

- [ ] **Step 4: Run the canon tests, confirm they pass**

Run: `python3 -m unittest discover -s _tools/blue_book/tests -p 'test_canon.py' -v`
Expected: 5 tests PASS.

- [ ] **Step 5: Write the failing verifier tests**

`_tools/blue_book/tests/fixtures/pg99999.txt` (a fake Gutenberg file; note the underscore italics and curly quotes):
```
The Project Gutenberg eBook of Sample Book

Title: Sample Book

*** START OF THE PROJECT GUTENBERG EBOOK SAMPLE BOOK ***

BOOK 1

Sing to me of the man, Muse, the man of twists and turns
driven time and again off course. “Tell me about a
complicated man.” She said nothing more.

BOOK 11

And I saw the mighty _Heracles_, or his phantom.

*** END OF THE PROJECT GUTENBERG EBOOK SAMPLE BOOK ***
```

`_tools/blue_book/tests/test_verify.py`:
```python
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
```

- [ ] **Step 6: Run the verifier tests to see them fail**

Run: `python3 -m unittest discover -s _tools/blue_book/tests -p 'test_verify.py' -v`
Expected: ImportError on `verify_passages`.

- [ ] **Step 7: Implement `verify_passages.py`**

```python
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

_TYPO = {'‘': "'", '’': "'", '“': '"', '”': '"', '—': '-', '–': '-', '…': '...', ' ': ' '}


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
```

- [ ] **Step 8: Run all Python tests, confirm they pass**

Run: `python3 -m unittest discover -s _tools/blue_book/tests -p 'test_*.py' -v`
Expected: all PASS (canon 5, verify 6).

- [ ] **Step 9: Add the cache dir to `.gitignore`**

Append to `.gitignore`:
```
# Blue Book: downloaded Gutenberg texts used by _tools/blue_book/verify_passages.py
_tools/blue_book/cache/
```

---

### Task 2: Seed the canon with ten books

**Files:**
- Create: `_data/blue_book.yml`

**Interfaces:**
- Consumes: `python3 _tools/blue_book/verify_passages.py` (Task 1).
- Produces: `_data/blue_book.yml` with the ten books from the seed table, valid against `canon.load_canon`, all 30 passages PASS in the verifier.

- [ ] **Step 1: Download the ten Gutenberg texts into the cache**

Run from repo root:
```bash
mkdir -p _tools/blue_book/cache && for id in 64317 768 4300 1342 1260 2701 84 996 1400 2554; do [ -s _tools/blue_book/cache/pg$id.txt ] || curl -sL -A "Mozilla/5.0" -o _tools/blue_book/cache/pg$id.txt "https://www.gutenberg.org/cache/epub/$id/pg$id.txt"; done; wc -c _tools/blue_book/cache/pg*.txt
```
Expected: ten files, 300 KB to 2.4 MB each.

- [ ] **Step 2: Write an extraction helper (throwaway, in the scratchpad, not the repo)**

Write `extract.py` in your scratchpad directory. It takes a Gutenberg file, a start phrase and an end phrase, finds the first occurrence of the start (after `*** START OF`), the first occurrence of the end after it, and prints the slice with: `_` italics markers removed, hard line-wraps inside paragraphs joined with a single space, blank lines preserved as paragraph breaks, and leading/trailing whitespace trimmed. Match start/end phrases through `verify_passages.normalize` so curly quotes and italics markers in the file don't matter. Print the word count.

```python
import re, sys
sys.path.insert(0, '/Users/TristanSaucedo/Developer/tsaucedogithub.github.io/_tools/blue_book')
from verify_passages import normalize

def extract(path, start, end):
    raw = open(path, encoding='utf-8-sig').read()
    body = raw[raw.find('*** START OF'):]
    # map normalized positions back to raw: build a normalized string with an index map
    norm_chars, idx = [], []
    for i, ch in enumerate(body):
        n = normalize(ch) if ch != ' ' else ' '
        # normalize() on a single char returns '' for underscores and stripped whitespace; keep spaces
        if ch.isspace():
            if norm_chars and norm_chars[-1] != ' ':
                norm_chars.append(' '); idx.append(i)
            continue
        if n == '':
            continue
        for c in n:
            norm_chars.append(c); idx.append(i)
    normtext = ''.join(norm_chars)
    s = normtext.find(normalize(start))
    assert s >= 0, 'start not found'
    e = normtext.find(normalize(end), s)
    assert e >= 0, 'end not found'
    e_end = e + len(normalize(end))
    raw_slice = body[idx[s]: idx[e_end - 1] + 1]
    paras = [re.sub(r'\s*\n\s*', ' ', p).strip() for p in re.split(r'\n\s*\n', raw_slice)]
    text = '\n\n'.join(p for p in paras if p)
    text = re.sub(r'(?<!\w)_|_(?!\w)', '', text)
    return text

if __name__ == '__main__':
    t = extract(sys.argv[1], sys.argv[2], sys.argv[3])
    print(t); print('\n[%d words]' % len(t.split()))
```
Test it on Gatsby main 1 and confirm the printed passage starts and ends with the anchors and reads cleanly. Fix the helper if it does not.

- [ ] **Step 3: Extract all 30 passages and write `_data/blue_book.yml`**

For every row of the seed table, run the helper and paste the output into the YAML using `>-` block scalars (indent the text two spaces deeper than the key; keep a blank line between paragraphs). Fill in every field from the table (`id`, `title`, `author`, `year`, `window`, `form: novel`, `clue`, `aliases` where given, `gutenberg`, `passages` with `locus` and `difficulty`, `famous` with `locus`). Put the schema comment block from the plan's "Canon schema" section at the top of the file. Order the books as in the table.

For each main passage also write a `significance` blurb: two or three plain sentences saying what is happening and why the moment matters to the book (turning point, thesis, character revealed). No em or en dashes. Neutral, specific, no hedging. Example for Gatsby main 1: `Nick has just told Gatsby he cannot repeat the past, and Gatsby refuses to accept it. The line states the novel's central delusion outright: that money and will can restore what is gone. Everything that follows is that refusal playing out.`

- [ ] **Step 4: Verify every passage**

Run: `python3 _tools/blue_book/verify_passages.py`
Expected: 30 lines of `PASS`, `0 failure(s)`, exit code 0, no UNVERIFIED line. Any `FAIL` means the YAML text drifted from the source (a re-typed quote mark, a dropped word); fix by re-extracting, not by editing the words. Any `ok, but short` note is fine for the two passages that are naturally under 40 words if there are any; note them in your report.

- [ ] **Step 5: Confirm the YAML loads through Jekyll**

Run: `bundle exec jekyll build 2>&1 | tail -3` then `ruby -ryaml -e 'b = YAML.safe_load(File.read("_data/blue_book.yml")); puts b.size; puts b.map { |x| x["passages"].size }.sum'`
Expected: build ok; prints `10` and `20`.

---

### Task 3: Schedule builder

**Files:**
- Create: `_tools/blue_book/build_schedule.py`
- Create: `_tools/blue_book/tests/test_schedule.py`
- Create: `_data/blue_book_schedule.json` (generated)

**Interfaces:**
- Consumes: `canon.load_canon`, `canon.all_passages` (Task 1); `_data/blue_book.yml` (Task 2).
- Produces: `build_schedule.build(passages, days, seed=20260818, existing=None, from_day=0) -> list[list[str]]`; CLI writes `{"epoch": "YYYY-MM-DD", "days": [...]}`; JS (Task 4) reads exactly that shape.

- [ ] **Step 1: Write the failing schedule tests**

`_tools/blue_book/tests/test_schedule.py`:
```python
import os, sys, unittest
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import build_schedule as bs

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

if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 2: Run to see them fail**

Run: `python3 -m unittest discover -s _tools/blue_book/tests -p 'test_schedule.py' -v`
Expected: ImportError.

- [ ] **Step 3: Implement `build_schedule.py`**

```python
"""Build _data/blue_book_schedule.json: day N -> five passage ids.

Usage: python3 _tools/blue_book/build_schedule.py [--days 400] [--epoch YYYY-MM-DD] [--from-day N] [--seed N]
Deterministic for a given canon + seed. When the schedule file already exists, days
before --from-day (default: tomorrow, computed from the epoch) are kept verbatim so
past puzzles never change; everything from --from-day on is regenerated, which is how
newly added books enter the rotation.

Hard constraints per day: five distinct passages, distinct books, distinct authors.
Soft: prefer books and passages that have not appeared for the longest time, at most
two books from the same century, at least one pre-1800 book when the canon has any.
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
                score = min(gap_b, 400) * 3 + min(gap_p, 400) + rng.random()
                if cents.get(_century(b['year']), 0) >= 2:
                    score -= 50
                if have_old and slot == PER_DAY - 1 and not any(by_id[c]['book']['year'] < 1800 for c in chosen) and b['year'] < 1800:
                    score += 100
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
```

- [ ] **Step 4: Run the tests, confirm they pass**

Run: `python3 -m unittest discover -s _tools/blue_book/tests -p 'test_*.py' -v`
Expected: all PASS. If `test_spacing_no_book_on_consecutive_days_when_ten_books` fails, the greedy scoring is not weighting `gap_b` enough; increase the multiplier (it must stay deterministic).

- [ ] **Step 5: Generate the real schedule**

Run: `python3 _tools/blue_book/build_schedule.py --epoch 2026-08-18 --days 400` then `python3 -c "import json; d=json.load(open('_data/blue_book_schedule.json')); print(d['epoch'], len(d['days']), d['days'][:3])"`
Expected: `2026-08-18 400 [[...5 ids...], ...]`, and no book id prefix repeated within a day.

---

### Task 4: Core logic module (`blue-book-core.js`) with Node tests

**Files:**
- Create: `assets/js/blue-book-core.js`
- Create: `_tools/blue_book/tests/core.test.js`

**Interfaces:**
- Produces `BlueBookCore` with exactly these functions (Task 5–7 call them by these names):
  - `dayIndex(date, epochISO)` → integer days between the local calendar date of `date` and `epochISO` (`"2026-08-18"`); day #1 displays as `dayIndex + 1`.
  - `yearLabel(year)` → `"1848"` or `"725 BCE"`; `yearRangeLabel(from, to)` → `"between 1900 and 1999"` / `"between 800 and 701 BCE"`.
  - `eraBand(book)` → `{from, to}`: `book.era` if present, else the century block `[floor(year/100)*100, +99]`.
  - `yearPoints(guess, book)` → 0..400 integer (spec formula; `window` default 2).
  - `roundScore({correct, wrongGuesses, hintsUsed, yearPts})` → `{book, year, penalty, total}` with `book = correct ? 600 : 0`, `penalty = 100 * (wrongGuesses + hintsUsed)`, `total = max(0, book + year - penalty)`.
  - `tier(points)` → `'high' | 'mid' | 'low'` (≥800, ≥400, else) and `tierEmoji(points)` → 📗/📙/📕.
  - `sliderRange(books)` → `{min, max, pivot: 1500}` where `min = Math.min(-800, floor((minYear - 100)/100)*100)`, `max = 2025`.
  - `sliderToYear(pos, range)` / `yearToSlider(year, range)`: pos is 0..1000; 0..250 maps linearly to `[min, pivot]`, 250..1000 maps linearly to `[pivot, max]`; both round to integers.
  - `normalize(str)` → lowercase, diacritics stripped, punctuation removed, whitespace collapsed.
  - `searchBooks(books, query, limit=8)` → array of books ranked: title prefix match, then alias/author prefix, then substring anywhere; empty query → `[]`.
  - `passageIndex(books)` → `{ [passageId]: {book, passage, isFamous} }` for main and famous passages.
  - `roundsForDay(schedule, books, dayIdx)` → array of 5 `{book, passage}`; uses `schedule.days[dayIdx % days.length]`; skips ids not in the index and tops up deterministically from `passageIndex` main passages (sorted by id, offset by dayIdx) so it always returns 5 when the canon has ≥5 books.
  - `shareText({dayNumber, total, roundTotals, streak, url})` → the exact three-line format from Global Constraints (`3,860` uses a thousands comma; total is `/ 5,000`).
  - `formatPoints(n)` → `"3,860"`.
- Module wrapper: `(function (root, factory) { var api = factory(); if (typeof module === 'object' && module.exports) module.exports = api; else root.BlueBookCore = api; })(this, function () { ... return { ...all functions... }; });`

- [ ] **Step 1: Write the failing tests**

`_tools/blue_book/tests/core.test.js`:
```js
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../../../assets/js/blue-book-core.js');

const gatsby = { id: 'great-gatsby', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', year: 1925, window: 2, aliases: ['Gatsby'],
  passages: [{ id: 'great-gatsby-1', text: 'a', locus: 'Ch 6' }, { id: 'great-gatsby-2', text: 'b', locus: 'Ch 9' }], famous: { id: 'great-gatsby-famous', text: 'c' } };
const manifesto = { id: 'manifesto', title: 'The Communist Manifesto', author: 'Karl Marx', year: 1848, window: 2, passages: [{ id: 'manifesto-1', text: 'x', locus: 'I' }] };
const odyssey = { id: 'odyssey', title: 'The Odyssey', author: 'Homer', year: -700, window: 150, era: { from: -800, to: -600 }, passages: [{ id: 'odyssey-1', text: 'y', locus: 'Book 1' }] };
const hamlet = { id: 'hamlet', title: 'Hamlet', author: 'William Shakespeare', year: 1600, window: 5, passages: [{ id: 'hamlet-1', text: 'z', locus: 'III.i' }] };
const beowulf = { id: 'beowulf', title: 'Beowulf', author: '', year: 900, window: 200, passages: [{ id: 'beowulf-1', text: 'w', locus: '' }] };
const books = [gatsby, manifesto, odyssey, hamlet, beowulf];

test('dayIndex counts local calendar days since the epoch', () => {
  assert.equal(C.dayIndex(new Date(2026, 7, 18, 0, 5), '2026-08-18'), 0);
  assert.equal(C.dayIndex(new Date(2026, 7, 18, 23, 59), '2026-08-18'), 0);
  assert.equal(C.dayIndex(new Date(2026, 7, 19, 0, 0), '2026-08-18'), 1);
  assert.equal(C.dayIndex(new Date(2026, 8, 17, 12, 0), '2026-08-18'), 30);
});

test('year labels', () => {
  assert.equal(C.yearLabel(1848), '1848');
  assert.equal(C.yearLabel(-725), '725 BCE');
  assert.equal(C.yearRangeLabel(1900, 1999), 'between 1900 and 1999');
  assert.equal(C.yearRangeLabel(-800, -701), 'between 800 and 701 BCE');
});

test('eraBand defaults to the century block, honours override', () => {
  assert.deepEqual(C.eraBand(gatsby), { from: 1900, to: 1999 });
  assert.deepEqual(C.eraBand(hamlet), { from: 1600, to: 1699 });
  assert.deepEqual(C.eraBand(odyssey), { from: -800, to: -600 });
  assert.deepEqual(C.eraBand({ year: -750, passages: [] }), { from: -800, to: -701 });
});

test('yearPoints follows the spec table', () => {
  assert.equal(C.yearPoints(1848, manifesto), 400);
  assert.equal(C.yearPoints(1850, manifesto), 400);
  assert.equal(C.yearPoints(1870, manifesto), 240);
  assert.equal(C.yearPoints(1880, manifesto), 160);
  assert.equal(C.yearPoints(1900, manifesto), 0);
  assert.equal(C.yearPoints(-530, odyssey), 373);
  assert.equal(C.yearPoints(-400, odyssey), 200);
  assert.equal(C.yearPoints(1620, hamlet), 280);
  assert.equal(C.yearPoints(1200, beowulf), 300);
  assert.equal(C.yearPoints(1930, { year: 1925 }), 376); // default window 2: excess 3, D 50
});

test('yearPoints returns integers', () => {
  for (const g of [1700, 1848, 1875, 1899, 2025, -3000]) assert.equal(Number.isInteger(C.yearPoints(g, manifesto)), true);
});

test('roundScore applies penalties and floors at zero', () => {
  assert.deepEqual(C.roundScore({ correct: true, wrongGuesses: 0, hintsUsed: 0, yearPts: 400 }), { book: 600, year: 400, penalty: 0, total: 1000 });
  assert.deepEqual(C.roundScore({ correct: true, wrongGuesses: 2, hintsUsed: 3, yearPts: 0 }), { book: 600, year: 0, penalty: 500, total: 100 });
  assert.deepEqual(C.roundScore({ correct: false, wrongGuesses: 3, hintsUsed: 3, yearPts: 200 }), { book: 0, year: 200, penalty: 600, total: 0 });
});

test('tiers', () => {
  assert.equal(C.tier(800), 'high'); assert.equal(C.tier(799), 'mid'); assert.equal(C.tier(400), 'mid'); assert.equal(C.tier(399), 'low');
  assert.equal(C.tierEmoji(1000), '📗'); assert.equal(C.tierEmoji(500), '📙'); assert.equal(C.tierEmoji(0), '📕');
});

test('slider mapping is monotonic, hits the pivot at 250, and round-trips', () => {
  const r = C.sliderRange(books);
  assert.deepEqual(r, { min: -800, max: 2025, pivot: 1500 });
  assert.deepEqual(C.sliderRange([{ year: -2100, passages: [] }]), { min: -2200, max: 2025, pivot: 1500 });
  assert.equal(C.sliderToYear(0, r), -800);
  assert.equal(C.sliderToYear(250, r), 1500);
  assert.equal(C.sliderToYear(1000, r), 2025);
  assert.equal(C.yearToSlider(1500, r), 250);
  for (const y of [-800, -700, 0, 1400, 1500, 1848, 1925, 2025]) assert.ok(Math.abs(C.sliderToYear(C.yearToSlider(y, r), r) - y) <= 3, String(y));
  assert.deepEqual(C.sliderRange([gatsby]), { min: -800, max: 2025, pivot: 1500 });
});

test('normalize and searchBooks', () => {
  assert.equal(C.normalize('  Crime & Punishment! '), 'crime punishment');
  assert.equal(C.normalize('Brontë'), 'bronte');
  assert.deepEqual(C.searchBooks(books, '').map(b => b.id), []);
  assert.deepEqual(C.searchBooks(books, 'gat').map(b => b.id), ['great-gatsby']);
  assert.deepEqual(C.searchBooks(books, 'the great').map(b => b.id), ['great-gatsby']);
  assert.deepEqual(C.searchBooks(books, 'marx').map(b => b.id), ['manifesto']);
  assert.deepEqual(C.searchBooks(books, 'homer').map(b => b.id), ['odyssey']);
  assert.equal(C.searchBooks(books, 'e').length <= 8, true);
});

test('passageIndex covers main and famous passages', () => {
  const idx = C.passageIndex(books);
  assert.equal(idx['great-gatsby-2'].book.id, 'great-gatsby');
  assert.equal(idx['great-gatsby-2'].isFamous, false);
  assert.equal(idx['great-gatsby-famous'].isFamous, true);
});

test('roundsForDay resolves ids, wraps, and tops up missing ids', () => {
  const schedule = { epoch: '2026-08-18', days: [['great-gatsby-1', 'manifesto-1', 'odyssey-1', 'hamlet-1', 'beowulf-1'], ['great-gatsby-2', 'nope-1', 'odyssey-1', 'hamlet-1', 'beowulf-1']] };
  const d0 = C.roundsForDay(schedule, books, 0);
  assert.deepEqual(d0.map(r => r.passage.id), ['great-gatsby-1', 'manifesto-1', 'odyssey-1', 'hamlet-1', 'beowulf-1']);
  const d1 = C.roundsForDay(schedule, books, 1);
  assert.equal(d1.length, 5);
  assert.equal(new Set(d1.map(r => r.book.id)).size, 5);
  assert.deepEqual(C.roundsForDay(schedule, books, 2).map(r => r.passage.id), d0.map(r => r.passage.id)); // wraps
});

test('shareText matches the spec format', () => {
  const t = C.shareText({ dayNumber: 12, total: 3860, roundTotals: [940, 800, 600, 100, 1420], streak: 6, url: 'tristansaucedo.com/blue-book' });
  assert.equal(t, 'Blue Book #12 · 3,860 / 5,000\n📗 📗 📙 📕 📗 · 🔥 6\ntristansaucedo.com/blue-book');
  assert.equal(C.formatPoints(0), '0');
});
```

- [ ] **Step 2: Run to see them fail**

Run: `node --test _tools/blue_book/tests/`
Expected: fails to load `assets/js/blue-book-core.js`.

- [ ] **Step 3: Implement `assets/js/blue-book-core.js`**

Write the module per the interface list. Key implementations (the rest is straightforward):

```js
function dayIndex(date, epochISO) {
  var p = epochISO.split('-').map(Number);
  var a = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  var b = Date.UTC(p[0], p[1] - 1, p[2]);
  return Math.floor((a - b) / 86400000);
}
function yearLabel(y) { return y < 0 ? (-y) + ' BCE' : String(y); }
function yearRangeLabel(from, to) {
  if (to < 0) return 'between ' + (-from) + ' and ' + (-to) + ' BCE';
  return 'between ' + yearLabel(from) + ' and ' + yearLabel(to);
}
function eraBand(book) {
  if (book.era && typeof book.era.from === 'number') return { from: book.era.from, to: book.era.to };
  var from = Math.floor(book.year / 100) * 100;
  return { from: from, to: from + 99 };
}
function yearPoints(guess, book) {
  var w = typeof book.window === 'number' ? book.window : 2;
  var excess = Math.max(0, Math.abs(guess - book.year) - w);
  var D = Math.max(50, 2 * w);
  return Math.round(400 * Math.max(0, 1 - excess / D));
}
function roundScore(o) {
  var book = o.correct ? 600 : 0;
  var penalty = 100 * ((o.wrongGuesses || 0) + (o.hintsUsed || 0));
  return { book: book, year: o.yearPts || 0, penalty: penalty, total: Math.max(0, book + (o.yearPts || 0) - penalty) };
}
function sliderRange(books) {
  var minYear = Infinity;
  for (var i = 0; i < books.length; i++) if (books[i].year < minYear) minYear = books[i].year;
  return { min: Math.min(-800, Math.floor((minYear - 100) / 100) * 100), max: 2025, pivot: 1500 };
}
function sliderToYear(pos, r) {
  if (pos <= 250) return Math.round(r.min + (pos / 250) * (r.pivot - r.min));
  return Math.round(r.pivot + ((pos - 250) / 750) * (r.max - r.pivot));
}
function yearToSlider(y, r) {
  if (y <= r.pivot) return Math.round(((y - r.min) / (r.pivot - r.min)) * 250);
  return Math.round(250 + ((y - r.pivot) / (r.max - r.pivot)) * 750);
}
function normalize(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}
```
`searchBooks`: compute `q = normalize(query)`; if empty return `[]`; for each book compute a rank: 0 if `normalize(title)` starts with q or, after stripping a leading `the `/`a `/`an `, starts with q; 1 if any alias or the author (normalized) starts with q or any word of the title starts with q; 2 if q occurs anywhere in title, aliases, or author; else skip. Sort by rank then title; slice to `limit`.
`roundsForDay`: `var days = schedule.days; var day = days[((dayIdx % days.length) + days.length) % days.length]; var idx = passageIndex(books);` map ids to entries, skip unknown; if fewer than 5, iterate the main-passage ids sorted alphabetically starting at offset `dayIdx % n`, adding ones whose book is not already used, until 5.
`shareText`: `'Blue Book #' + dayNumber + ' · ' + formatPoints(total) + ' / 5,000\n' + roundTotals.map(tierEmoji).join(' ') + ' · 🔥 ' + streak + '\n' + url`.
`formatPoints`: `String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')`.

- [ ] **Step 4: Run the tests, confirm they pass**

Run: `node --test _tools/blue_book/tests/` and `node --check assets/js/blue-book-core.js`
Expected: all PASS.

---

### Task 5: Page, stylesheet hook, CSS, and a first render

**Files:**
- Modify: `_layouts/default.html` (head: add optional stylesheet)
- Create: `blue-book.md`
- Create: `assets/css/blue-book.css`
- Create: `assets/js/blue-book.js` (skeleton: boot, data, render round 1 read-only)

**Interfaces:**
- Consumes: `BlueBookCore` (Task 4), `_data/blue_book.yml` (Task 2), `_data/blue_book_schedule.json` (Task 3).
- Produces: the DOM ids listed below, which Tasks 6 and 7 wire up. Do not rename them.

- [ ] **Step 1: Add the stylesheet hook to the layout**

In `_layouts/default.html`, directly after the existing `style.css` `<link>` line, add:
```liquid
    {% if page.stylesheet %}<link href="{{ page.stylesheet | relative_url }}?v={{ site.time | date: '%s' }}" rel="stylesheet" type="text/css" />{% endif %}
```

- [ ] **Step 2: Write `blue-book.md`**

```markdown
---
layout: default
title: Blue Book
permalink: /blue-book/
description: Five passages from the classics every day. Name the book, place it in time.
body_class: blue-book
stylesheet: /assets/css/blue-book.css
---

<div class="bb" id="bb-app">

  <header class="bb-head">
    <h1 class="bb-title">Blue Book</h1>
    <p class="bb-tagline">Five passages from the classics. Name the book, place it in time.</p>
    <p class="bb-meta"><span id="bb-daynum"></span> <span class="bb-dot">·</span> <span id="bb-streak"></span></p>
    <details class="bb-help">
      <summary>How to play</summary>
      <p>Each round shows a passage. Pick the book it comes from and set the year it was written. A round is worth 1,000 points: 600 for the book, 400 for the year. Every hint and every wrong guess costs 100. You get three guesses.</p>
      <p>The year is forgiving in proportion to the book: a Marx pamphlet expects you within a couple of years, an ancient epic within a century or so.</p>
    </details>
  </header>

  <ol class="bb-progress" id="bb-progress" aria-label="Rounds"></ol>

  <section class="bb-round" id="bb-round" hidden>
    <blockquote class="bb-passage" id="bb-passage"></blockquote>

    <div class="bb-hints" id="bb-hints">
      <button type="button" class="bb-hint" id="bb-hint-era" data-hint="era">Era <span class="bb-cost">−100</span></button>
      <button type="button" class="bb-hint" id="bb-hint-clue" data-hint="clue">Author clue <span class="bb-cost">−100</span></button>
      <button type="button" class="bb-hint" id="bb-hint-famous" data-hint="famous">Famous passage <span class="bb-cost">−100</span></button>
    </div>
    <div class="bb-hint-out" id="bb-hint-out" hidden></div>

    <div class="bb-guess">
      <label class="bb-label" for="bb-search">Which book?</label>
      <div class="bb-search-wrap">
        <input type="text" id="bb-search" class="bb-search" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="Start typing a title or author">
        <ul class="bb-results" id="bb-results" role="listbox" hidden></ul>
      </div>
      <p class="bb-picked" id="bb-picked" hidden></p>
    </div>

    <div class="bb-year">
      <label class="bb-label" for="bb-year-num">When was it written?</label>
      <div class="bb-year-row">
        <button type="button" class="bb-step" id="bb-year-minus" aria-label="Earlier">−</button>
        <input type="number" id="bb-year-num" class="bb-year-num" step="1">
        <button type="button" class="bb-step" id="bb-year-plus" aria-label="Later">+</button>
        <span class="bb-year-label" id="bb-year-label"></span>
      </div>
      <div class="bb-slider-wrap">
        <div class="bb-slider-band" id="bb-slider-band"></div>
        <input type="range" id="bb-year-slider" class="bb-slider" min="0" max="1000" step="1">
      </div>
    </div>

    <p class="bb-feedback" id="bb-feedback" aria-live="polite"></p>

    <p class="bb-actions">
      <button type="button" class="bb-btn bb-btn-primary" id="bb-guess" disabled>Guess</button>
      <button type="button" class="bb-btn bb-btn-quiet" id="bb-giveup">Give up</button>
    </p>

    <div class="bb-reveal" id="bb-reveal" hidden>
      <p class="bb-reveal-verdict" id="bb-reveal-verdict"></p>
      <h2 class="bb-reveal-title" id="bb-reveal-title"></h2>
      <p class="bb-reveal-meta" id="bb-reveal-meta"></p>
      <p class="bb-reveal-sig" id="bb-reveal-sig"></p>
      <ul class="bb-breakdown" id="bb-breakdown"></ul>
      <p class="bb-actions"><button type="button" class="bb-btn bb-btn-primary" id="bb-next">Next</button></p>
    </div>
  </section>

  <section class="bb-results-screen" id="bb-results-screen" hidden>
    <p class="bb-total-label">Today</p>
    <p class="bb-total" id="bb-total"></p>
    <ol class="bb-tiles" id="bb-tiles"></ol>
    <p class="bb-stats" id="bb-stats"></p>
    <p class="bb-actions">
      <button type="button" class="bb-btn bb-btn-primary" id="bb-share">Share</button>
      <span class="bb-share-note" id="bb-share-note" aria-live="polite"></span>
    </p>
    <p class="bb-countdown" id="bb-countdown"></p>
  </section>

  <p class="bb-noscript"><noscript>Blue Book needs JavaScript.</noscript></p>
</div>

<script type="application/json" id="bb-data">{{ site.data.blue_book | jsonify }}</script>
<script type="application/json" id="bb-schedule">{{ site.data.blue_book_schedule | jsonify }}</script>
<script src="{{ '/assets/js/blue-book-core.js' | relative_url }}"></script>
<script src="{{ '/assets/js/blue-book.js' | relative_url }}"></script>
```

Kramdown note: the `<div class="bb">` block is raw HTML; keep a blank line before and after nested block elements only where already shown. Do not put Markdown inside it.

- [ ] **Step 3: Write `assets/css/blue-book.css`**

Style everything with the `bb-` classes above. Requirements, not suggestions:
- Container `.bb` max-width `64rem`, centered, padding `2rem 1.6rem`; on phones full width.
- `.bb-passage`: the hero. Serif for the quotation (`font-family: Georgia, "Iowan Old Style", "Times New Roman", serif; font-size: 1.9rem; line-height: 1.55;`), cream background (`var(--color-accent)`), `padding: 2rem 2.2rem`, no left border (override the site's blockquote rule which sets `border-left: 2px solid`), paragraphs separated by `1.2rem`.
- Progress: five small pills in a row; states `.is-current` (navy fill), `.is-done` (navy outline with the tier colour dot), default (grey outline).
- Hints: three chips in a row that wrap; used state `.is-used` (filled cream, cost struck through, disabled). `.bb-hint-out` is a cream card under the chips holding the revealed hint text (era sentence, clue sentence, or the famous passage in the serif style).
- Search: full-width input, `1.6rem` font; `.bb-results` absolutely positioned dropdown under it, white, `border: 1px solid var(--color-primary)`, `max-height: 26rem; overflow: auto`; each `li` shows title (bold) then author (muted); `.is-active` row highlighted cream. `.bb-picked` shows the chosen book as a navy chip with an × to clear.
- Year: number input `8rem` wide; ± buttons `3.6rem` square; `.bb-year-label` muted; slider full width; `.bb-slider-band` is an absolutely positioned overlay on the track that the JS paints with a `linear-gradient` to shade the era hint band (transparent by default). Slider thumb navy.
- Buttons: `.bb-btn` base (padding `1rem 1.8rem`, `border-radius: .6rem`, `font-weight: 700`), `.bb-btn-primary` navy fill white text, `.bb-btn-quiet` text-only navy, `:disabled` opacity `.45`.
- Reveal: cream card; `.bb-reveal-verdict` bold ("Right." / "Not this time."); `.bb-breakdown li` two-column rows (label left, points right, monospace-ish numbers via `font-variant-numeric: tabular-nums`).
- Results: `.bb-total` huge (`font-size: 6rem; font-weight: 900; color: var(--color-primary)`); `.bb-tiles` five rows, each `li` shows round number, book title, points, with a left border colored by tier: `.tier-high` green `#2f7d4f`, `.tier-mid` amber `#c98a1b`, `.tier-low` red `#b3403a`.
- Everything must look right at 360px wide. No horizontal scroll.

- [ ] **Step 4: Write the `blue-book.js` skeleton**

Follow `essays.js` style (IIFE, `var`). This task's skeleton must:
```js
(function () {
  var root = document.getElementById('bb-app');
  if (!root || !window.BlueBookCore) return;
  var C = window.BlueBookCore;
  var books = JSON.parse(document.getElementById('bb-data').textContent);
  var schedule = JSON.parse(document.getElementById('bb-schedule').textContent);
  var URL = 'tristansaucedo.com/blue-book';
  var TOTAL_ROUNDS = 5;

  var dayIdx = C.dayIndex(new Date(), schedule.epoch);
  var rounds = C.roundsForDay(schedule, books, dayIdx);   // [{book, passage}]
  var range = C.sliderRange(books);

  var el = {};   // every id above, e.g. el.passage = document.getElementById('bb-passage')
  // ... fill el for: daynum, streak, progress, round, passage, hints (the three), hintOut, search, results, picked,
  //     yearNum, yearMinus, yearPlus, yearLabel, yearSlider, sliderBand, feedback, guess, giveup, reveal, revealVerdict,
  //     revealTitle, revealMeta, revealSig, breakdown, next, resultsScreen (id bb-results-screen), total, tiles, stats, share, shareNote, countdown

  function renderPassage(text) {
    el.passage.innerHTML = '';
    text.split(/\n\s*\n/).forEach(function (para) {
      var p = document.createElement('p'); p.textContent = para; el.passage.appendChild(p);
    });
  }
  function renderProgress(current, results) { /* five <li>, class is-current / is-done + tier-* */ }

  el.daynum.textContent = '#' + (dayIdx + 1);
  el.streak.textContent = '';
  renderProgress(0, []);
  renderPassage(rounds[0].passage.text);
  el.round.hidden = false;
})();
```
Passages are inserted with `textContent` (never `innerHTML` with data). Task 6 replaces the tail of this IIFE with the state machine; keep `renderPassage`, `renderProgress`, `el`, `rounds`, `range` as-is.

- [ ] **Step 5: Build and check the output**

Run:
```bash
node --check assets/js/blue-book.js && bundle exec jekyll build 2>&1 | tail -2 && ls _site/blue-book/index.html && node -e "
const h=require('fs').readFileSync('_site/blue-book/index.html','utf8');
const m=h.match(/id=\"bb-data\">([\s\S]*?)<\/script>/); const d=JSON.parse(m[1]);
const s=JSON.parse(h.match(/id=\"bb-schedule\">([\s\S]*?)<\/script>/)[1]);
console.log('books', d.length, 'passages', d.reduce((n,b)=>n+b.passages.length,0), 'days', s.days.length, 'css', /blue-book\.css/.test(h));"
```
Expected: `books 10 passages 20 days 400 css true`. Also `grep -c "bb-passage" _site/blue-book/index.html` ≥ 1.

- [ ] **Step 6: Eyeball it**

Run `bundle exec jekyll serve --detach` (if not already running; it serves `_site`, so re-run `bundle exec jekyll build` after any change) and open `http://localhost:4000/blue-book/` in a browser if you have one available; otherwise skip and say so in your report. The passage should render in the cream serif block under the title, with the five progress pills above it.

---

### Task 6: Round interaction (search, guesses, hints, year, reveal)

**Files:**
- Modify: `assets/js/blue-book.js`

**Interfaces:**
- Consumes: DOM ids from Task 5; `BlueBookCore` from Task 4.
- Produces: the in-memory `state` shape below, `startRound(i)`, `endRound(correct)`, `renderReveal(result)`, and a `hooks` object `{ onRoundEnd: null, onDayEnd: null }` that Task 7 sets. Round results are pushed to `state.results[i]` with shape `{ passageId, bookId, correct, guessIds: [], hintsUsed: [], year, yearPts, book, penalty, total }` (`book`, `penalty`, `total` from `C.roundScore`).

- [ ] **Step 1: State**

```js
var state = {
  round: 0,                 // index into rounds
  results: [],              // per finished round, see shape above
  cur: null                 // current round: { guessIds: [], hintsUsed: [], picked: null (book), year: 1800, ended: false }
};
var hooks = { onRoundEnd: null, onDayEnd: null };
```

- [ ] **Step 2: Year control**

`setYear(y)` clamps to `[range.min, range.max]`, stores `state.cur.year`, sets `el.yearNum.value = y`, `el.yearLabel.textContent = C.yearLabel(y)`, `el.yearSlider.value = C.yearToSlider(y, range)`. Wire: slider `input` → `setYear(C.sliderToYear(+el.yearSlider.value, range))`; number `change` → `setYear(parseInt(value, 10) || state.cur.year)`; minus/plus → `setYear(year ∓ 1)` (hold-to-repeat not required). Default year for a new round: `1800`. Set `el.yearNum.min/max` from `range`.

`paintBand(band)`: if `band` is null, `el.sliderBand.style.background = 'transparent'`; else compute `a = C.yearToSlider(band.from, range) / 10` and `b = C.yearToSlider(band.to, range) / 10` (percent) and set `linear-gradient(to right, transparent a%, var(--color-accent) a%, var(--color-accent) b%, transparent b%)`. Since the site's cream is subtle on white, use `rgba(20,33,61,.18)` instead of the token for the band colour.

- [ ] **Step 3: Search and pick**

On `input` in `el.search`: `matches = C.searchBooks(books, value)`; render up to 8 `<li role="option">` into `el.results` (`<strong>` title, `<span class="bb-res-author">` author); `el.results.hidden = matches.length === 0`. Track `activeIdx` for ArrowUp/ArrowDown; Enter picks the active (or first) match; Escape closes. Click on an `li` picks. `pick(book)`: `state.cur.picked = book; el.picked.textContent = book.title + ' · ' + book.author; el.picked.hidden = false; el.search.value = ''; el.results.hidden = true; el.guess.disabled = false;` plus a clear (×) button inside `el.picked` that unpicks and disables Guess. Exclude books already guessed this round from the results.

- [ ] **Step 4: Guessing**

`onGuess()`: if no pick or round ended, return. `var b = state.cur.picked; state.cur.guessIds.push(b.id);` If `b.id === rounds[state.round].book.id` → `endRound(true)`. Else: `left = 3 - state.cur.guessIds.length`; feedback text = `'Not it.'` + (same author as the answer ? `' Right author, though.'` : `''`) + (left > 0 ? ` ${left} ${left === 1 ? 'guess' : 'guesses'} left.` : ''); unpick; if `left === 0` → `endRound(false)`. `onGiveUp()` → `endRound(false)`.

- [ ] **Step 5: Hints**

Each hint button, once per round: push its name to `state.cur.hintsUsed`, add `is-used`, disable, and show content in `el.hintOut` (append a `<div class="bb-hint-item">` so multiple hints stack): era → `'Written ' + C.yearRangeLabel(band.from, band.to) + '.'` and `paintBand(band)`; clue → `book.clue` (if the book has no `clue`, keep the button disabled from round start with title "No clue for this book yet"); famous → render `book.famous.text` paragraphs in a serif block (if none, disabled at round start likewise).

- [ ] **Step 6: Ending a round and the reveal**

```js
function endRound(correct) {
  var r = rounds[state.round], cur = state.cur; cur.ended = true;
  var yearPts = C.yearPoints(cur.year, r.book);
  var wrong = correct ? cur.guessIds.length - 1 : cur.guessIds.length;
  var score = C.roundScore({ correct: correct, wrongGuesses: wrong, hintsUsed: cur.hintsUsed.length, yearPts: yearPts });
  var result = { passageId: r.passage.id, bookId: r.book.id, correct: correct, guessIds: cur.guessIds.slice(), hintsUsed: cur.hintsUsed.slice(), year: cur.year, yearPts: yearPts, book: score.book, penalty: score.penalty, total: score.total };
  state.results[state.round] = result;
  renderReveal(result, r, wrong);
  if (hooks.onRoundEnd) hooks.onRoundEnd(result);
}
```
`renderReveal(result, r, wrong)`: disable guess/giveup/hints/search/year controls; `verdict = result.correct ? 'Right.' : 'Not this time.'`; title = `r.book.title`; meta = `r.book.author + ' · ' + (r.book.year_label || C.yearLabel(r.book.year)) + ' · ' + r.passage.locus`; sig = `r.passage.significance || ''` (hide the element if empty); breakdown rows: `Book — 600/0`, `Year (you said <label>) — yearPts`, `Hints (n) — −100n` (only if n>0), `Wrong guesses (n) — −100n` (only if n>0), `Round — total` (bold). Render each row as `<li><span>label</span><span>value</span></li>` using `textContent`; show negative amounts with the Unicode minus sign U+2212, e.g. `−100`. Show `el.reveal`, scroll it into view; `el.next.textContent = state.round === TOTAL_ROUNDS - 1 ? 'See results' : 'Next'`.

- [ ] **Step 7: Round lifecycle**

`startRound(i)`: `state.round = i; state.cur = { guessIds: [], hintsUsed: [], picked: null, year: 1800, ended: false }`; reset all controls (enable, clear feedback, hide reveal, clear hintOut, unpick, `paintBand(null)`, un-mark hint buttons, disable clue/famous buttons if the book lacks them); `renderPassage(rounds[i].passage.text)`; `renderProgress(i, state.results)`; `setYear(1800)`; focus nothing on mobile (avoid popping the keyboard). `el.next` click: if `state.round < TOTAL_ROUNDS - 1` → `startRound(state.round + 1)` else `if (hooks.onDayEnd) hooks.onDayEnd()`. Replace the skeleton's tail with `startRound(0)`.

- [ ] **Step 8: Verify**

Run: `node --check assets/js/blue-book.js && bundle exec jekyll build 2>&1 | tail -1`. Then a scripted sanity check that the module has no top-level runtime errors under a fake DOM is NOT available here; instead re-read the file once for undefined identifiers and mismatched ids (grep every `getElementById('bb-...')` against the ids in `blue-book.md`: `grep -o "getElementById('[^']*')" assets/js/blue-book.js | sort -u` vs `grep -o 'id="bb-[^"]*"' blue-book.md | sort -u`; every JS id must exist in the page). Report the diff (should be empty except ids the JS never touches).

If a browser is available, play a full round: pick a wrong book (see feedback), use all three hints (see chips fill and the band shade), pick the right book, confirm the reveal math matches the constraints (600 + year − 400 penalty for 1 wrong guess + 3 hints).

---

### Task 7: Results, share, persistence, stats, countdown

**Files:**
- Modify: `assets/js/blue-book.js`

**Interfaces:**
- Consumes: `hooks`, `state`, `startRound`, `renderProgress` from Task 6; `C.shareText`, `C.tier`, `C.formatPoints`.
- Produces: localStorage keys `bb:v1:day:<dayIdx>` and `bb:v1:stats`; the results screen.

- [ ] **Step 1: Persistence**

```js
var KEY_DAY = 'bb:v1:day:' + dayIdx, KEY_STATS = 'bb:v1:stats';
function load(k, fallback) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } }
function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
```
Day record: `{ results: state.results, done: bool }`. On `hooks.onRoundEnd` → `save(KEY_DAY, { results: state.results, done: false })`. On boot: `var saved = load(KEY_DAY, null)`; if `saved && saved.done` → `state.results = saved.results; showResults(false)`; else if `saved` → `state.results = saved.results; startRound(saved.results.length)` (a round that ended is complete; an unfinished round restarts from scratch, which is acceptable). Otherwise `startRound(0)`.

- [ ] **Step 2: Stats and streak**

Stats record: `{ played: 0, streak: 0, maxStreak: 0, lastDay: null, best: 0, sum: 0 }`. `finishDay()`: compute `total = sum of results[].total`; `st = load(KEY_STATS, defaults)`; if `st.lastDay !== dayIdx` (guard against double counting): `st.played += 1; st.streak = (st.lastDay === dayIdx - 1) ? st.streak + 1 : 1; st.maxStreak = max; st.best = max(st.best, total); st.sum += total; st.lastDay = dayIdx; save(KEY_STATS, st)`; `save(KEY_DAY, { results: state.results, done: true })`; then `showResults(true)`. Set `hooks.onDayEnd = finishDay`. On boot, `el.streak.textContent = st.streak ? '🔥 ' + st.streak : ''` (only when `st.lastDay === dayIdx || st.lastDay === dayIdx - 1`, else the streak is broken and shows nothing).

- [ ] **Step 3: Results screen**

`showResults(justFinished)`: hide `el.round`; `renderProgress(TOTAL_ROUNDS, state.results)`; `el.total.textContent = C.formatPoints(total) + ' / 5,000'`; tiles: one `<li class="tier-<tier>">` per round with `<span class="bb-tile-n">1</span><span class="bb-tile-title">Title</span><span class="bb-tile-pts">940</span>` (title from `rounds[i].book.title`); stats line: `Played 12 · Streak 6 · Best 4,120 · Average 3,310` (average = round(sum/played)); show `el.resultsScreen`; start the countdown; scroll to top of `.bb`.

- [ ] **Step 4: Share**

On `el.share` click: `text = C.shareText({ dayNumber: dayIdx + 1, total, roundTotals: state.results.map(r => r.total), streak: st.streak, url: URL })`. If `navigator.share` exists and `navigator.canShare ? navigator.canShare({text}) : true` → `navigator.share({ text: text }).catch(function(){})`; else `navigator.clipboard.writeText(text)` then `el.shareNote.textContent = 'Copied.'` (clear after 2s); if clipboard fails, fall back to a temporary `<textarea>` + `document.execCommand('copy')`.

- [ ] **Step 5: Countdown**

`tick()`: `now = new Date(); next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)`; diff → `h`, `m`; `el.countdown.textContent = 'Next Blue Book in ' + h + 'h ' + m + 'm'`; `setInterval(tick, 30000)`; if `C.dayIndex(now, schedule.epoch) !== dayIdx` → `el.countdown.textContent = 'A new Blue Book is ready. Reload the page.'`.

- [ ] **Step 6: Verify**

`node --check assets/js/blue-book.js && bundle exec jekyll build 2>&1 | tail -1`. Repeat the id cross-check from Task 6 Step 8. If a browser is available: play all five rounds, confirm the results screen totals equal the sum of the reveals, Share copies the exact three-line text, reload restores the results screen, and clearing `bb:v1:day:*` in devtools returns to round 1 while stats persist.

---

## Lead's closing checklist (not a subagent task)

1. Run every test command from Global Constraints; all green.
2. Browser QA at 390px and desktop via the Chrome tools: full day play-through, hint band paints, reveal math, share text, reload restore, midnight rollover logic by temporarily setting the system clock is NOT needed (dayIndex is unit-tested).
3. `git status`: expected new/changed files only (`_data/blue_book.yml`, `_data/blue_book_schedule.json`, `_tools/blue_book/{canon.py,verify_passages.py,build_schedule.py,tests/}`, `assets/js/blue-book*.js`, `assets/css/blue-book.css`, `blue-book.md`, `_layouts/default.html`, `.gitignore`, this plan). No `_tools/blue_book/cache/` in the tree.
4. One commit. Do not push; Tristan reviews locally at `localhost:4000/blue-book/` first (the page is not linked from the nav or projects yet, by design).
