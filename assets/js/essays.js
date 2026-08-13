// Essays list: progressive enhancement over a server-rendered <ol>.
// Without this script all 337 rows show in document order and every link works.
// With it, the rows filter, sort, and can be picked from at random.
//
// Nothing here builds a row. The markup is Liquid's job; this only hides,
// reorders, and reads what is already in the DOM.
(function () {
  // Not "essays" — kramdown auto-assigns that id to the page's <h1>.
  var root = document.getElementById('essays-app');
  if (!root) return;

  var list      = document.getElementById('es-list');
  var rows      = Array.prototype.slice.call(list.querySelectorAll('.es-row'));
  var q         = document.getElementById('es-q');
  var sortSel   = document.getElementById('es-sort');
  var countEl   = document.getElementById('es-count');
  var chipsEl   = document.getElementById('es-chips');
  var clearBtn  = document.getElementById('es-clear');
  var emptyEl   = document.getElementById('es-empty');
  var controls  = document.getElementById('es-controls');
  var boxes     = Array.prototype.slice.call(root.querySelectorAll('.es-opt input[data-facet]'));
  var panels     = document.getElementById('es-panels');
  var backdrop   = document.getElementById('es-backdrop');
  var panelBtn   = document.getElementById('es-panel-toggle');
  var panelCount = document.getElementById('es-panels-count');
  var heroLength = document.getElementById('es-hero-length');

  // Facet name -> the data-* attribute it tests. 'tag' is the odd one out:
  // data-tags holds a pipe-joined list, so it needs a containment test.
  var FACET_ATTR = {
    tag: 'tags', length: 'length', form: 'form', century: 'century',
    access: 'access', gender: 'gender', nationality: 'nationality',
    language: 'language', author: 'author', recommended: 'recommended'
  };

  // Each facet holds a SET of accepted values. Within a facet the values are
  // OR-ed (French or German); across facets they are AND-ed. 'author' has no
  // checkboxes — it is only ever set by clicking a byline.
  var state = { q: '', sort: 'rec', facets: {} };

  function selected(facet) { return state.facets[facet] || []; }

  /* ---------------------------------------------------------------- filtering */

  function matches(row) {
    if (state.q) {
      var hay = row.getAttribute('data-search');
      var words = state.q.toLowerCase().split(/\s+/);
      for (var i = 0; i < words.length; i++) {
        if (words[i] && hay.indexOf(words[i]) === -1) return false;
      }
    }
    for (var facet in state.facets) {
      var want = state.facets[facet];
      if (!want || !want.length) continue;
      var got = row.getAttribute('data-' + FACET_ATTR[facet]) || '';
      var hit;
      if (facet === 'tag') {
        var mine = got.split('|');
        hit = want.some(function (v) { return mine.indexOf(v) !== -1; });
      } else {
        hit = want.indexOf(got) !== -1;
      }
      if (!hit) return false;
    }
    return true;
  }

  function visibleRows() {
    return rows.filter(function (r) { return !r.hidden; });
  }

  /* ----------------------------------------------------------------- sorting */

  function isRec(row) { return row.getAttribute('data-recommended') === 'yes' ? 0 : 1; }

  var SORTS = {
    // Default: Tristan's picks first, oldest first within each group.
    'rec':       function (a, b) { return isRec(a) - isRec(b) || num(a, 'year') - num(b, 'year'); },
    'year-asc':  function (a, b) { return num(a, 'year') - num(b, 'year'); },
    'year-desc': function (a, b) { return num(b, 'year') - num(a, 'year'); },
    // Rows with no word count sort last either way rather than pretending to be 0.
    'len-asc':   function (a, b) { return (num(a, 'words') || 1e9) - (num(b, 'words') || 1e9); },
    'len-desc':  function (a, b) { return num(b, 'words') - num(a, 'words'); },
    'author':    function (a, b) {
      return str(a, 'author-sort').localeCompare(str(b, 'author-sort')) || num(a, 'year') - num(b, 'year');
    },
    'title':     function (a, b) { return str(a, 'title').localeCompare(str(b, 'title')); }
  };

  function num(row, key) { return parseInt(row.getAttribute('data-' + key), 10) || 0; }
  function str(row, key) { return row.getAttribute('data-' + key) || ''; }

  /* --------------------------------------------------------- facet mutation */

  function toggleFacet(facet, value, on) {
    var cur = selected(facet).slice();
    var at = cur.indexOf(value);
    if (on && at === -1) cur.push(value);
    if (!on && at !== -1) cur.splice(at, 1);
    state.facets[facet] = cur;
    syncBoxes();
    render();
  }

  function setFacetSingle(facet, value) {
    state.facets[facet] = value ? [value] : [];
    syncBoxes();
    render();
  }

  // Checkbox DOM follows state, never the other way round.
  function syncBoxes() {
    boxes.forEach(function (b) {
      var chosen = selected(b.getAttribute('data-facet'));
      // A radio with an empty value is the "All" case: on when nothing is set.
      b.checked = b.type === 'radio' && b.value === ''
        ? chosen.length === 0
        : chosen.indexOf(b.value) !== -1;
    });
    updateAccordionSummaries();

    // The hero's "I have ___" mirrors the Length facet when exactly one
    // bucket is picked, and reads "any amount of time" otherwise.
    var chosen = selected('length');
    heroLength.value = chosen.length === 1 ? chosen[0] : '';
  }

  function updateAccordionSummaries() {
    Array.prototype.forEach.call(root.querySelectorAll('.es-acc-head'), function (head) {
      var facet = head.getAttribute('data-acc');
      var chosen = selected(facet);
      var out = head.querySelector('.es-acc-sel');
      var shown = chosen.filter(Boolean);
      out.textContent = shown.length ? shown.map(function (v) {
        return facet === 'recommended' ? 'Recommended by Tristan' : v;
      }).join(', ') : 'Any';
      out.classList.toggle('is-set', shown.length > 0);
    });
  }

  /* ------------------------------------------------------------------- chips */
  // Every active value gets its own dismissible chip, so one language can be
  // dropped while the other stays.

  function labelFor(facet, value) {
    var box = boxes.filter(function (b) {
      return b.getAttribute('data-facet') === facet && b.value === value;
    })[0];
    if (!box) return value;
    return box.parentNode.textContent.replace(/\s*\d+\s*$/, '').trim();
  }

  function renderChips() {
    chipsEl.textContent = '';
    var any = false;

    Object.keys(state.facets).forEach(function (facet) {
      selected(facet).forEach(function (value) {
        any = true;
        chipsEl.appendChild(makeChip(
          facet === 'author' ? value : (facet === 'recommended' ? 'Recommended by Tristan' : labelFor(facet, value)),
          function () { toggleFacet(facet, value, false); }
        ));
      });
    });

    if (state.q) {
      any = true;
      chipsEl.appendChild(makeChip('\u201C' + state.q + '\u201D', function () {
        q.value = '';
        state.q = '';
        render();
      }));
    }

    clearBtn.hidden = !any;
  }

  function makeChip(label, onRemove) {
    var chip = document.createElement('span');
    chip.className = 'es-chip';
    chip.appendChild(document.createTextNode(label));
    var x = document.createElement('button');
    x.type = 'button';
    x.className = 'es-chip-x';
    x.setAttribute('aria-label', 'Remove filter: ' + label);
    x.textContent = '\u00D7';
    x.addEventListener('click', onRemove);
    chip.appendChild(x);
    return chip;
  }

  /* ---------------------------------------------------------------- rendering */

  function render() {
    var shown = 0;
    rows.forEach(function (row) {
      var ok = matches(row);
      row.hidden = !ok;
      if (ok) shown++;
    });

    var ordered = rows.slice().sort(SORTS[state.sort] || SORTS['rec']);
    var frag = document.createDocumentFragment();
    ordered.forEach(function (row) { frag.appendChild(row); });
    list.appendChild(frag);

    countEl.textContent = shown === rows.length
      ? rows.length + ' essays'
      : shown + ' of ' + rows.length;

    renderChips();
    panelCount.textContent = shown === rows.length ? 'all ' + rows.length : shown;
    emptyEl.hidden = shown !== 0;
    writeUrl();
  }

  /* --------------------------------------------------------------- url state */
  // Filters live in the query string so a filtered view can be sent to someone.
  // Multiple values per facet are comma-separated.

  function writeUrl() {
    var params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    if (state.sort !== 'rec') params.set('sort', state.sort);
    Object.keys(state.facets).forEach(function (k) {
      if (selected(k).length) params.set(k, selected(k).join(','));
    });
    var qs = params.toString();
    history.replaceState(null, '', qs ? '?' + qs : location.pathname);
  }

  function readUrl() {
    var params = new URLSearchParams(location.search);
    state.q = params.get('q') || '';
    q.value = state.q;

    var s = params.get('sort');
    if (s && SORTS[s]) { state.sort = s; sortSel.value = s; }

    Object.keys(FACET_ATTR).forEach(function (facet) {
      var v = params.get(facet);
      if (v) state.facets[facet] = v.split(',');
    });

    syncBoxes();

    // Open any accordion section that arrived with a value already set.
    Array.prototype.forEach.call(root.querySelectorAll('.es-acc-head'), function (head) {
      if (selected(head.getAttribute('data-acc')).length) openSection(head, true);
    });
  }

  /* ---------------------------------------------------------------- controls */

  q.addEventListener('input', function () { state.q = q.value.trim(); render(); });
  sortSel.addEventListener('change', function () { state.sort = sortSel.value; render(); });

  boxes.forEach(function (box) {
    box.addEventListener('change', function () {
      if (box.type === 'radio') setFacetSingle(box.getAttribute('data-facet'), box.value);
      else toggleFacet(box.getAttribute('data-facet'), box.value, box.checked);
    });
  });

  // Clicking a topic chip or a byline on any row filters to it.
  list.addEventListener('click', function (e) {
    var tag = e.target.closest('.es-tag');
    if (tag) { setFacetSingle('tag', tag.getAttribute('data-tag')); return jumpUp(); }
    var author = e.target.closest('.es-author');
    if (author) { setFacetSingle('author', author.getAttribute('data-author')); return jumpUp(); }
  });

  function jumpUp() {
    controls.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function clearAll() {
    state.q = '';
    state.facets = {};
    q.value = '';
    syncBoxes();
    render();
  }

  clearBtn.addEventListener('click', clearAll);
  document.getElementById('es-reset').addEventListener('click', clearAll);

  heroLength.addEventListener('change', function () {
    setFacetSingle('length', heroLength.value);
  });

  /* ------------------------------------------------------------ compact view */
  // Remembered across visits — it is a reading preference, not a filter, so it
  // stays out of the URL.

  var compactBox = document.getElementById('es-compact');
  function setCompact(on) {
    list.classList.toggle('is-compact', on);
    compactBox.checked = on;
    try { localStorage.setItem('es-compact', on ? '1' : '0'); } catch (err) {}
  }
  compactBox.addEventListener('change', function () { setCompact(this.checked); });
  // Compact is the default. Only an explicit opt-out is remembered.
  try {
    var stored = localStorage.getItem('es-compact');
    setCompact(stored === null ? true : stored === '1');
  } catch (err) { setCompact(true); }

  /* --------------------------------------------------------------- accordion */

  function openSection(head, open) {
    head.setAttribute('aria-expanded', open ? 'true' : 'false');
    head.nextElementSibling.hidden = !open;
  }

  Array.prototype.forEach.call(root.querySelectorAll('.es-acc-head'), function (head) {
    head.addEventListener('click', function () {
      openSection(head, head.getAttribute('aria-expanded') !== 'true');
    });
  });

  /* ------------------------------------------------------- filters popover */
  // The filter set is eight sections deep, so it stays out of sight until
  // asked for. Escape, the backdrop, the close button and "Show N" all close it.

  var lastFocus = null;
  var frozenAt = 0;

  // Freeze the page behind the modal without losing the reader's place.
  var locks = 0;

  function lockScroll(on) {
    var html = document.documentElement;
    if (on) {
      if (++locks > 1) return;
      frozenAt = window.scrollY;
      var bar = window.innerWidth - html.clientWidth;
      if (bar > 0) html.style.paddingRight = bar + 'px';
      document.body.style.top = -frozenAt + 'px';
      html.classList.add('es-noscroll');
    } else {
      if (locks > 0 && --locks > 0) return;
      html.classList.remove('es-noscroll');
      document.body.style.top = '';
      html.style.paddingRight = '';
      window.scrollTo(0, frozenAt);
    }
  }

  // Two dialogs share one backdrop and one scroll lock: the filters and the
  // read-for-free note. Only one is ever open.
  var freeNote = document.getElementById('es-free');
  var freeBtn  = document.getElementById('es-free-toggle');
  var openDialog = null;

  var TRIGGER = {};
  TRIGGER['es-panels'] = panelBtn;
  TRIGGER['es-free'] = freeBtn;

  function showDialog(el, open) {
    if (open && openDialog && openDialog !== el) showDialog(openDialog, false);

    el.hidden = !open;
    backdrop.hidden = !open;
    var trigger = TRIGGER[el.id];
    trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    trigger.classList.toggle('is-active', open);

    lockScroll(open);

    if (open) {
      lastFocus = document.activeElement;
      el.scrollTop = 0;
      var first = el.querySelector('.es-acc-head, .es-btn, .es-panels-close');
      if (first) first.focus();
      openDialog = el;
    } else {
      openDialog = null;
      if (lastFocus) { lastFocus.focus(); lastFocus = null; }
    }
  }

  function openPanels(open) { showDialog(panels, open); }

  // Keep tabbing inside whichever dialog is open.
  [panels, freeNote].forEach(function (dlg) {
    dlg.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = dlg.querySelectorAll('button, input, select, a[href]');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  });

  panelBtn.addEventListener('click', function () { showDialog(panels, panels.hidden); });
  freeBtn.addEventListener('click', function () { showDialog(freeNote, freeNote.hidden); });
  backdrop.addEventListener('click', function () { if (openDialog) showDialog(openDialog, false); });
  document.getElementById('es-panels-close').addEventListener('click', function () { showDialog(panels, false); });
  document.getElementById('es-panels-done').addEventListener('click', function () { showDialog(panels, false); });
  document.getElementById('es-panels-clear').addEventListener('click', function () { clearAll(); });
  document.getElementById('es-free-close').addEventListener('click', function () { showDialog(freeNote, false); });
  document.getElementById('es-free-done').addEventListener('click', function () { showDialog(freeNote, false); });

  /* ------------------------------------------------------------ sticky pinning */
  // The page is ~97 screens tall. Once the controls scroll off there is no way
  // to steer, so they pin to the top and shed everything but the essential bar.

  var sentinel = document.getElementById('es-sentinel');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      var stuck = !entries[0].isIntersecting;
      controls.classList.toggle('is-stuck', stuck);
    }, { threshold: 0 }).observe(sentinel);
  }

  /* -------------------------------------------------------------- keyboard */

  document.addEventListener('keydown', function (e) {
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if (e.key === '/' && !typing) {
      e.preventDefault();
      controls.scrollIntoView({ block: 'start' });
      q.focus();
    } else if (e.key === 'Escape') {
      if (hero.classList.contains('is-spotlit')) return unspotlight();
      if (openDialog) return showDialog(openDialog, false);
      if (typing) document.activeElement.blur();
      clearAll();
    } else if ((e.key === 'r' || e.key === 'R') && !typing) {
      pickRandom();
    }
  });

  /* --------------------------------------------------------------- the stage */
  // Picking at random is the best thing this page does, so it takes over the
  // screen. Roughly four seconds of visible deliberation that slows as it
  // closes in, then the answer. Reduced motion skips straight to it.

  var hero      = document.querySelector('.es-hero');
  var heroIdle  = document.getElementById('es-hero-idle');
  var dim       = document.getElementById('es-dim');
  var stage     = document.getElementById('es-stage');
  var statusEl  = document.getElementById('es-stage-status');
  var shuffleEl = document.getElementById('es-stage-shuffle');
  var resultEl  = document.getElementById('es-stage-result');
  var pickBtn   = document.getElementById('es-pick');

  // The separators in .es-meta are CSS padding, not characters, so lift the
  // text and put real spaces back around them.
  function metaText(row) {
    return row.querySelector('.es-meta').textContent
      .replace(/\u00b7/g, ' \u00b7 ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  var LINES = [
    'Consulting the entropy pool',
    'Reading the lava lamps to ensure randomness',
    'Weighing the candidates',
    'Discarding the ones you would hate',
    'Asking the ghost of Montaigne',
    'Checking how much evening you have left',
    'Shuffling 181 hours of reading',
    'Rejecting the obvious answer',
    'Consulting a second opinion',
    'Consulting the oracles',
    'Warming up the good one'
  ];

  // Four seconds is right the first time and tedious the fourth. Resets on
  // reload.
  var SPINS = [4200, 3000, 2500, 2000];
  var spins = 0;

  var timers = [];
  function clearTimers() {
    timers.forEach(function (t) { clearTimeout(t); clearInterval(t); });
    timers = [];
  }
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

  // Dismissing the spotlight leaves the pick sitting in the box; it does not
  // throw the answer away.
  function unspotlight() {
    if (!hero.classList.contains('is-spotlit')) return;
    dim.hidden = true;
    hero.classList.remove('is-spotlit');
    lockScroll(false);
    // The selector does not come back. Once there is a pick, the box is the
    // pick: title, Read it, Spin again. Length is still reachable under
    // More filters, and Spin again honours it.
  }

  // Back to the selector and the button.
  function resetStage() {
    clearTimers();
    unspotlight();
    stage.hidden = true;
    stage.classList.remove('is-drawing', 'is-settled');
    resultEl.hidden = true;
    heroIdle.hidden = false;
    pickBtn.disabled = false;
  }

  function pickRandom() {
    var pool = visibleRows();
    if (!pool.length) return;
    var chosen = pool[Math.floor(Math.random() * pool.length)];

    clearTimers();
    heroIdle.hidden = true;
    stage.hidden = false;
    stage.classList.add('is-drawing');
    stage.classList.remove('is-settled');
    resultEl.hidden = true;
    pickBtn.disabled = true;

    // Everything except the box goes dark.
    // No scrolling. If you could see the button you can see the box, and
    // yanking the page around between spins is worse than a little offset.
    // Re-spinning must not stack a second lock on the first.
    var alreadyLit = hero.classList.contains('is-spotlit');
    dim.hidden = false;
    dim.classList.add('is-breathing');
    hero.classList.add('is-spotlit');
    if (!alreadyLit) lockScroll(true);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      shuffleEl.textContent = '';
      return settle(chosen);
    }

    var SPAN = SPINS[Math.min(spins++, SPINS.length - 1)];

    // Three status lines, drawn without repeats, paced to the spin so the
    // last one never lands after the answer.
    var picked = LINES.slice().sort(function () { return Math.random() - 0.5; }).slice(0, 3);
    statusEl.textContent = picked[0] + '\u2026';
    later(function () { statusEl.textContent = picked[1] + '\u2026'; }, SPAN * 0.30);
    later(function () { statusEl.textContent = picked[2] + '\u2026'; }, SPAN * 0.60);

    // Titles flick past, slowing on an ease-out curve so it lands rather
    // than stops. A fixed interval reads as a cut; this reads as a wheel.
    var titles = pool.map(function (r) { return r.getAttribute('data-title'); });
    var began = Date.now();

    (function tick() {
      var t = Math.min(1, (Date.now() - began) / SPAN);
      shuffleEl.textContent = titles[Math.floor(Math.random() * titles.length)];
      if (t >= 1) return settle(chosen);
      later(tick, 55 + Math.pow(t, 3) * 430);
    })();
  }

  function settle(row) {
    var link = row.querySelector('.es-title a');
    var mins = row.querySelector('.es-mins');

    document.getElementById('es-stage-link').textContent = row.getAttribute('data-title');
    document.getElementById('es-stage-link').href = link.href;
    document.getElementById('es-stage-read').href = link.href;
    document.getElementById('es-stage-meta').textContent = metaText(row);

    document.getElementById('es-stage-time').textContent = mins
      ? 'About ' + mins.textContent.replace(/(\d)min/, '$1 min') + ' to read'
      : '';
    statusEl.textContent = '';
    shuffleEl.textContent = '';
    stage.classList.remove('is-drawing');
    stage.classList.add('is-settled');
    dim.classList.remove('is-breathing');
    resultEl.hidden = false;
    document.getElementById('es-stage-read').focus();
  }

  pickBtn.addEventListener('click', pickRandom);
  document.getElementById('es-stage-again').addEventListener('click', pickRandom);
  document.getElementById('es-stage-filters').addEventListener('click', function () {
    showDialog(panels, true);
  });
  document.getElementById('es-stage-free').addEventListener('click', function () {
    showDialog(freeNote, true);
  });

  dim.addEventListener('click', unspotlight);
  document.getElementById('es-stage-read').addEventListener('click', unspotlight);

  /* -------------------------------------------------------------------- init */

  readUrl();
  render();
})();
