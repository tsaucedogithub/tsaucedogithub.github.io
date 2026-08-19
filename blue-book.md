---
layout: default
title: Blue Book
permalink: /blue-book/
description: Five passages from the classics every day. Name the book, place it in time.
body_class: blue-book
stylesheet: /assets/css/blue-book.css
---

<div class="bb" id="bb-app">

  <header class="bb-head" id="bb-head">
    <div class="bb-head-block">
      <h1 class="bb-title">Blue Book</h1>
      <p class="bb-tagline">From the passage, guess the book and its publication year.</p>
    </div>
  </header>

  <div class="bb-progress-row" id="bb-progress-row">
    <ol class="bb-progress" id="bb-progress" aria-label="Rounds"></ol>
    <button type="button" class="bb-hints-btn" id="bb-hints-btn" aria-expanded="false" aria-controls="bb-hints-panel">Hints</button>
  </div>

  <div class="bb-hints" id="bb-hints-panel" hidden>
    <button type="button" class="bb-hint" id="bb-hint-era" data-hint="era"><span class="bb-hint-name">Era</span><span class="bb-hint-cost">10% off</span></button>
    <button type="button" class="bb-hint" id="bb-hint-clue" data-hint="clue"><span class="bb-hint-name">Author clue</span><span class="bb-hint-cost">10% off</span></button>
    <button type="button" class="bb-hint" id="bb-hint-famous" data-hint="famous"><span class="bb-hint-name">Famous passage</span><span class="bb-hint-cost">10% off</span></button>
  </div>

  <section class="bb-round" id="bb-round" hidden>
    <blockquote class="bb-passage" id="bb-passage"></blockquote>

    <div class="bb-hint-out" id="bb-hint-out" hidden></div>

    <div class="bb-guess">
      <label class="bb-label" for="bb-search">Which book?</label>
      <div class="bb-search-wrap" id="bb-search-wrap">
        <input type="text" id="bb-search" class="bb-search" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="Start typing a title or author">
        <ul class="bb-results" id="bb-results" role="listbox" hidden></ul>
      </div>
      <p class="bb-picked" id="bb-picked" hidden></p>
    </div>

    <div class="bb-year">
      <label class="bb-label" for="bb-year-num">When was it written?</label>
      <div class="bb-slider-wrap">
        <div class="bb-slider-band" id="bb-slider-band"></div>
        <input type="range" id="bb-year-slider" class="bb-slider" min="0" max="1000" step="1">
      </div>
      <div class="bb-year-row">
        <input type="text" id="bb-year-num" class="bb-year-num" inputmode="numeric" autocomplete="off">
      </div>
    </div>

    <p class="bb-feedback" id="bb-feedback" aria-live="polite"></p>
    <ul class="bb-misses" id="bb-misses" hidden></ul>

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
    <div class="bb-card" id="bb-card">
      <div class="bb-card-grade" id="bb-card-grade">
        <span class="bb-card-grade-label">Grade</span>
        <span class="bb-card-grade-value" id="bb-card-grade-value"></span>
      </div>
      <p class="bb-card-kicker">Blue Book</p>
      <h2 class="bb-card-title">Literary Examination</h2>
      <dl class="bb-card-fields" id="bb-card-fields"></dl>
      <ol class="bb-card-rows" id="bb-card-rows"></ol>
      <div class="bb-card-notes">
        <p class="bb-card-comments-label">Instructor's comments:</p>
        <p class="bb-card-comment" id="bb-card-comment"></p>
      </div>
      <p class="bb-card-foot">tristansaucedo.com/blue-book</p>
    </div>
    <p class="bb-actions">
      <button type="button" class="bb-btn bb-btn-primary" id="bb-share">Share</button>
      <span class="bb-share-note" id="bb-share-note" aria-live="polite"></span>
    </p>
    <p class="bb-stats" id="bb-stats"></p>
    <p class="bb-countdown" id="bb-countdown"></p>
  </section>

  <p class="bb-noscript"><noscript>Blue Book needs JavaScript.</noscript></p>
</div>

<script type="application/json" id="bb-data">{{ site.data.blue_book | jsonify | replace: '</', '<\/' }}</script>
<script type="application/json" id="bb-schedule">{{ site.data.blue_book_schedule | jsonify | replace: '</', '<\/' }}</script>
<script type="application/json" id="bb-library">{{ site.data.blue_book_library | jsonify | replace: '</', '<\/' }}</script>
<script src="{{ '/assets/js/blue-book-core.js' | relative_url }}"></script>
<script src="{{ '/assets/js/blue-book.js' | relative_url }}"></script>
