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

  assert.equal(C.normalize("Alice’s Adventures"), 'alices adventures');
  const alice = { id: 'alice', title: "Alice's Adventures in Wonderland", author: 'Lewis Carroll', year: 1865, passages: [{ id: 'alice-1', text: 'x', locus: '1' }] };
  assert.deepEqual(C.searchBooks([alice, gatsby], 'alices').map(b => b.id), ['alice']);
  assert.deepEqual(C.searchBooks([alice, gatsby], "alice's").map(b => b.id), ['alice']);
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

test('roundsForDay skips a hand-edited entry naming a famous passage or repeating a book', () => {
  const schedule = { epoch: '2026-08-18', days: [['great-gatsby-famous', 'great-gatsby-1', 'manifesto-1', 'odyssey-1', 'hamlet-1']] };
  const day = C.roundsForDay(schedule, books, 0);
  assert.equal(day.length, 5);
  assert.equal(day.some(r => r.passage.id === 'great-gatsby-famous'), false);
  assert.equal(new Set(day.map(r => r.book.id)).size, 5);
});

test('passageIndex and roundsForDay derive default ids when the data omits them (raw YAML shape)', () => {
  const raw = [
    { id: 'a', title: 'A', author: 'Au', year: 1900, passages: [{ text: 'a1', locus: '1' }, { text: 'a2', locus: '2' }], famous: { text: 'af', locus: 'f' } },
    { id: 'b', title: 'B', author: 'Bu', year: 1910, passages: [{ text: 'b1', locus: '1' }] },
    { id: 'c', title: 'C', author: 'Cu', year: 1920, passages: [{ text: 'c1', locus: '1' }] },
    { id: 'd', title: 'D', author: 'Du', year: 1930, passages: [{ text: 'd1', locus: '1' }] },
    { id: 'e', title: 'E', author: 'Eu', year: 1940, passages: [{ text: 'e1', locus: '1' }] },
  ];
  const idx = C.passageIndex(raw);
  assert.deepEqual(Object.keys(idx).sort(), ['a-1', 'a-2', 'a-famous', 'b-1', 'c-1', 'd-1', 'e-1']);
  assert.equal(idx['a-famous'].isFamous, true);
  assert.equal(raw[0].passages[1].id, 'a-2');
  const schedule = { epoch: '2026-08-18', days: [['a-1', 'b-1', 'c-1', 'd-1', 'e-1']] };
  const rounds = C.roundsForDay(schedule, raw, 0);
  assert.deepEqual(rounds.map(r => r.passage.id), ['a-1', 'b-1', 'c-1', 'd-1', 'e-1']);
  assert.equal(rounds.length, 5);
});

test('shareText matches the spec format and carries no streak', () => {
  const t = C.shareText({ dayNumber: 12, total: 3860, roundTotals: [940, 800, 600, 100, 1420], streak: 6, url: 'tristansaucedo.com/blue-book' });
  assert.equal(t, 'Blue Book #12 · 3,860 / 5,000\n📗 📗 📙 📕 📗\ntristansaucedo.com/blue-book');
  assert.equal(t.split('\n').length, 3);
  assert.equal(/🔥/.test(t), false);
  assert.equal(C.formatPoints(0), '0');
});

test('mergeLibrary puts canon first, drops library duplicates, and ids the rest', () => {
  const library = [
    { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald' },
    { title: 'Gatsby', author: 'F. Scott Fitzgerald' },
    { title: 'Middlemarch', author: 'George Eliot' },
    { title: 'The Aeneid', author: 'Virgil' },
  ];
  const merged = C.mergeLibrary([gatsby, hamlet], library);
  const gat = merged.filter(e => C.normalize(e.title) === 'the great gatsby');
  assert.equal(gat.length, 1);
  assert.deepEqual(gat[0], { id: 'great-gatsby', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', aliases: ['Gatsby'], isCanon: true });
  assert.equal(merged.length, 5);   // 2 canon + 3 library rows (the duplicate Gatsby row is dropped)
  assert.deepEqual(merged.map(e => e.id), ['lib-3', 'lib-1', 'great-gatsby', 'hamlet', 'lib-2']);
  assert.deepEqual(merged.map(e => e.title), ['The Aeneid', 'Gatsby', 'The Great Gatsby', 'Hamlet', 'Middlemarch']);
  assert.deepEqual(merged.filter(e => e.isCanon).map(e => e.id), ['great-gatsby', 'hamlet']);
  for (const e of merged) assert.deepEqual(Object.keys(e).sort(), ['aliases', 'author', 'id', 'isCanon', 'title']);
});

test('mergeLibrary sorts case and accent insensitively, ignoring a leading article', () => {
  const merged = C.mergeLibrary([], [
    { title: 'Zorba the Greek', author: 'Nikos Kazantzakis' },
    { title: 'Émile', author: 'Jean-Jacques Rousseau' },
    { title: 'An American Tragedy', author: 'Theodore Dreiser' },
    { title: 'The Aeneid', author: 'Virgil' },
  ]);
  assert.deepEqual(merged.map(e => e.title), ['The Aeneid', 'An American Tragedy', 'Émile', 'Zorba the Greek']);
  assert.equal(merged.every(e => e.isCanon === false), true);
  assert.deepEqual(merged[0].aliases, []);
});

test('mergeLibrary copes with a missing or empty library', () => {
  assert.deepEqual(C.mergeLibrary([hamlet], []).map(e => e.id), ['hamlet']);
  assert.deepEqual(C.mergeLibrary([hamlet]).map(e => e.id), ['hamlet']);
});

test('sameAuthor compares normalized last names', () => {
  assert.equal(C.sameAuthor('Leo Tolstoy', 'Tolstoy'), true);
  assert.equal(C.sameAuthor('Emily Brontë', 'Charlotte Bronte'), true);
  assert.equal(C.sameAuthor('F. Scott Fitzgerald', 'F. Scott Fitzgerald'), true);
  assert.equal(C.sameAuthor('Leo Tolstoy', 'Fyodor Dostoevsky'), false);
  assert.equal(C.sameAuthor('', ''), false);
  assert.equal(C.sameAuthor('Homer', ''), false);
  assert.equal(C.sameAuthor(null, undefined), false);
  assert.equal(C.sameAuthor('Virginia Woolf', 'woolf'), true);
});

test('searchBooks works over merged entries and finds a decoy the canon does not hold', () => {
  const merged = C.mergeLibrary(books, [
    { title: 'Middlemarch', author: 'George Eliot' },
    { title: 'The Aeneid', author: 'Virgil' },
  ]);
  assert.deepEqual(C.searchBooks(merged, 'middle').map(e => e.title), ['Middlemarch']);
  assert.deepEqual(C.searchBooks(merged, 'virgil').map(e => e.id), ['lib-1']);
  assert.deepEqual(C.searchBooks(merged, 'gat').map(e => e.id), ['great-gatsby']);
  assert.equal(C.searchBooks(merged, 'the').length <= 8, true);
  assert.equal(C.searchBooks(merged, 'zzzz').length, 0);
});
