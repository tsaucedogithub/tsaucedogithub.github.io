---
layout: default
title: Blog
permalink: /blog/
---

# Blog

<div class="posts">
  {% for post in site.posts %}
    <article class="post">
      <h2><a href="{{ post.url }}">{{ post.title }}</a></h2>
      <time datetime="{{ post.date | date: "%Y-%m-%d" }}">{{ post.date | date: "%B %d, %Y" }}</time>
      <p>{{ post.excerpt }}</p>
    </article>
  {% endfor %}
</div>
