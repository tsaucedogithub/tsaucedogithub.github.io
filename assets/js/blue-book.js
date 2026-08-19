// Blue Book (/blue-book/): boot, data, and the round interaction state
// machine (search, guesses, hints, year control, reveal). Task 7 adds the
// results screen and daily persistence on top of the `hooks` object below.
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

  var el = {
    daynum: document.getElementById('bb-daynum'),
    dot: document.getElementById('bb-dot'),
    streak: document.getElementById('bb-streak'),
    progress: document.getElementById('bb-progress'),
    round: document.getElementById('bb-round'),
    passage: document.getElementById('bb-passage'),
    hintEra: document.getElementById('bb-hint-era'),
    hintClue: document.getElementById('bb-hint-clue'),
    hintFamous: document.getElementById('bb-hint-famous'),
    hintOut: document.getElementById('bb-hint-out'),
    search: document.getElementById('bb-search'),
    results: document.getElementById('bb-results'),
    picked: document.getElementById('bb-picked'),
    yearNum: document.getElementById('bb-year-num'),
    yearMinus: document.getElementById('bb-year-minus'),
    yearPlus: document.getElementById('bb-year-plus'),
    yearLabel: document.getElementById('bb-year-label'),
    yearSlider: document.getElementById('bb-year-slider'),
    sliderBand: document.getElementById('bb-slider-band'),
    feedback: document.getElementById('bb-feedback'),
    guess: document.getElementById('bb-guess'),
    giveup: document.getElementById('bb-giveup'),
    reveal: document.getElementById('bb-reveal'),
    revealVerdict: document.getElementById('bb-reveal-verdict'),
    revealTitle: document.getElementById('bb-reveal-title'),
    revealMeta: document.getElementById('bb-reveal-meta'),
    revealSig: document.getElementById('bb-reveal-sig'),
    breakdown: document.getElementById('bb-breakdown'),
    next: document.getElementById('bb-next'),
    resultsScreen: document.getElementById('bb-results-screen'),
    total: document.getElementById('bb-total'),
    tiles: document.getElementById('bb-tiles'),
    stats: document.getElementById('bb-stats'),
    share: document.getElementById('bb-share'),
    shareNote: document.getElementById('bb-share-note'),
    countdown: document.getElementById('bb-countdown')
  };

  var hintBtns = { era: el.hintEra, clue: el.hintClue, famous: el.hintFamous };

  // state.cur: the round in play. state.results: finished rounds, in order,
  // shape { passageId, bookId, correct, guessIds, hintsUsed, year, yearPts,
  // book, penalty, total } (book/penalty/total from C.roundScore).
  var state = {
    round: 0,
    results: [],
    cur: null
  };
  var hooks = { onRoundEnd: null, onDayEnd: null };

  // Search dropdown state: not part of `state.cur` because it is UI-only
  // and gets rebuilt on every keystroke.
  var currentMatches = [];
  var activeIdx = -1;

  // ---- Passage / hint text rendering --------------------------------------

  function appendParagraphs(container, text) {
    // Display-only cleanup: some Gutenberg editions print an em dash as "--".
    // The data file stays verbatim; only the rendered text is normalized.
    text.split(/\n\s*\n/).forEach(function (para) {
      var p = document.createElement('p');
      p.textContent = para.replace(/--/g, '—');
      container.appendChild(p);
    });
  }

  function renderPassage(text) {
    el.passage.innerHTML = '';
    appendParagraphs(el.passage, text);
  }

  function renderProgress(current, results) {
    // current: 0-based index of the round in play. results: completed round
    // results so far, in order (used to mark earlier pills is-done + tier).
    el.progress.innerHTML = '';
    for (var i = 0; i < TOTAL_ROUNDS; i++) {
      var li = document.createElement('li');
      li.textContent = String(i + 1);
      if (i < results.length) {
        li.className = 'is-done tier-' + C.tier(results[i].total);
      } else if (i === current) {
        li.className = 'is-current';
      }
      el.progress.appendChild(li);
    }
  }

  // ---- Year control --------------------------------------------------------

  function setYear(y) {
    y = Math.max(range.min, Math.min(range.max, y));
    state.cur.year = y;
    el.yearNum.value = y;
    el.yearLabel.textContent = C.yearLabel(y);
    el.yearSlider.value = C.yearToSlider(y, range);
  }

  function paintBand(band) {
    if (!band) {
      el.sliderBand.style.background = 'transparent';
      return;
    }
    var a = C.yearToSlider(band.from, range) / 10;
    var b = C.yearToSlider(band.to, range) / 10;
    el.sliderBand.style.background = 'linear-gradient(to right, transparent ' + a + '%, rgba(20,33,61,.18) ' + a + '%, rgba(20,33,61,.18) ' + b + '%, transparent ' + b + '%)';
  }

  el.yearNum.min = range.min;
  el.yearNum.max = range.max;
  el.yearSlider.addEventListener('input', function () {
    setYear(C.sliderToYear(+el.yearSlider.value, range));
  });
  el.yearNum.addEventListener('change', function () {
    setYear(parseInt(el.yearNum.value, 10) || state.cur.year);
  });
  el.yearMinus.addEventListener('click', function () { setYear(state.cur.year - 1); });
  el.yearPlus.addEventListener('click', function () { setYear(state.cur.year + 1); });

  // ---- Search and pick -------------------------------------------------------

  function updateActive() {
    var items = el.results.children;
    for (var i = 0; i < items.length; i++) {
      items[i].className = i === activeIdx ? 'is-active' : '';
    }
    if (activeIdx >= 0 && items[activeIdx]) items[activeIdx].scrollIntoView({ block: 'nearest' });
  }

  function renderResults(matches) {
    currentMatches = matches;
    activeIdx = matches.length ? 0 : -1;
    el.results.innerHTML = '';
    matches.forEach(function (book, i) {
      var li = document.createElement('li');
      li.setAttribute('role', 'option');
      if (i === activeIdx) li.className = 'is-active';
      var strong = document.createElement('strong');
      strong.textContent = book.title;
      var author = document.createElement('span');
      author.className = 'bb-res-author';
      author.textContent = book.author;
      li.appendChild(strong);
      li.appendChild(author);
      li.addEventListener('click', function () { pick(book); });
      el.results.appendChild(li);
    });
    el.results.hidden = matches.length === 0;
  }

  function pick(book) {
    state.cur.picked = book;
    el.picked.textContent = book.title + ' · ' + book.author;
    var x = document.createElement('button');
    x.type = 'button';
    x.className = 'bb-picked-x';
    x.setAttribute('aria-label', 'Clear');
    x.textContent = '×';
    x.addEventListener('click', unpick);
    el.picked.appendChild(x);
    el.picked.hidden = false;
    el.search.value = '';
    el.results.hidden = true;
    el.guess.disabled = false;
  }

  function unpick() {
    state.cur.picked = null;
    el.picked.hidden = true;
    el.picked.textContent = '';
    el.guess.disabled = true;
  }

  el.search.addEventListener('input', function () {
    var value = el.search.value;
    if (!value) { renderResults([]); return; }
    var matches = C.searchBooks(books, value).filter(function (b) {
      return state.cur.guessIds.indexOf(b.id) === -1;
    });
    renderResults(matches);
  });

  el.search.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') {
      if (el.results.hidden || !currentMatches.length) return;
      e.preventDefault();
      activeIdx = (activeIdx + 1) % currentMatches.length;
      updateActive();
    } else if (e.key === 'ArrowUp') {
      if (el.results.hidden || !currentMatches.length) return;
      e.preventDefault();
      activeIdx = (activeIdx - 1 + currentMatches.length) % currentMatches.length;
      updateActive();
    } else if (e.key === 'Enter') {
      if (el.results.hidden || !currentMatches.length) return;
      e.preventDefault();
      pick(currentMatches[activeIdx] || currentMatches[0]);
    } else if (e.key === 'Escape') {
      el.results.hidden = true;
    }
  });

  // ---- Guessing --------------------------------------------------------------

  function onGuess() {
    if (!state.cur.picked || state.cur.ended) return;
    var b = state.cur.picked;
    state.cur.guessIds.push(b.id);
    var answer = rounds[state.round].book;
    if (b.id === answer.id) {
      endRound(true);
      return;
    }
    var left = 3 - state.cur.guessIds.length;
    var text = 'Not it.';
    if (b.author === answer.author) text += ' Right author, though.';
    if (left > 0) text += ' ' + left + ' ' + (left === 1 ? 'guess' : 'guesses') + ' left.';
    el.feedback.textContent = text;
    unpick();
    if (left === 0) endRound(false);
  }

  function onGiveUp() {
    if (state.cur.ended) return;
    endRound(false);
  }

  el.guess.addEventListener('click', onGuess);
  el.giveup.addEventListener('click', onGiveUp);

  // ---- Hints ----------------------------------------------------------------

  function useHint(name) {
    if (state.cur.ended) return;
    var btn = hintBtns[name];
    if (!btn || btn.disabled || btn.classList.contains('is-used')) return;

    state.cur.hintsUsed.push(name);
    btn.classList.add('is-used');
    btn.disabled = true;

    var book = rounds[state.round].book;
    var item = document.createElement('div');
    item.className = 'bb-hint-item';

    if (name === 'era') {
      var band = C.eraBand(book);
      item.textContent = 'Written ' + C.yearRangeLabel(band.from, band.to) + '.';
      paintBand(band);
    } else if (name === 'clue') {
      item.textContent = book.clue;
    } else if (name === 'famous') {
      item.className = 'bb-hint-item is-famous';
      appendParagraphs(item, book.famous.text);
    }

    el.hintOut.appendChild(item);
    el.hintOut.hidden = false;
  }

  el.hintEra.addEventListener('click', function () { useHint('era'); });
  el.hintClue.addEventListener('click', function () { useHint('clue'); });
  el.hintFamous.addEventListener('click', function () { useHint('famous'); });

  // ---- Ending a round and the reveal -----------------------------------------

  function addBreakdownRow(label, value, extraClass) {
    var li = document.createElement('li');
    if (extraClass) li.className = extraClass;
    var labelSpan = document.createElement('span');
    labelSpan.textContent = label;
    var valueSpan = document.createElement('span');
    valueSpan.textContent = value;
    li.appendChild(labelSpan);
    li.appendChild(valueSpan);
    el.breakdown.appendChild(li);
  }

  function renderReveal(result, r, wrong) {
    el.feedback.textContent = '';
    el.guess.disabled = true;
    el.giveup.disabled = true;
    el.search.disabled = true;
    el.yearNum.disabled = true;
    el.yearMinus.disabled = true;
    el.yearPlus.disabled = true;
    el.yearSlider.disabled = true;
    el.hintEra.disabled = true;
    el.hintClue.disabled = true;
    el.hintFamous.disabled = true;

    el.revealVerdict.textContent = result.correct ? 'Right.' : 'Not this time.';
    el.revealTitle.textContent = r.book.title;
    el.revealMeta.textContent = r.book.author + ' · ' + (r.book.year_label || C.yearLabel(r.book.year)) + ' · ' + r.passage.locus;

    if (r.passage.significance) {
      el.revealSig.textContent = r.passage.significance;
      el.revealSig.hidden = false;
    } else {
      el.revealSig.textContent = '';
      el.revealSig.hidden = true;
    }

    el.breakdown.innerHTML = '';
    addBreakdownRow('Book', String(result.book));
    addBreakdownRow('Year (you said ' + C.yearLabel(result.year) + ')', String(result.yearPts));
    if (result.hintsUsed.length > 0) {
      addBreakdownRow('Hints (' + result.hintsUsed.length + ')', '−' + (100 * result.hintsUsed.length));
    }
    if (wrong > 0) {
      addBreakdownRow('Wrong guesses (' + wrong + ')', '−' + (100 * wrong));
    }
    addBreakdownRow('Round', String(result.total), 'bb-breakdown-total');

    el.reveal.hidden = false;
    el.reveal.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    el.next.textContent = state.round === TOTAL_ROUNDS - 1 ? 'See results' : 'Next';
  }

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

  // ---- Round lifecycle --------------------------------------------------------

  function resetControls(book) {
    el.feedback.textContent = '';
    el.reveal.hidden = true;

    el.hintOut.innerHTML = '';
    el.hintOut.hidden = true;
    paintBand(null);

    el.search.disabled = false;
    el.search.value = '';
    el.results.innerHTML = '';
    el.results.hidden = true;
    currentMatches = [];
    activeIdx = -1;
    unpick();

    el.giveup.disabled = false;
    el.yearNum.disabled = false;
    el.yearMinus.disabled = false;
    el.yearPlus.disabled = false;
    el.yearSlider.disabled = false;

    [el.hintEra, el.hintClue, el.hintFamous].forEach(function (btn) {
      btn.classList.remove('is-used');
      btn.disabled = false;
      btn.removeAttribute('title');
    });
    if (!book.clue) {
      el.hintClue.disabled = true;
      el.hintClue.title = 'No clue for this book yet';
    }
    if (!book.famous || !book.famous.text) {
      el.hintFamous.disabled = true;
      el.hintFamous.title = 'No famous passage for this book yet';
    }
  }

  function startRound(i) {
    state.round = i;
    state.cur = { guessIds: [], hintsUsed: [], picked: null, year: 1800, ended: false };
    var r = rounds[i];
    resetControls(r.book);
    renderPassage(r.passage.text);
    renderProgress(i, state.results);
    setYear(1800);
    el.round.hidden = false;
    // No focus() call here: keeps the on-screen keyboard from popping on mobile.
  }

  el.next.addEventListener('click', function () {
    if (state.round < TOTAL_ROUNDS - 1) {
      startRound(state.round + 1);
    } else if (hooks.onDayEnd) {
      hooks.onDayEnd();
    }
  });

  // ---- Persistence ------------------------------------------------------

  var KEY_DAY = 'bb:v1:day:' + dayIdx;
  var KEY_STATS = 'bb:v1:stats';

  function load(k, fallback) {
    try {
      var v = localStorage.getItem(k);
      return v ? JSON.parse(v) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function save(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) {}
  }

  hooks.onRoundEnd = function () {
    save(KEY_DAY, { results: state.results, done: false });
  };

  // ---- Stats and streak ---------------------------------------------------

  function statsDefaults() {
    return { played: 0, streak: 0, maxStreak: 0, lastDay: null, best: 0, sum: 0 };
  }

  function dayTotal() {
    var total = 0;
    for (var i = 0; i < state.results.length; i++) total += state.results[i].total;
    return total;
  }

  function finishDay() {
    var total = dayTotal();
    var st = load(KEY_STATS, statsDefaults());
    if (st.lastDay !== dayIdx) {
      st.played += 1;
      st.streak = (st.lastDay === dayIdx - 1) ? st.streak + 1 : 1;
      st.maxStreak = Math.max(st.maxStreak, st.streak);
      st.best = Math.max(st.best, total);
      st.sum += total;
      st.lastDay = dayIdx;
      save(KEY_STATS, st);
    }
    save(KEY_DAY, { results: state.results, done: true });
    showResults(true, st);
  }
  hooks.onDayEnd = finishDay;

  function renderStreak(st) {
    if (st && (st.lastDay === dayIdx || st.lastDay === dayIdx - 1) && st.streak) {
      el.streak.textContent = '🔥 ' + st.streak;
      el.dot.hidden = false;
    } else {
      el.streak.textContent = '';
      el.dot.hidden = true;
    }
  }

  // ---- Results screen -----------------------------------------------------

  function renderTiles() {
    el.tiles.innerHTML = '';
    for (var i = 0; i < state.results.length; i++) {
      var r = state.results[i];
      var li = document.createElement('li');
      li.className = 'tier-' + C.tier(r.total);

      var n = document.createElement('span');
      n.className = 'bb-tile-n';
      n.textContent = String(i + 1);

      var title = document.createElement('span');
      title.className = 'bb-tile-title';
      title.textContent = rounds[i].book.title;

      var pts = document.createElement('span');
      pts.className = 'bb-tile-pts';
      pts.textContent = C.formatPoints(r.total);

      li.appendChild(n);
      li.appendChild(title);
      li.appendChild(pts);
      el.tiles.appendChild(li);
    }
  }

  function renderStats(st) {
    var average = st.played ? Math.round(st.sum / st.played) : 0;
    el.stats.textContent = 'Played ' + st.played + ' · Streak ' + st.streak + ' · Best ' + C.formatPoints(st.best) + ' · Average ' + C.formatPoints(average);
  }

  function showResults(justFinished, stats) {
    el.round.hidden = true;
    renderProgress(TOTAL_ROUNDS, state.results);

    var total = dayTotal();
    el.total.textContent = C.formatPoints(total) + ' / 5,000';
    renderTiles();

    var st = stats || load(KEY_STATS, statsDefaults());
    renderStats(st);
    renderStreak(st);

    el.resultsScreen.hidden = false;
    startCountdown();
    root.scrollIntoView({ block: 'start' });

    el.share.onclick = function () { onShare(total, st); };
  }

  // ---- Share ----------------------------------------------------------------

  function copyFallback(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    showShareNote();
  }

  function showShareNote() {
    el.shareNote.textContent = 'Copied.';
    setTimeout(function () { el.shareNote.textContent = ''; }, 2000);
  }

  function onShare(total, st) {
    var text = C.shareText({
      dayNumber: dayIdx + 1,
      total: total,
      roundTotals: state.results.map(function (r) { return r.total; }),
      streak: st.streak,
      url: URL
    });

    var mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints || 0) > 1;

    if (mobile && navigator.share && (!navigator.canShare || navigator.canShare({ text: text }))) {
      navigator.share({ text: text }).catch(function () {});
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(showShareNote, function () { copyFallback(text); });
    } else {
      copyFallback(text);
    }
  }

  // ---- Countdown --------------------------------------------------------

  var countdownTimer = null;

  function tick() {
    var now = new Date();
    if (C.dayIndex(now, schedule.epoch) !== dayIdx) {
      el.countdown.textContent = 'A new Blue Book is ready. Reload the page.';
      if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
      return;
    }
    var next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    var diff = next - now;
    var h = Math.floor(diff / 3600000);
    var m = Math.floor((diff % 3600000) / 60000);
    el.countdown.textContent = 'Next Blue Book in ' + h + 'h ' + m + 'm';
  }

  function startCountdown() {
    tick();
    if (!countdownTimer) countdownTimer = setInterval(tick, 30000);
  }

  // ---- Boot ---------------------------------------------------------------

  function boot() {
    el.daynum.textContent = '#' + (dayIdx + 1);
    var st = load(KEY_STATS, statsDefaults());
    renderStreak(st);

    var saved = load(KEY_DAY, null);
    if (!(saved && Array.isArray(saved.results))) saved = null;
    if (saved && saved.done) {
      state.results = saved.results;
      showResults(false);
    } else if (saved && saved.results.length >= TOTAL_ROUNDS) {
      // All five rounds were scored but the day was never finalized (e.g.
      // the tab closed on the round-5 reveal screen before "See results").
      state.results = saved.results;
      finishDay();
    } else if (saved) {
      state.results = saved.results;
      startRound(saved.results.length);
    } else {
      startRound(0);
    }
  }

  boot();
})();
