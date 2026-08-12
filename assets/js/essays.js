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
  var boxes     = Array.prototype.slice.call(root.querySelectorAll('.es-opt input[type="checkbox"]'));
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
    language: 'language', author: 'author'
  };

  // Each facet holds a SET of accepted values. Within a facet the values are
  // OR-ed (French or German); across facets they are AND-ed. 'author' has no
  // checkboxes — it is only ever set by clicking a byline.
  var state = { q: '', sort: 'year-asc', facets: {} };

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

  var SORTS = {
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
      b.checked = selected(b.getAttribute('data-facet')).indexOf(b.value) !== -1;
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
      out.textContent = chosen.length ? chosen.join(', ') : 'Any';
      out.classList.toggle('is-set', chosen.length > 0);
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
          facet === 'author' ? value : labelFor(facet, value),
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

    var ordered = rows.slice().sort(SORTS[state.sort] || SORTS['year-asc']);
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
    if (state.sort !== 'year-asc') params.set('sort', state.sort);
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
      toggleFacet(box.getAttribute('data-facet'), box.value, box.checked);
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
    hideReveal();
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

  function openPanels(open) {
    panels.hidden = !open;
    backdrop.hidden = !open;
    panelBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    panelBtn.classList.toggle('is-active', open);
    if (open) panels.querySelector('.es-acc-head').focus();
  }

  panelBtn.addEventListener('click', function () { openPanels(panels.hidden); });
  backdrop.addEventListener('click', function () { openPanels(false); });
  document.getElementById('es-panels-close').addEventListener('click', function () { openPanels(false); });
  document.getElementById('es-panels-done').addEventListener('click', function () { openPanels(false); });
  document.getElementById('es-panels-clear').addEventListener('click', function () { clearAll(); });

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
      if (!panels.hidden) return openPanels(false);
      if (typing) document.activeElement.blur();
      clearAll();
    } else if ((e.key === 'r' || e.key === 'R') && !typing) {
      pickRandom();
    }
  });

  /* ----------------------------------------------------------- the reveal */
  // Picking at random is the best thing this page does, so it gets to take
  // its time about it. Roughly four seconds of visible deliberation, then
  // the answer. Anyone who has asked for reduced motion just gets the answer.

  var reveal    = document.getElementById('es-reveal');
  var statusEl  = document.getElementById('es-reveal-status');
  var shuffleEl = document.getElementById('es-reveal-shuffle');
  var resultEl  = document.getElementById('es-reveal-result');
  var pickBtn   = document.getElementById('es-pick');

  var LINES = [
    'Consulting the entropy pool',
    'Reading the lava lamps to ensure randomness',
    'Weighing the candidates',
    'Discarding the ones you would hate',
    'Asking the ghost of Montaigne',
    'Checking how much evening you have left',
    'Shuffling 145 hours of reading',
    'Rejecting the obvious answer',
    'Consulting a second opinion',
    'Warming up the good one'
  ];

  var timers = [];
  function clearTimers() {
    timers.forEach(function (t) { clearTimeout(t); clearInterval(t); });
    timers = [];
  }
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

  function hideReveal() {
    clearTimers();
    reveal.hidden = true;
    resultEl.hidden = true;
    shuffleEl.textContent = '';
    statusEl.textContent = '';
    reveal.classList.remove('is-settled');
    pickBtn.disabled = false;
    pickBtn.textContent = 'Pick one for me';
  }

  function pickRandom() {
    var pool = visibleRows();
    if (!pool.length || pickBtn.disabled) return;
    var chosen = pool[Math.floor(Math.random() * pool.length)];

    clearTimers();
    reveal.hidden = false;
    reveal.classList.remove('is-settled');
    resultEl.hidden = true;
    pickBtn.disabled = true;
    reveal.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      statusEl.textContent = 'Picked from ' + pool.length;
      shuffleEl.textContent = '';
      settle(chosen, pool.length);
      return;
    }

    // Titles flicker past while the status line changes underneath.
    var titles = pool.map(function (r) { return r.getAttribute('data-title'); });
    var flicker = setInterval(function () {
      shuffleEl.textContent = titles[Math.floor(Math.random() * titles.length)];
    }, 70);
    timers.push(flicker);

    // Three status lines, drawn without repeats, ~1.2s each.
    var picked = LINES.slice().sort(function () { return Math.random() - 0.5; }).slice(0, 3);
    statusEl.textContent = picked[0] + '…';
    later(function () { statusEl.textContent = picked[1] + '…'; }, 1250);
    later(function () { statusEl.textContent = picked[2] + '…'; }, 2500);

    later(function () {
      clearInterval(flicker);
      shuffleEl.textContent = '';
      settle(chosen, pool.length);
    }, 3900);
  }

  function settle(row, poolSize) {
    var title = row.querySelector('.es-title').innerHTML;
    var meta  = row.querySelector('.es-meta').innerHTML;
    var blurb = row.querySelector('.es-blurb');
    var time = ['.es-mins', '.es-words'].map(function (sel) {
      var el = row.querySelector(sel);
      return el ? el.textContent.trim().replace(/(\d)min/, '$1 min') : '';
    }).filter(Boolean).join(' · ');

    resultEl.innerHTML =
      '<h2 class="es-title es-reveal-title">' + title + '</h2>' +
      '<p class="es-meta">' + meta + '</p>' +
      (blurb ? '<p class="es-blurb">' + blurb.innerHTML + '</p>' : '') +
      '<p class="es-reveal-foot">' + time + ' · picked at random from ' + poolSize + '</p>';

    statusEl.textContent = 'Read this one.';
    resultEl.hidden = false;
    reveal.classList.add('is-settled');
    pickBtn.disabled = false;
    pickBtn.textContent = 'Pick another';
  }

  pickBtn.addEventListener('click', pickRandom);

  /* -------------------------------------------------------------------- init */

  readUrl();
  render();
})();
