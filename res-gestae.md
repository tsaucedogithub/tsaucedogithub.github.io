---
layout: default
title: Res Gestae
permalink: /res-gestae/
description: The things done. A first-person account of what Tristan Saucedo has gotten up to.
---

# Res Gestae

<p class="res-intro">In Latin, Res gestae means "things done" or "things transacted", in reference to the surrounding facts, events, and statement (the context) of an <a href="https://tenor.com/view/charles-leclerc-inchident-incident-max-verstappen-leclerc-gif-27092516" target="_blank" rel="noopener noreferrer">inchident</a> (don't quote me, I'm not a lawyer). This Res Gestae is more similar to the <a href="https://www.atlasobscura.com/places/replica-of-the-res-gestae-divi-augusti" target="_blank" rel="noopener noreferrer">Res Gestae Divi Augusti</a>, or "The Deeds of the Divine Augustus".</p>

<p class="res-intro">While I am certainly not divine, I like the idea of having a first-person running record of my life and accomplishments (though most will appear insignificant to a bystander). This page is that. It is generally factual (though for the sake of friends and family, past and present, I may not include everything). It serves as a record and reflection on my life, written on my own initiative and at my own expense.</p>

<!--
  Each entry is its own file in _gesta/ (copy _gesta/TEMPLATE.md). Newest first.
  Click a node to expand it inline; the title links to the entry's own page.
  thumb_position sets the thumbnail crop focal point (e.g. "center", "top", "70% 30%").
-->

{% assign entries = site.gesta | sort: "date" | reverse %}
<div class="timeline">
  {% for e in entries %}
  {% if e.photo %}{% assign thumb = e.photo %}{% elsif e.photos %}{% assign thumb = e.photos | first %}{% endif %}
  {% assign photo_count = e.photos | size %}
  {% assign needs_page = false %}
  {% if photo_count > 1 or e.link %}{% assign needs_page = true %}{% endif %}
  {% if e.link %}{% assign more_label = "View source &rarr;" %}{% elsif photo_count > 1 %}{% assign more_label = "See all photos &rarr;" %}{% else %}{% assign more_label = "Continue on the full page &rarr;" %}{% endif %}
  <div class="tl-entry {% cycle 'left', 'right' %}" data-category="{{ e.category }}">
    <div class="tl-card">
      {% if thumb %}{% assign thumb_name = thumb | split: '/' | last %}{% assign crop = site.data.thumb_crops[thumb_name] | default: e.thumb_position | default: 'center' %}<img class="tl-photo" src="{{ thumb | relative_url }}" alt="" style="object-position: {{ crop }}">{% endif %}
      <div class="tl-info">
        <span class="tl-year">{% if e.date_display %}{{ e.date_display }}{% else %}{{ e.date | date: "%Y" }}{% endif %}</span>
        <h3 class="tl-title"><a href="{{ e.url | relative_url }}">{{ e.title }}</a></h3>
        {% if e.location %}<span class="tl-loc">{{ e.location }}</span>{% endif %}
        <div class="tl-text">{{ e.content }}</div>
        <a class="tl-more" href="{% if e.link %}{{ e.link }}{% else %}{{ e.url | relative_url }}{% endif %}"{% if e.link %} target="_blank" rel="noopener noreferrer"{% endif %}{% unless needs_page %} data-overflow-only hidden{% endunless %}>{{ more_label }}</a>
      </div>
    </div>
  </div>
  {% endfor %}
</div>

<script src="{{ '/assets/js/res-gestae.js' | relative_url }}"></script>
