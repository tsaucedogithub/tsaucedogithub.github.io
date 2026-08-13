---
layout: default
title: What the F should I read?
permalink: /what-the-f-should-i-read/
redirect_from:
  - /essays/
body_class: essays
description: A working list of 337 essays, stories, speeches and letters worth your evening — sortable by length, subject and form.
---

# What the F should I read?

<!-- ═══════════════════════════════════════════════════════════════════════
     WRITE HERE. Everything between this marker and END INTRO is yours.
     Two paragraphs, plain <p class="es-intro"> tags. Add or remove freely.

     Two Liquid values are available if you want live numbers:
       {{ site.data.essays | size }}   total count, currently 337
       {{ short }}                     how many take 20 minutes or less
     ═══════════════════════════════════════════════════════════════════ -->

<p class="es-intro">I've been spending less time scrolling thanks to an app I built called <a href="https://getyourtimeback.app" target="_blank" rel="noopener noreferrer">Timeback</a>, but that only works if you replace it with something. Thus, I've been trying to read more. I started using essays as an easy way to get my <a href="https://clubviolet.substack.com/" target="_blank" rel="noopener noreferrer">bookclub</a> to read more and meet more consistently.</p>

<p class="es-intro">So here is an essay picker. I wrote a function to guess how long it will take to read something and then organized a list of essays I liked, then found some beyond that (authors I like, pieces I want to read, etc) and put them all here. Should be pretty obvious how to use this.</p>

<!-- ──────────────────────────────── END INTRO ──────────────────────────────── -->

<!-- id is "essays-app", not "essays": kramdown auto-assigns id="essays" to the <h1> above. -->
<div class="essays" id="essays-app">

  <div class="es-hero">
    <p class="es-hero-line">
      <label for="es-hero-length">I have</label>
      <select id="es-hero-length">
        <option value="">any amount of time</option>
        {%- for l in site.data.essay_facets.lengths -%}
          {%- assign n = site.data.essays | where: "length", l.value | size -%}
          {%- if n > 0 and l.value != "unknown" -%}
          <option value="{{ l.value | escape }}">{{ l.label | downcase }}</option>
          {%- endif -%}
        {%- endfor -%}
      </select>
    </p>
    <button type="button" class="es-hero-btn" id="es-pick">Pick one for me</button>

    <div class="es-reveal" id="es-reveal" hidden>
      <p class="es-reveal-status" id="es-reveal-status" aria-live="polite"></p>
      <p class="es-reveal-shuffle" id="es-reveal-shuffle" aria-hidden="true"></p>
      <div class="es-reveal-result" id="es-reveal-result" hidden></div>
    </div>
  </div>

  <!-- Watched by an IntersectionObserver; when it leaves the viewport the bar pins. -->
  <div class="es-sentinel" id="es-sentinel" aria-hidden="true"></div>

  <div class="es-controls" id="es-controls">
    <div class="es-bar">
      <label class="es-vh" for="es-q">Search essays</label>
      <input type="search" id="es-q" placeholder="Search title, author, or subject…" autocomplete="off">
      <label class="es-vh" for="es-sort">Sort</label>
      <select id="es-sort">
        <option value="year-asc">Oldest first</option>
        <option value="year-desc">Newest first</option>
        <option value="len-asc">Shortest first</option>
        <option value="len-desc">Longest first</option>
        <option value="author">Author A–Z</option>
        <option value="title">Title A–Z</option>
      </select>
    </div>

    <p class="es-links">
      <button type="button" class="es-morelink" id="es-panel-toggle" aria-expanded="false" aria-controls="es-panels">More filters</button>
      <button type="button" class="es-morelink" id="es-free-toggle" aria-expanded="false" aria-controls="es-free">Read for free</button>
    </p>

    <div class="es-status">
      <span class="es-count" id="es-count">{{ site.data.essays | size }} essays</span>
      <span class="es-chips" id="es-chips"></span>
      <button type="button" class="es-linkbtn es-clear" id="es-clear" hidden>Clear all</button>
    </div>
  </div>

    <div class="es-backdrop" id="es-backdrop" hidden></div>

    <div class="es-panels es-note" id="es-free" hidden role="dialog" aria-label="Read for free" aria-modal="true">
      <div class="es-panels-head es-panels-head-bare">
        <button type="button" class="es-panels-close" id="es-free-close" aria-label="Close">&times;</button>
      </div>
      <div class="es-note-body">
        <p>Some of these essays may be hidden behind a paywall.</p>
        <p>Just as you shouldn't download a car, you should never illegally pirate (by using Z-Library or LibGen) or access pieces of media that are hidden behind a paywall (by making a free account you intend to cancel, or removing the auth token from the internet link, or through some other easily googleable method).</p>
        <p>To do so for personal use in the pursuit of knowledge would be&hellip; well, I won't tell you whether it's good or bad. I'll let you make those moral judgments yourself.</p>
      </div>
      <div class="es-panels-foot">
        <span></span>
        <button type="button" class="es-btn es-btn-primary" id="es-free-done">Aye aye, Captain</button>
      </div>
    </div>

    <div class="es-panels" id="es-panels" hidden role="dialog" aria-label="Filter essays" aria-modal="true">
      <div class="es-panels-head">
        <span class="es-panels-title">Filters</span>
        <button type="button" class="es-panels-close" id="es-panels-close" aria-label="Close filters">&times;</button>
      </div>

      {%- comment -%}
        One accordion section per facet. Checkboxes, not dropdowns: ticking two
        boxes in a section means "either" (French OR German), while separate
        sections still combine as "and".
      {%- endcomment -%}

      {%- assign recs = site.data.essays | where: "recommended", true | size -%}
      {%- if recs > 0 %}
      <label class="es-opt es-opt-solo"><input type="checkbox" data-facet="recommended" value="yes"> <strong>Only the ones I recommend</strong> <span class="es-opt-n">{{ recs }}</span></label>
      {%- endif %}

      <div class="es-acc" id="es-acc">

        <section class="es-acc-item">
          <button type="button" class="es-acc-head" aria-expanded="false" data-acc="tag">
            <span class="es-acc-name">Topic</span><span class="es-acc-sel"></span><span class="es-acc-caret" aria-hidden="true"></span>
          </button>
          <div class="es-acc-body" hidden>
            {%- for t in site.data.essay_facets.topics -%}
              {%- assign n = site.data.essays | where_exp: "e", "e.tags contains t" | size -%}
              <label class="es-opt"><input type="checkbox" data-facet="tag" value="{{ t | escape }}"> {{ t }} <span class="es-opt-n">{{ n }}</span></label>
            {%- endfor -%}
          </div>
        </section>

        <section class="es-acc-item">
          <button type="button" class="es-acc-head" aria-expanded="false" data-acc="length">
            <span class="es-acc-name">Length</span><span class="es-acc-sel"></span><span class="es-acc-caret" aria-hidden="true"></span>
          </button>
          <div class="es-acc-body" hidden>
            {%- for l in site.data.essay_facets.lengths -%}
              {%- assign n = site.data.essays | where: "length", l.value | size -%}
              {%- if n > 0 -%}
              <label class="es-opt"><input type="checkbox" data-facet="length" value="{{ l.value | escape }}"> {{ l.label }} <span class="es-opt-n">{{ n }}</span></label>
              {%- endif -%}
            {%- endfor -%}
          </div>
        </section>

        <section class="es-acc-item">
          <button type="button" class="es-acc-head" aria-expanded="false" data-acc="form">
            <span class="es-acc-name">Form</span><span class="es-acc-sel"></span><span class="es-acc-caret" aria-hidden="true"></span>
          </button>
          <div class="es-acc-body" hidden>
            {%- assign forms = site.data.essays | map: "form_label" | uniq | sort -%}
            {%- for f in forms -%}
              {%- assign n = site.data.essays | where: "form_label", f | size -%}
              <label class="es-opt"><input type="checkbox" data-facet="form" value="{{ f | escape }}"> {{ f }} <span class="es-opt-n">{{ n }}</span></label>
            {%- endfor -%}
          </div>
        </section>

        <section class="es-acc-item">
          <button type="button" class="es-acc-head" aria-expanded="false" data-acc="century">
            <span class="es-acc-name">Century</span><span class="es-acc-sel"></span><span class="es-acc-caret" aria-hidden="true"></span>
          </button>
          <div class="es-acc-body" hidden>
            {%- for c in site.data.essay_facets.centuries -%}
              {%- assign n = site.data.essays | where: "century", c | size -%}
              {%- if n > 0 -%}
              <label class="es-opt"><input type="checkbox" data-facet="century" value="{{ c | escape }}"> {{ c | capitalize }} <span class="es-opt-n">{{ n }}</span></label>
              {%- endif -%}
            {%- endfor -%}
          </div>
        </section>

        <section class="es-acc-item">
          <button type="button" class="es-acc-head" aria-expanded="false" data-acc="language">
            <span class="es-acc-name">Written in</span><span class="es-acc-sel"></span><span class="es-acc-caret" aria-hidden="true"></span>
          </button>
          <div class="es-acc-body" hidden>
            {%- assign langs = site.data.essays | map: "wrote_in" | uniq | sort -%}
            {%- for la in langs -%}
              {%- assign n = site.data.essays | where: "wrote_in", la | size -%}
              <label class="es-opt"><input type="checkbox" data-facet="language" value="{{ la | escape }}"> {{ la }} <span class="es-opt-n">{{ n }}</span></label>
            {%- endfor -%}
          </div>
        </section>

        <section class="es-acc-item">
          <button type="button" class="es-acc-head" aria-expanded="false" data-acc="nationality">
            <span class="es-acc-name">Nationality</span><span class="es-acc-sel"></span><span class="es-acc-caret" aria-hidden="true"></span>
          </button>
          <div class="es-acc-body" hidden>
            {%- assign nats = site.data.essays | map: "nationality" | uniq | sort -%}
            {%- for na in nats -%}
              {%- assign n = site.data.essays | where: "nationality", na | size -%}
              <label class="es-opt"><input type="checkbox" data-facet="nationality" value="{{ na | escape }}"> {{ na }} <span class="es-opt-n">{{ n }}</span></label>
            {%- endfor -%}
          </div>
        </section>

        <section class="es-acc-item">
          <button type="button" class="es-acc-head" aria-expanded="false" data-acc="gender">
            <span class="es-acc-name">Author</span><span class="es-acc-sel"></span><span class="es-acc-caret" aria-hidden="true"></span>
          </button>
          <div class="es-acc-body" hidden>
            {%- assign w = site.data.essays | where: "gender", "woman" | size -%}
            {%- assign m = site.data.essays | where: "gender", "man" | size -%}
            <label class="es-opt"><input type="checkbox" data-facet="gender" value="woman"> Woman <span class="es-opt-n">{{ w }}</span></label>
            <label class="es-opt"><input type="checkbox" data-facet="gender" value="man"> Man <span class="es-opt-n">{{ m }}</span></label>
          </div>
        </section>

        <section class="es-acc-item">
          <button type="button" class="es-acc-head" aria-expanded="false" data-acc="access">
            <span class="es-acc-name">Availability</span><span class="es-acc-sel"></span><span class="es-acc-caret" aria-hidden="true"></span>
          </button>
          <div class="es-acc-body" hidden>
            {%- for a in site.data.essay_facets.access -%}
              {%- assign n = site.data.essays | where: "access", a.value | size -%}
              {%- if n > 0 -%}
              <label class="es-opt"><input type="checkbox" data-facet="access" value="{{ a.value }}"> {{ a.label }} <span class="es-opt-n">{{ n }}</span></label>
              {%- endif -%}
            {%- endfor -%}
          </div>
        </section>

      </div>

      <div class="es-panels-foot">
        <label class="es-check"><input type="checkbox" id="es-compact" checked> Compact view</label>
        <span class="es-panels-actions">
          <button type="button" class="es-linkbtn" id="es-panels-clear">Clear all</button>
          <button type="button" class="es-btn es-btn-primary" id="es-panels-done">Show <span id="es-panels-count">337</span></button>
        </span>
      </div>
    </div>

  <ol class="es-list is-compact" id="es-list">
    {% for e in site.data.essays %}
    {%- assign tagstr = e.tags | join: " " -%}
    {%- assign blob = e.title | append: " " | append: e.author | append: " " | append: e.blurb | append: " " | append: tagstr -%}
    <li class="es-row"
        data-tags="{{ e.tags | join: '|' | escape }}"
        data-length="{{ e.length | escape }}"
        data-form="{{ e.form_label | escape }}"
        data-century="{{ e.century | escape }}"
        data-access="{{ e.access }}"
        data-recommended="{% if e.recommended %}yes{% else %}no{% endif %}"
        data-gender="{{ e.gender }}"
        data-nationality="{{ e.nationality | escape }}"
        data-language="{{ e.wrote_in | escape }}"
        data-translated="{% if e.translated %}yes{% else %}no{% endif %}"
        data-year="{{ e.year }}"
        data-words="{{ e.words | default: 0 }}"
        data-author="{{ e.author | escape }}"
        data-author-sort="{{ e.author_sort | escape }}"
        data-title="{{ e.title | escape }}"
        data-search="{{ blob | downcase | escape }}">
      <div class="es-body">
        <h2 class="es-title">{% if e.recommended %}<span class="es-star" title="Tristan recommends this one">★</span>{% endif %}<a href="{{ e.url }}" target="_blank" rel="noopener noreferrer">{{ e.title }}</a></h2>
        <p class="es-meta">
          <button type="button" class="es-author" data-author="{{ e.author | escape }}">{{ e.author }}</button>
          <span class="es-dot">·</span>{{ e.year_label }}
          <span class="es-dot">·</span>{{ e.form_label | downcase }}
          {%- if e.translated %} <span class="es-badge">translated from {{ e.wrote_in }}</span>{% endif -%}
          {%- if e.access == "paywall" %} <span class="es-badge es-badge-warn">paywall</span>{% endif -%}
          {%- if e.access == "borrow" %} <span class="es-badge">borrow from archive.org</span>{% endif -%}
          {%- if e.club_read %} <span class="es-badge es-badge-club">read at Club Violet</span>{% endif -%}
        </p>
        {% if e.blurb %}<p class="es-blurb">{{ e.blurb }}</p>{% endif %}
        <p class="es-tags">
          {%- for t in e.tags %}<button type="button" class="es-tag" data-tag="{{ t | escape }}">{{ t }}</button>{% endfor -%}
        </p>
      </div>
      <p class="es-time">
        {% if e.minutes %}<span class="es-mins">{{ e.minutes }}<span class="es-unit">min</span></span>{% else %}<span class="es-mins es-mins-none">—</span>{% endif %}
        {% if e.words %}<span class="es-words">{{ e.words_label }} words</span>{% endif %}
      </p>
    </li>
    {% endfor %}
  </ol>

  <p class="es-empty" id="es-empty" hidden>Nothing matches that. <button type="button" class="es-linkbtn" id="es-reset">Clear the filters.</button></p>

</div>

<script src="{{ '/assets/js/essays.js' | relative_url }}"></script>
