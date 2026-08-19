# Blue Book, explained

Internal notes for the game at `/blue-book/`. Not published (the `docs/` folder is excluded from the Jekyll build). The design history and decisions live in `docs/superpowers/specs/2026-08-18-blue-book-design.md`; this is the short version.

## What it is

A daily game. Every day, five passages from the classics. For each one you name the book and place it in time. Named for the exam booklet: the model is a literature exam where you identify a passage and know why it matters.

## How a day works

- Five rounds, the same five for everyone on a given day. The schedule is deterministic (`_data/blue_book_schedule.json`), keyed to local calendar days since the launch date; a new set at local midnight.
- A round shows a passage. You search for the book (title or author; the search list is a library of several hundred titles, of which the canon is a subset, so you cannot brute-force it) and set the year on a slider or in the year field. Three guesses; wrong guesses are listed under the box, and nothing else is given away. Three hints, behind the Hints button: era (shades the slider to a century), author clue, famous passage from the same book.
- Scoring: 1,000 a round. Up to 600 for the book (600 on the first guess, 500 on the second, 400 on the third, 0 if missed, no further penalty), 400 for the year, minus 100 for every hint, floor 0. The year is forgiving in proportion to the book: each book has a `window` (full marks inside it) and points fall off linearly over `max(50, 2 x window)` years past it. A Marx pamphlet expects you within a couple of years, an ancient epic within a century or so.
- Reveal: title, author, year, where in the book the passage sits, and two or three sentences on why the passage matters. Then the next round.
- After five: the results screen (five tiles, total out of 5,000) and Share, which copies three lines: `Blue Book #N · total / 5,000`, five tier emoji, the URL.
- Everything personal is in the browser's localStorage, per device: today's progress (survives reload), played count, best, average, and a streak that is counted but not shown yet. No accounts, nothing on a server. `/blue-book/?reset` clears it.

## Where things live

| Path | What |
|---|---|
| `_data/blue_book.yml` | The canon: books with metadata, two main passages each, one famous passage, significance blurbs. Hand-edited. Header comment documents every field. |
| `_data/blue_book_library.json` | The search library (generated). Canon plus decoys drawn from the best-of lists. |
| `_data/blue_book_schedule.json` | Day N -> five passage ids (generated; past days preserved on regeneration). |
| `blue-book.md` | The page. |
| `assets/js/blue-book-core.js` | Pure logic (scoring, day index, search, slider mapping, share text). Node tests. |
| `assets/js/blue-book.js` | The DOM: rounds, hints, reveal, results, localStorage. Renders `--`/em dashes as one spaced hyphen. |
| `assets/css/blue-book.css` | Styles. Booklet colours: baby blue `#d9e7f6`, cream `#faf6ee`, site navy. |
| `_tools/blue_book/` | `verify_passages.py` (Gutenberg exact-match), `build_schedule.py`, `build_library.py`, `tally.py` (list aggregation), `candidates.md` (the cut list), `lists/` (the 20 source lists), `tests/`. |

## Adding a book

1. Append an entry to `_data/blue_book.yml` (copy an existing one). Passages verbatim from the source, except that every em dash, en dash or `--` becomes one spaced hyphen (` - `): no em dashes anywhere, ever. In `>-` blocks leave two blank lines between paragraphs. Set `year`, `window`, `clue`, `aliases`; add `gutenberg: <ebook number>` when the text is on Project Gutenberg.
2. `python3 _tools/blue_book/verify_passages.py` (all PASS; books without a Gutenberg id are listed as unverified, check them against a copy).
3. `python3 _tools/blue_book/build_schedule.py` (extends the schedule from tomorrow; earlier days stay as they were).
4. `python3 _tools/blue_book/build_library.py` if the book was not already in the library.
5. `bundle exec jekyll build`, look at it, commit.

Tests: `python3 -m unittest discover -s _tools/blue_book/tests -p 'test_*.py'` and `node --test _tools/blue_book/tests/`.

## Not yet, but wanted

- Scorecard modelled on a graded blue book cover (date, score, the five books, no page title), and a shareable image of it.
- Score distribution and percentile among everyone who played that day. Needs somewhere to write scores (a small Cloudflare Worker + KV would do); the site is static.
- Streak display, once the scorecard exists.
- Grow the canon toward 200; rework the schedule scoring so century variety and difficulty mixing act once the canon is big enough (with ten books the schedule necessarily alternates two fixed sets).
- Archive/practice mode, a public canon page, the Projects entry at launch.
