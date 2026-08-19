// Blue Book (/blue-book/): boot, data, and the round interaction state
// machine (search, guesses, hints, year control, reveal), the results
// screen, and daily persistence.
(function () {
  var root = document.getElementById('bb-app');
  if (!root || !window.BlueBookCore) return;
  var C = window.BlueBookCore;
  var books = JSON.parse(document.getElementById('bb-data').textContent);
  var schedule = JSON.parse(document.getElementById('bb-schedule').textContent);
  var library = JSON.parse(document.getElementById('bb-library').textContent);
  var URL = 'tristansaucedo.com/blue-book';
  var TOTAL_ROUNDS = 5;
  var MAX_MATCHES = 8;

  var dayIdx = C.dayIndex(new Date(), schedule.epoch);
  var rounds = C.roundsForDay(schedule, books, dayIdx);   // [{book, passage}]
  var range = C.sliderRange(books);
  // The searchable list: the canon plus several hundred decoy titles, so the
  // box cannot be walked letter by letter to find the ten real answers.
  var entries = C.mergeLibrary(books, library);

  var el = {
    head: document.getElementById('bb-head'),
    progressRow: document.getElementById('bb-progress-row'),
    progress: document.getElementById('bb-progress'),
    hintsBtn: document.getElementById('bb-hints-btn'),
    hintsPanel: document.getElementById('bb-hints-panel'),
    round: document.getElementById('bb-round'),
    passage: document.getElementById('bb-passage'),
    hintEra: document.getElementById('bb-hint-era'),
    hintClue: document.getElementById('bb-hint-clue'),
    hintFamous: document.getElementById('bb-hint-famous'),
    hintOut: document.getElementById('bb-hint-out'),
    searchWrap: document.getElementById('bb-search-wrap'),
    search: document.getElementById('bb-search'),
    results: document.getElementById('bb-results'),
    picked: document.getElementById('bb-picked'),
    yearNum: document.getElementById('bb-year-num'),
    yearSlider: document.getElementById('bb-year-slider'),
    sliderBand: document.getElementById('bb-slider-band'),
    feedback: document.getElementById('bb-feedback'),
    misses: document.getElementById('bb-misses'),
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
    cardFields: document.getElementById('bb-card-fields'),
    cardRows: document.getElementById('bb-card-rows'),
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

  // No em dash ever reaches the screen. The canon is kept clear of them, and
  // anything that slips through anyway (a Gutenberg text's "--", a real em or
  // en dash) renders as one spaced hyphen: "story - the story".
  function plainDashes(text) {
    return text.replace(/\s*(?:--|—|–)\s*/g, ' - ');
  }

  function appendParagraphs(container, text) {
    text.split(/\n\s*\n/).forEach(function (para) {
      var p = document.createElement('p');
      p.textContent = plainDashes(para);
      container.appendChild(p);
    });
  }

  function renderPassage(text) {
    el.passage.innerHTML = '';
    appendParagraphs(el.passage, text);
  }

  function renderProgress(current, results) {
    // current: 0-based index of the round in play. results: completed round
    // results so far, in order (used to mark earlier rings is-done).
    el.progress.innerHTML = '';
    for (var i = 0; i < TOTAL_ROUNDS; i++) {
      var li = document.createElement('li');
      li.textContent = String(i + 1);
      if (i < results.length) {
        li.className = 'is-done';
      } else if (i === current) {
        li.className = 'is-current';
      }
      el.progress.appendChild(li);
    }
  }

  // ---- Year control --------------------------------------------------------

  // "1848", "725 BCE", "725 bc", " -725 ", "−725" (Unicode minus, which is what
  // the field itself prints) all parse; anything else returns the fallback so a
  // typo restores the year the control already held.
  function parseYearInput(raw, fallback) {
    var s = String(raw).replace(/\s+/g, '').replace(/−/g, '-');
    var era = s.match(/(bce|bc)$/i);
    if (era) s = s.slice(0, s.length - era[1].length);
    var n = parseInt(s, 10);
    if (isNaN(n)) return fallback;
    return era ? -Math.abs(n) : n;
  }

  function setYear(y) {
    y = Math.max(range.min, Math.min(range.max, y));
    state.cur.year = y;
    el.yearNum.value = C.yearLabel(y);
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

  el.yearSlider.addEventListener('input', function () {
    setYear(C.sliderToYear(+el.yearSlider.value, range));
  });
  el.yearNum.addEventListener('change', function () {
    setYear(parseYearInput(el.yearNum.value, state.cur.year));
  });

  // ---- Search and pick -------------------------------------------------------

  function updateActive() {
    var items = el.results.children;
    for (var i = 0; i < items.length; i++) {
      items[i].classList.toggle('is-active', i === activeIdx);
    }
    if (activeIdx >= 0 && items[activeIdx]) items[activeIdx].scrollIntoView({ block: 'nearest' });
  }

  function showMatches(matches, autoActive) {
    currentMatches = matches;
    activeIdx = (autoActive && matches.length) ? 0 : -1;
    el.results.innerHTML = '';

    if (!matches.length) {
      var empty = document.createElement('li');
      empty.className = 'bb-res-empty';
      empty.textContent = 'No match';
      el.results.appendChild(empty);
    } else {
      matches.forEach(function (entry, i) {
        var li = document.createElement('li');
        li.setAttribute('role', 'option');
        if (i === activeIdx) li.className = 'is-active';
        var strong = document.createElement('strong');
        strong.textContent = entry.title;
        li.appendChild(strong);
        // A handful of library entries (Beowulf, Gilgamesh, the Song of Roland)
        // have no author; they get the title line only.
        if (entry.author) {
          var author = document.createElement('span');
          author.className = 'bb-res-author';
          author.textContent = entry.author;
          li.appendChild(author);
        }
        // pointerdown, not click: on a phone the tap collapses the keyboard
        // and blurs the input, which can swallow a click on a moving row.
        li.addEventListener('pointerdown', function (e) {
          e.preventDefault();
          pick(entry);
        });
        el.results.appendChild(li);
      });
    }

    el.results.hidden = false;
    el.results.scrollTop = 0;
  }

  function closeResults() {
    el.results.hidden = true;
  }

  // Everything still guessable this round: an entry already guessed drops out
  // so it cannot be offered (or picked) twice.
  function availableEntries() {
    var guessed = state.cur.guessIds;
    return entries.filter(function (e) { return guessed.indexOf(e.id) === -1; });
  }

  // Empty box: the whole library, alphabetical and scrollable, so the list
  // reads as "choose from all of these". Typing narrows it to MAX_MATCHES.
  function openResults() {
    if (!state.cur || state.cur.ended) return;
    var query = el.search.value.trim();
    var pool = availableEntries();
    showMatches(query ? C.searchBooks(pool, query, MAX_MATCHES) : pool, !!query);
  }

  function pick(entry) {
    state.cur.picked = entry;
    el.picked.textContent = entry.author ? entry.title + ' · ' + entry.author : entry.title;
    var x = document.createElement('button');
    x.type = 'button';
    x.className = 'bb-picked-x';
    x.setAttribute('aria-label', 'Clear');
    x.textContent = '×';
    x.addEventListener('click', unpick);
    el.picked.appendChild(x);
    el.picked.hidden = false;
    el.search.value = '';
    closeResults();
    el.guess.disabled = false;
  }

  function unpick() {
    state.cur.picked = null;
    el.picked.hidden = true;
    el.picked.textContent = '';
    el.guess.disabled = true;
  }

  el.search.addEventListener('input', openResults);
  el.search.addEventListener('focus', openResults);

  document.addEventListener('pointerdown', function (e) {
    if (!el.searchWrap.contains(e.target)) closeResults();
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
      if (el.results.hidden || activeIdx < 0 || !currentMatches[activeIdx]) return;
      e.preventDefault();
      pick(currentMatches[activeIdx]);
    } else if (e.key === 'Escape') {
      closeResults();
    }
  });

  // ---- Guessing --------------------------------------------------------------

  // The books already ruled out, kept on screen through the reveal: they are
  // part of the round's record, and they cost points.
  function addMiss(entry) {
    var li = document.createElement('li');
    li.className = 'bb-miss';

    var x = document.createElement('span');
    x.className = 'bb-miss-x';
    x.setAttribute('aria-hidden', 'true');
    x.textContent = '×';

    var text = document.createElement('span');
    text.className = 'bb-miss-text';
    text.textContent = entry.author ? entry.title + ' · ' + entry.author : entry.title;

    li.appendChild(x);
    li.appendChild(text);
    el.misses.appendChild(li);
    el.misses.hidden = false;
  }

  function onGuess() {
    if (!state.cur.picked || state.cur.ended) return;
    var picked = state.cur.picked;
    state.cur.guessIds.push(picked.id);
    var answer = rounds[state.round].book;
    if (picked.id === answer.id) {
      endRound(true);
      return;
    }
    // No "right author" note: the only hints are the ones you pay for.
    var left = 3 - state.cur.guessIds.length;
    addMiss(picked);
    var text = 'Wrong.';
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

  function setHintsOpen(open) {
    el.hintsPanel.hidden = !open;
    el.hintsBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  el.hintsBtn.addEventListener('click', function () {
    setHintsOpen(el.hintsPanel.hidden);
  });

  function useHint(name) {
    if (!state.cur || state.cur.ended) return;
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

  // Indexed by the number of wrong guesses before the right one, so one miss
  // makes the book the 2nd guess.
  var GUESS_ORDINALS = ['1st', '2nd', '3rd'];

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
    el.yearSlider.disabled = true;
    el.hintEra.disabled = true;
    el.hintClue.disabled = true;
    el.hintFamous.disabled = true;
    el.hintsBtn.disabled = true;
    setHintsOpen(false);
    closeResults();

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

    // Wrong guesses get no row of their own: they come off the book line,
    // whose label names the guess that landed it.
    el.breakdown.innerHTML = '';
    var bookLabel = 'Book';
    if (result.correct && wrong > 0) bookLabel += ' (' + GUESS_ORDINALS[wrong] + ' guess)';
    addBreakdownRow(bookLabel, String(result.book));
    addBreakdownRow('Year (you said ' + C.yearLabel(result.year) + ')', String(result.yearPts));
    if (result.hintsUsed.length > 0) {
      addBreakdownRow('Hints (' + result.hintsUsed.length + ')', '−' + (100 * result.hintsUsed.length));
    }
    addBreakdownRow('Round total', String(result.total), 'bb-breakdown-total');

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
    el.misses.innerHTML = '';
    el.misses.hidden = true;
    el.reveal.hidden = true;

    el.hintOut.innerHTML = '';
    el.hintOut.hidden = true;
    paintBand(null);

    el.search.disabled = false;
    el.search.value = '';
    el.results.innerHTML = '';
    closeResults();
    currentMatches = [];
    activeIdx = -1;
    unpick();

    el.giveup.disabled = false;
    el.yearNum.disabled = false;
    el.yearSlider.disabled = false;

    el.progressRow.hidden = false;
    el.hintsBtn.hidden = false;
    el.hintsBtn.disabled = false;
    setHintsOpen(false);

    Object.keys(hintBtns).forEach(function (name) {
      var btn = hintBtns[name];
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
    el.head.hidden = false;
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

  // Testing aid: /blue-book/?reset drops every stored key and then strips the
  // query string, so the page boots fresh and a refresh does not wipe again.
  function resetStorage() {
    try {
      var keys = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('bb:v1:') === 0) keys.push(k);
      }
      for (var j = 0; j < keys.length; j++) localStorage.removeItem(keys[j]);
      history.replaceState(null, '', location.pathname);
    } catch (e) {}
  }

  hooks.onRoundEnd = function () {
    save(KEY_DAY, { results: state.results, done: false });
  };

  // ---- Stats and streak ---------------------------------------------------

  function statsDefaults() {
    return { played: 0, streak: 0, maxStreak: 0, lastDay: null, best: 0, sum: 0 };
  }

  function dayTotal(results) {
    var total = 0;
    for (var i = 0; i < results.length; i++) total += results[i].total;
    return total;
  }

  function finishDay() {
    var total = dayTotal(state.results);
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

  // ---- Results screen -----------------------------------------------------

  // The card is the cover of a graded blue book: a run of labelled fields,
  // then one ruled line per round. Edit this list to reshape the cover: one
  // entry is one field line, in order, and `value` is handed a ctx of
  // { dateLabel, dayNumber, total }.
  var CARD_FIELDS = [
    { label: 'Date',    value: function (ctx) { return ctx.dateLabel; } },
    { label: 'Subject', value: function (ctx) { return 'The classics'; } },
    { label: 'Class',   value: function (ctx) { return 'Blue Book No. ' + ctx.dayNumber; } },
    { label: 'Score',   value: function (ctx) { return C.formatPoints(ctx.total) + ' / 5,000'; } },
    { label: 'Grade',   value: function (ctx) { return C.grade(ctx.total); } }
  ];

  // Every field value carries a class off its label ('Grade' -> the
  // bb-card-field-grade the CSS enlarges), so a new field can be styled
  // without touching this function.
  function fieldClass(label) {
    return 'bb-card-field-' + label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  function rowSpan(className, text) {
    var span = document.createElement('span');
    span.className = className;
    span.textContent = text;
    return span;
  }

  function renderCard(results) {
    var ctx = {
      dateLabel: new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }),
      dayNumber: dayIdx + 1,
      total: dayTotal(results)
    };

    el.cardFields.innerHTML = '';
    for (var f = 0; f < CARD_FIELDS.length; f++) {
      var field = CARD_FIELDS[f];
      var row = document.createElement('div');
      row.className = 'bb-card-field';
      var dt = document.createElement('dt');
      dt.textContent = field.label;
      var dd = document.createElement('dd');
      dd.className = fieldClass(field.label);
      dd.textContent = field.value(ctx);
      row.appendChild(dt);
      row.appendChild(dd);
      el.cardFields.appendChild(row);
    }

    el.cardRows.innerHTML = '';
    for (var i = 0; i < results.length; i++) {
      var r = results[i];
      var li = document.createElement('li');
      li.appendChild(rowSpan('bb-row-n', String(i + 1)));
      li.appendChild(rowSpan('bb-row-title', rounds[i].book.title));
      li.appendChild(rowSpan('bb-row-split', 'Book ' + r.book + ' · Year ' + r.yearPts));
      li.appendChild(rowSpan('bb-row-pts', C.formatPoints(r.total)));
      el.cardRows.appendChild(li);
    }
  }

  // The streak is still counted and saved; it is just kept off the screen for
  // now, so this line reads Played / Best / Average only.
  function renderStats(st) {
    var average = st.played ? Math.round(st.sum / st.played) : 0;
    el.stats.textContent = 'Played ' + st.played + ' · Best ' + C.formatPoints(st.best) + ' · Average ' + C.formatPoints(average);
  }

  function showResults(justFinished, stats) {
    el.round.hidden = true;
    // The card is the whole screen and names the game itself, so the page
    // header goes away with the rings and the hints button.
    el.head.hidden = true;
    el.progressRow.hidden = true;
    setHintsOpen(false);
    renderProgress(TOTAL_ROUNDS, state.results);

    var total = dayTotal(state.results);
    renderCard(state.results);

    var st = stats || load(KEY_STATS, statsDefaults());
    renderStats(st);

    el.resultsScreen.hidden = false;
    startCountdown();
    root.scrollIntoView({ block: 'start' });

    el.share.onclick = function () { onShare(total); };
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

  function onShare(total) {
    var text = C.shareText({
      dayNumber: dayIdx + 1,
      total: total,
      roundTotals: state.results.map(function (r) { return r.total; }),
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
    if (/[?&]reset\b/.test(location.search)) resetStorage();

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
