// Blue Book core logic: pure functions, no DOM. Loads as window.BlueBookCore
// in the browser and as a CommonJS module in Node (for the test suite under
// _tools/blue_book/tests/). Scoring, date, and search rules live here so the
// UI script (blue-book.js) and the Node tests share one implementation.
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BlueBookCore = api;
})(this, function () {

  // ---- Dates -----------------------------------------------------------

  // Days between the local calendar date of `date` and the epoch date
  // (an ISO "YYYY-MM-DD" string), counting whole local days.
  function dayIndex(date, epochISO) {
    var p = epochISO.split('-').map(Number);
    var a = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    var b = Date.UTC(p[0], p[1] - 1, p[2]);
    return Math.floor((a - b) / 86400000);
  }

  // ---- Year labels -------------------------------------------------------

  function yearLabel(y) {
    return y < 0 ? (-y) + ' BCE' : String(y);
  }

  function yearRangeLabel(from, to) {
    if (to < 0) return 'between ' + (-from) + ' and ' + (-to) + ' BCE';
    return 'between ' + yearLabel(from) + ' and ' + yearLabel(to);
  }

  // ---- Era band ----------------------------------------------------------

  // A book's era: its explicit override, or the century block its year
  // falls in (e.g. 1925 -> [1900, 1999]).
  function eraBand(book) {
    if (book.era && typeof book.era.from === 'number') {
      return { from: book.era.from, to: book.era.to };
    }
    var from = Math.floor(book.year / 100) * 100;
    return { from: from, to: from + 99 };
  }

  // ---- Scoring -------------------------------------------------------------

  // Points for a year guess: full 400 inside the book's window, decaying
  // linearly to 0 over D = max(50, 2 * window) years past the window.
  function yearPoints(guess, book) {
    var w = typeof book.window === 'number' ? book.window : 2;
    var excess = Math.max(0, Math.abs(guess - book.year) - w);
    var D = Math.max(50, 2 * w);
    return Math.round(400 * Math.max(0, 1 - excess / D));
  }

  // Round total: the book is worth 600 found on the first guess and 100 less
  // for each wrong guess before it (500, then 400); never finding it is worth
  // 0 and costs nothing further, so the year points still stand. Hints are the
  // only penalty, 100 each off the round, floored at 0.
  function roundScore(o) {
    var wrong = o.wrongGuesses || 0;
    var book = o.correct ? Math.max(0, 600 - 100 * wrong) : 0;
    var year = o.yearPts || 0;
    var penalty = 100 * (o.hintsUsed || 0);
    return { book: book, year: year, penalty: penalty, total: Math.max(0, book + year - penalty) };
  }

  // ---- Tiers ---------------------------------------------------------------

  function tier(points) {
    if (points >= 800) return 'high';
    if (points >= 400) return 'mid';
    return 'low';
  }

  function tierEmoji(points) {
    var t = tier(points);
    if (t === 'high') return '📗'; // 📗
    if (t === 'mid') return '📙'; // 📙
    return '📕'; // 📕
  }

  // ---- Grade ---------------------------------------------------------------

  // Letter for a day's total, highest cut first. The thresholds are
  // placeholders: once enough days have been played they will be curved to
  // the real distribution of scores rather than to round numbers.
  var GRADE_CUTS = [[4000, 'A'], [3000, 'B'], [2000, 'C'], [1000, 'D']];

  function grade(total) {
    for (var i = 0; i < GRADE_CUTS.length; i++) {
      if (total >= GRADE_CUTS[i][0]) return GRADE_CUTS[i][1];
    }
    return 'F';
  }

  // ---- Year slider ---------------------------------------------------------

  // Slider range across the whole canon: at least back to 800 BCE, always
  // up to 2025, pivoted at 1500 so more of the slider's travel covers the
  // recent (denser) end of the timeline.
  function sliderRange(books) {
    var minYear = Infinity;
    for (var i = 0; i < books.length; i++) {
      if (books[i].year < minYear) minYear = books[i].year;
    }
    return { min: Math.min(-800, Math.floor((minYear - 100) / 100) * 100), max: 2025, pivot: 1500 };
  }

  // pos is 0..1000: 0..250 maps linearly to [min, pivot], 250..1000 maps
  // linearly to [pivot, max].
  function sliderToYear(pos, r) {
    if (pos <= 250) return Math.round(r.min + (pos / 250) * (r.pivot - r.min));
    return Math.round(r.pivot + ((pos - 250) / 750) * (r.max - r.pivot));
  }

  function yearToSlider(y, r) {
    if (y <= r.pivot) return Math.round(((y - r.min) / (r.pivot - r.min)) * 250);
    return Math.round(250 + ((y - r.pivot) / (r.max - r.pivot)) * 750);
  }

  // ---- Text normalization and search ----------------------------------------

  // Lowercase, diacritics stripped, punctuation removed, whitespace collapsed.
  function normalize(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/['’‘]/g, '')
      .replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  var LEADING_ARTICLE = /^(the |a |an )/;

  // Normalized title with a leading article stripped: the key both the
  // library merge and the sort order use, so "The Aeneid" files under "a".
  function titleKey(title) {
    return normalize(title).replace(LEADING_ARTICLE, '');
  }

  // The searchable list: the canon plus the wider library of decoy titles
  // (_data/blue_book_library.json). Canon entries keep their book id and
  // aliases and win any title collision, so a library row for a canon book
  // never shadows the real answer. Everything else gets a synthetic id.
  // Entries carry no passages: this list is for searching, not scoring.
  function mergeLibrary(books, library) {
    var entries = [];
    var canonTitles = {};
    var i;

    for (i = 0; i < books.length; i++) {
      var book = books[i];
      canonTitles[titleKey(book.title)] = true;
      entries.push({ id: book.id, title: book.title, author: book.author, aliases: book.aliases || [], isCanon: true });
    }

    var rows = library || [];
    for (i = 0; i < rows.length; i++) {
      var row = rows[i];
      if (Object.prototype.hasOwnProperty.call(canonTitles, titleKey(row.title))) continue;
      entries.push({ id: 'lib-' + i, title: row.title, author: row.author, aliases: [], isCanon: false });
    }

    entries.sort(function (a, b) {
      var ka = titleKey(a.title), kb = titleKey(b.title);
      if (ka < kb) return -1;
      if (ka > kb) return 1;
      return 0;
    });
    return entries;
  }

  // Two author strings name the same person when their normalized last
  // tokens match: "Leo Tolstoy" and "Tolstoy" do, an empty author never does.
  function sameAuthor(a, b) {
    var x = normalize(a).split(' ').pop();
    var y = normalize(b).split(' ').pop();
    return x !== '' && x === y;
  }

  // Ranked search over the canon: 0 = title prefix match (with or without
  // a leading article), 1 = alias/author prefix or a title-word prefix,
  // 2 = substring anywhere in title, aliases, or author.
  function searchBooks(books, query, limit) {
    if (typeof limit !== 'number') limit = 8;
    var q = normalize(query);
    if (!q) return [];

    var results = [];
    for (var i = 0; i < books.length; i++) {
      var book = books[i];
      var titleN = normalize(book.title);
      var titleStripped = titleN.replace(LEADING_ARTICLE, '');
      var authorN = normalize(book.author || '');
      var aliasesN = (book.aliases || []).map(normalize);
      var rank = -1;

      if (titleN.indexOf(q) === 0 || titleStripped.indexOf(q) === 0) {
        rank = 0;
      } else {
        var aliasPrefix = aliasesN.some(function (a) { return a.indexOf(q) === 0; });
        var authorPrefix = authorN !== '' && authorN.indexOf(q) === 0;
        var titleWordPrefix = titleN.split(' ').some(function (w) { return w.indexOf(q) === 0; });
        if (aliasPrefix || authorPrefix || titleWordPrefix) {
          rank = 1;
        } else {
          var inTitle = titleN.indexOf(q) !== -1;
          var inAlias = aliasesN.some(function (a) { return a.indexOf(q) !== -1; });
          var inAuthor = authorN !== '' && authorN.indexOf(q) !== -1;
          if (inTitle || inAlias || inAuthor) rank = 2;
        }
      }

      if (rank !== -1) results.push({ book: book, rank: rank });
    }

    results.sort(function (a, b) {
      if (a.rank !== b.rank) return a.rank - b.rank;
      if (a.book.title < b.book.title) return -1;
      if (a.book.title > b.book.title) return 1;
      return 0;
    });

    return results.slice(0, limit).map(function (r) { return r.book; });
  }

  // ---- Passage lookup --------------------------------------------------------

  // Flat map of passage id -> { book, passage, isFamous } covering every
  // book's main passages and its famous passage. Ids are optional in the
  // data (schema default: "<book id>-<1-based position>" and
  // "<book id>-famous"); when missing, the default is assigned onto the
  // passage object itself so downstream consumers (roundsForDay, the UI's
  // r.passage.id) see the same id this index is keyed by.
  function passageIndex(books) {
    var idx = {};
    for (var i = 0; i < books.length; i++) {
      var book = books[i];
      var passages = book.passages || [];
      for (var j = 0; j < passages.length; j++) {
        var passage = passages[j];
        if (!passage.id) passage.id = book.id + '-' + (j + 1);
        idx[passage.id] = { book: book, passage: passage, isFamous: false };
      }
      if (book.famous) {
        if (!book.famous.id) book.famous.id = book.id + '-famous';
        idx[book.famous.id] = { book: book, passage: book.famous, isFamous: true };
      }
    }
    return idx;
  }

  // The day's 5 rounds: resolves the schedule's passage ids (wrapping if
  // dayIdx exceeds the schedule length), skips ids missing from the canon,
  // and deterministically tops up from other main passages so there are
  // always 5 rounds when the canon has at least 5 books.
  function roundsForDay(schedule, books, dayIdx) {
    var days = schedule.days;
    var day = days[((dayIdx % days.length) + days.length) % days.length];
    var idx = passageIndex(books);

    var result = [];
    var usedBooks = {};
    for (var i = 0; i < day.length; i++) {
      var entry = idx[day[i]];
      if (entry && !entry.isFamous && !usedBooks[entry.book.id]) {
        result.push({ book: entry.book, passage: entry.passage });
        usedBooks[entry.book.id] = true;
      }
    }

    if (result.length < 5) {
      var mainIds = [];
      for (var id in idx) {
        if (Object.prototype.hasOwnProperty.call(idx, id) && !idx[id].isFamous) mainIds.push(id);
      }
      mainIds.sort();
      var n = mainIds.length;
      if (n > 0) {
        var offset = ((dayIdx % n) + n) % n;
        for (var k = 0; k < n && result.length < 5; k++) {
          var mid = mainIds[(offset + k) % n];
          var e = idx[mid];
          if (!usedBooks[e.book.id]) {
            result.push({ book: e.book, passage: e.passage });
            usedBooks[e.book.id] = true;
          }
        }
      }
    }

    return result;
  }

  // ---- Share text ------------------------------------------------------------

  function formatPoints(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  // Three lines: score, the five tier emoji, the URL. The streak is still
  // tracked in stats but is deliberately kept off the share card for now.
  function shareText(o) {
    return 'Blue Book #' + o.dayNumber + ' · ' + formatPoints(o.total) + ' / 5,000\n' +
      o.roundTotals.map(tierEmoji).join(' ') + '\n' + o.url;
  }

  return {
    dayIndex: dayIndex,
    yearLabel: yearLabel,
    yearRangeLabel: yearRangeLabel,
    eraBand: eraBand,
    yearPoints: yearPoints,
    roundScore: roundScore,
    tier: tier,
    tierEmoji: tierEmoji,
    GRADE_CUTS: GRADE_CUTS,
    grade: grade,
    sliderRange: sliderRange,
    sliderToYear: sliderToYear,
    yearToSlider: yearToSlider,
    normalize: normalize,
    mergeLibrary: mergeLibrary,
    sameAuthor: sameAuthor,
    searchBooks: searchBooks,
    passageIndex: passageIndex,
    roundsForDay: roundsForDay,
    shareText: shareText,
    formatPoints: formatPoints
  };
});
