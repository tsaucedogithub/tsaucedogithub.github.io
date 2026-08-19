# Blue Book: design

A daily game on tristansaucedo.com. Five passages from the classics each day. For each, name the book and place it in time. Score out of 5,000, share it, come back tomorrow. Named for the exam booklet: the model is a literature exam where you identify a passage and know why it matters.

Status: design agreed in conversation 2026-08-18. Canon list not yet built. No code yet.

## What makes it different

Existing book games (Bookdle, Bookordle, Guess The Book, Versedle) are one book a day, right or wrong, quotes pulled from Goodreads. Blue Book is:

- **A real canon.** ~100 books everyone has heard of, drawn from "best books of all time" lists (not Goodreads). Novels, plays, epics, philosophy, non-fiction. No lyric poetry.
- **Significant passages.** Each passage is one a professor would put on the exam: a turning point, a thesis, a defining scene. Names and places left in. Not the single most-quoted line (those are the hint).
- **Graded scoring.** Five rounds, a year control with per-book tolerance, hints that cost points, a total to brag about.
- **The reveal teaches.** After each round: title, author, year, where in the book it is, and (when written) two or three sentences on why the passage matters. Blurbs are drafted with the passages; the game runs without them, so they are not a launch blocker.

## The canon

- ~100 books at launch, growing toward 200.
- Source: overlap of established best-of lists (see `_tools/blue_book/lists/`). Filter: recognition. Everyone should have heard of every book. Some books will be harder to find good passages for; that can cut a book.
- Include non-fiction and philosophy (Republic, The Prince, Origin of Species, Communist Manifesto, etc.), plays, epics.
- Fair use is fine. No public-domain restriction on the list.
- Per book: `id`, `title`, `author`, `year` (a single number, negative for BCE), `window` (years of full credit either side), `year_label` ("c. 725 BCE"), `form`, `nationality`/language, `aliases` (for the autocomplete).

## Passages

- Two main passages per book plus one **famous** passage used only as a hint. Main passages rotate through the schedule; the famous one never appears as a prompt.
- 80–200 words (shorter for verse and drama). Self-contained. Best-known English translation for translated works.
- Per passage: `text`, `locus` ("Book 11", "Act 3, Scene 1", "Ch. 5"), `difficulty` (1–3), `significance` (optional blurb).
- Accuracy: public-domain books get an exact-substring check against Gutenberg text (`_tools/blue_book/verify_passages.py`). Post-1930 books are drafted from knowledge and flagged **unverified** until checked against a copy.

## A round

Prompt: the passage. Inputs: a search box with autocomplete over the canon (shows Title · Author), and a year control. Buttons: Guess, Give up, three hints.

- **Three guesses.** A wrong guess says "Not it" and, if the author matches, "right author, though." The round ends on a correct guess, a third miss, or Give up.
- **Year** is adjustable until the round ends and is scored at that moment. Control: a slider that is nonlinear (a quarter of the track for everything before 1500, the rest for 1500–2000) plus a tappable year you can type or step. Displays "1848" or "725 BCE".
- **Hints**, each usable once per round:
  - Era: shades the slider to a band ("written 1800–1899").
  - Author clue: "Russian novelist", "Athenian playwright", "German philosopher".
  - Famous passage: the book's most recognizable passage.

## Scoring

Each round is worth 1,000: **600 for the book, 400 for the year.** Every hint and every wrong guess costs **100** off the round. Floor at 0.

- Book: 600 if guessed within three tries, else 0.
- Year: full 400 inside the book's window. Outside it, linear decay to zero over `D = max(50, 2 × window)` years past the window. So `excess = max(0, |guess − year| − window)`, `points = 400 × max(0, 1 − excess / D)`.

Examples:

| Book | Year | Window | D | Guess | Year pts |
|---|---|---|---|---|---|
| Communist Manifesto | 1848 | 2 | 50 | 1870 | 240 |
| Communist Manifesto | 1848 | 2 | 50 | 1880 | 160 |
| Odyssey | −700 | 150 | 300 | −530 | 373 |
| Odyssey | −700 | 150 | 300 | −400 | 200 |
| Hamlet | 1600 | 5 | 50 | 1620 | 280 |
| Beowulf | 900 | 200 | 400 | 1200 | 300 |

Third guess with all three hints: 600 − 500 = 100 for the book, plus whatever the year earns.

## The day

- Five rounds, deterministic. `_tools/blue_book/build_schedule.py` writes `_data/blue_book_schedule.json` (day N → five passage ids) with constraints: no book within 15 days, no author twice in a day, at least one pre-1800 book per day, no more than two from the same century, mixed difficulty. Hand-editable.
- Day number = local calendar days since the launch date. Rolls at local midnight.
- Repeats are acceptable for now: 100 books × 2 passages ≈ 40 days before a passage recurs, ~20 before a book does.
- localStorage: today's progress (survives reload), stats (played, streak, max streak, best, average).
- Today only in v1. Archive and practice later.

## Ending

After round five: the results screen. Big total, five round tiles (points and tier colour; titles shown since the day is done), streak, best, "come back tomorrow" countdown, and Share.

- **Share text (v1):** copies to clipboard, native share sheet on phones. No spoilers.
  ```
  Blue Book #12 · 3,860 / 5,000
  📗 📗 📙 📕 📗 · 🔥 6
  tristansaucedo.com/blue-book
  ```
  📗 ≥ 800, 📙 400–799, 📕 below.
- **Share image (v1.5):** a PNG card rendered client-side on a canvas (score, five tiles, day number, URL), delivered through the Web Share API with files on phones (straight into Instagram/iMessage) and as a download on desktop. Square first, story-size later. Titles stay off the image.

## Build

Fully static, same shape as the essay picker.

- `_data/blue_book.yml`: books + passages + significance. Hand-editable; the drafting artifact.
- `_data/blue_book_schedule.json`: generated.
- `_tools/blue_book/`: source lists, `build_schedule.py`, `verify_passages.py`.
- `blue-book.md` (permalink `/blue-book/`), `assets/js/blue-book.js`, styles in `assets/css/style.css`, an entry in `projects.md`.
- Data reaches JS as a JSON blob via Liquid `jsonify` in a `<script type="application/json">`.
- The answer key is in page source, like every static daily game. Not obfuscated.

## Order of work

1. Canon: gather lists, draft ~120 candidates, cut to 100 (Tristan edits the YAML).
2. Playable shell with ~10 books of real data: round mechanics, scoring, reveal, results, share text. Get the feel right before writing 200 passages.
3. Passages in batches of ~20 books, verified as they land. Significance blurbs alongside.
4. Schedule, projects entry, launch.
5. Later: share image, archive/practice, canon page, growth to 200.

## Revision 2026-08-19 (after Tristan's first play)

- **Search library.** The guess box searches a library of several hundred titles (every book on two or more of the source lists plus the hand-picked non-novel appendix), generated by `_tools/blue_book/build_library.py` into `_data/blue_book_library.json`. The canon is a subset; guessing a non-canon title is a wrong guess ("right author, though" still applies). With the box empty and focused, the whole list shows alphabetically and is browsable; typing narrows to eight. Search matches title and author only. This is what stops the game from being brute-forced when the canon is small.
- **Copy.** Tagline: "From the passage, guess the book and its publication year." No "How to play" section, no day number in the header. The rules are learned by playing.
- **Controls.** Year: slider plus one editable field. Hints: a "Hints" button at the top right of the progress row opens the three options, each showing "100 points" on its own line.
- **Look.** Booklet colours: baby blue (`#d9e7f6`) for the header block and the Hints button, a lighter cream (`#faf6ee`) for cards, navy type. No green/amber/red tier colours in the UI (the share-text emoji tiers remain for now). The end-of-day scorecard is modelled on an exam blue book cover (built 2026-08-19; layout still being shaped by hand).
- **Dashes, hard rule (2026-08-19):** no em dash or en dash may exist in the passages, in the data file or on screen. The source's `—`, `–` and `--` are stored and shown as one spaced hyphen (`story - the story`). The verifier treats spacing around a hyphen as equivalent so passages still check out against Gutenberg; a test fails if a dash ever gets into the canon.
- **Streaks (2026-08-19):** still counted in localStorage, but not shown on the results screen and not in the share text for now; the share text is three lines: `Blue Book #12 · 3,860 / 5,000`, the five tier emoji, the URL. Revisit with the scorecard design.
- **Results screen** hides the progress row; the five tiles are the round list.
- **Testing aid:** loading `/blue-book/?reset` clears the local game state.
- **Scoring change (2026-08-19):** wrong guesses no longer fine the round. A wrong guess lowers what the book is worth by 100 (600 on the first guess, 500 on the second, 400 on the third); missing the book scores 0 for it with no further penalty. Hints still cost 100 each. `total = max(0, book + year − 100 × hints)`. Third guess with all three hints is still 100 for the book. The reveal no longer shows a "Wrong guesses" row.
- **Wrong guesses are shown** under the feedback line as coral rows with an × (title · author), cleared each round. The feedback line says only `Wrong. 2 guesses left.`; the old "right author, though" note is gone (it was a free hint).
- **Scoring, percentage model (2026-08-19, replaces the earlier subtractions):** each round is out of 1,000: 600 for the book (all or nothing) and 400 for the year (the curve, now falling off over `max(100, 2 × window)` years, scored the same whether or not the book was found). Every hint and every wrong guess takes 10 percent off, additive: `total = (book + year) × (1 − 0.1 × (hints + wrong guesses))`. Three guesses stay; a five-guess ladder that auto-reveals hints on guesses 4 and 5 is under consideration.
- **Scorecard layout:** date top right; "Blue Book" and "Literary Examination" centered and larger; fields Class, Subject (The Classics), Score (bold), Grade; the five books; then Instructor's comments, a one-line quip chosen by grade from an editable list.
- **Give up** counts as three wrong guesses (30 percent off), so giving up is never better than guessing. The verdict reads "You gave up."
- **Scorecard rows** show title, then author · year underneath, and the round's points; the book/year split lives only on the reveal. Field lines are narrow (sized to "Blue Book No. 999") and centered. Instructor's comments are a funny list by grade in `INSTRUCTOR_COMMENTS`.
