---
layout: default
title: Res Gestae
permalink: /res-gestae/
description: The things done. A first-person account of what Tristan Saucedo has gotten up to.
---

# Res Gestae

<!-- PLACEHOLDER intro. Replace with your own words (see COPY.md, section 6). No dashes. -->
<p class="res-intro">The running record of things I've done, in my own words.</p>

<!--
  Each entry is its own file in _gesta/. Add one = drop a file in (copy _gesta/TEMPLATE.md).
  Order is newest-first. Entries alternate left/right down the spine.
  The title links to the entry's own page (or to `link:` if set). Inline links inside the
  description work normally and stay on the page.
-->

{% assign entries = site.gesta | sort: "date" | reverse %}
<div class="timeline">
  {% for e in entries %}
  <div class="tl-entry {% cycle 'left', 'right' %}" data-category="{{ e.category }}">
    <span class="tl-year">{{ e.date | date: "%Y" }}</span>
    <h3 class="tl-title">
      {% if e.link %}<a href="{{ e.link }}" target="_blank" rel="noopener noreferrer">{{ e.title }}</a>
      {% else %}<a href="{{ e.url | relative_url }}">{{ e.title }}</a>{% endif %}
    </h3>
    {% if e.location %}<span class="tl-location">{{ e.location }}</span>{% endif %}
    {% if e.photo %}{% assign thumb = e.photo %}{% elsif e.photos %}{% assign thumb = e.photos | first %}{% endif %}
    {% if thumb %}<img class="tl-thumb" src="{{ thumb | relative_url }}" alt="">{% endif %}
    {% assign plain = e.content | strip_html | strip %}
    <p class="tl-desc">{{ plain | truncate: 120, "…" }}{% if plain.size > 120 %} <a class="tl-more" href="{{ e.url | relative_url }}">more</a>{% endif %}</p>
  </div>
  {% endfor %}
</div>
