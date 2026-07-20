---
layout: default
title: Projects
permalink: /projects/
description: Things Tristan Saucedo has built.
---

# Projects

These are some of the things I've built or helped build. If you're here for the formal version, my <a href="{{ '/assets/tsaucedo_resume_2026_public.pdf' | relative_url }}" target="_blank" rel="noopener noreferrer">resume</a> covers it.

## [Timeback](https://getyourtimeback.app)

Timeback is a Mac app (soon Windows too) that you use to control app usage on your phone. It's different from other screentime apps in that it cannot be circumvented on your phone.

Timeback installs a configuration onto your phone that cannot be removed from the phone itself (without a factory reset). I always felt the "ignore for 15 minutes" was too easy.

## [Moment](https://photosmomentapp.com)

Moment is a novel (as far as I can tell) social media app I built for my friends. The only way to add a friend is to take a moment, in person, with them. Every moment is a combination of two photos: one from your phone, one from your friend's phone.

Under the hood it's a SwiftUI iOS app with a TypeScript backend (Fastify and Postgres), photos on S3, and SMS verification through Twilio. The spirit of the app is much cooler, though.

<figure class="project-figure">
  <img src="{{ '/assets/images/res-gestae/img_8759.jpg' | relative_url }}" alt="Moment">
  <figcaption>First Moment in the wild</figcaption>
</figure>

<div class="project-gallery">
  <img src="{{ '/assets/images/res-gestae/img_9012.jpg' | relative_url }}" alt="A Moment">
  <img src="{{ '/assets/images/res-gestae/img_9024.jpg' | relative_url }}" alt="A Moment">
  <img src="{{ '/assets/images/res-gestae/img_9057.jpg' | relative_url }}" alt="A Moment">
  <img src="{{ '/assets/images/res-gestae/img_9182.jpg' | relative_url }}" alt="A Moment">
</div>

## [CS229 Final Project, Autumn 2022: Best Project award](https://github.com/tsaucedogithub/cs229_final_project)

We built and integrated multiple ML models to predict the genre of music and then the features of songs (think chroma and timbre) that come next, live, on an Arduino. Using what it thought would come next, the Arduino would change the color of LED light strips like the ones in every college student's dorm.

## [My personal website (this site!)](https://github.com/tsaucedogithub/tsaucedogithub.github.io)

A personal site of mine. Do you like it? I built it myself, because there's no template this stylish (it's camp). I wanted to bring everything about me into one place, especially after [that YouTube video](https://www.youtube.com/watch?v=JyYQiMXcIxs&t=139s) blew up. Is that how you found me?

## [Nature paper on maladaptive myelination and epilepsy](https://www.nature.com/articles/s41593-022-01052-2)

I worked in the [Knowles Lab](https://med.stanford.edu/pedsepilepsy-lab/team.html), running coherence models to understand how changes in myelination affect epilepsy. I also mentored four undergrads, worked on mouse husbandry and colony planning, and wrote MATLAB to generate figures and mark EEGs. Figures 2 and 4 are my babies.
