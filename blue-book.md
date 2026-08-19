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
    <p class="bb-meta"><span id="bb-daynum"></span> <span class="bb-dot" id="bb-dot" hidden>·</span> <span id="bb-streak"></span></p>
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

<script type="application/json" id="bb-data">{{ site.data.blue_book | jsonify | replace: '</', '<\/' }}</script>
<script type="application/json" id="bb-schedule">{{ site.data.blue_book_schedule | jsonify | replace: '</', '<\/' }}</script>
<script src="{{ '/assets/js/blue-book-core.js' | relative_url }}"></script>
<script src="{{ '/assets/js/blue-book.js' | relative_url }}"></script>
