/*
  Res Gestae lightbox.

  Click any photo on an entry page to open the largest version we have (the
  `data-full` variant built by previews/gen_photo_data.py, falling back to the
  display copy). Arrow keys and the on-screen arrows move through the gallery,
  Escape or a click on the backdrop closes it.

  Panoramas are never scaled down to a strip. If one is wider than the viewport
  the overlay scrolls sideways at full height.

  Every full-size version is warmed in the background once the page is idle, so
  opening one is instant rather than a load spinner.
*/
(function () {
  var photos = [].slice.call(
    document.querySelectorAll('.gesta-gallery img, .gesta-photo')
  );
  if (!photos.length) return;

  var sources = photos.map(function (img) {
    return {
      src: img.dataset.full || img.src,
      wide: img.classList.contains('is-wide'),
      alt: img.alt || ''
    };
  });

  // ---- pre-warm ---------------------------------------------------------
  // Full-size versions are a few hundred KB each, so fetching all of them up
  // front would cost several MB on a gallery entry. Instead we warm the first
  // couple once the page is idle, warm one on hover, and warm the neighbours
  // whenever the lightbox moves. In practice a click is always on something
  // already in cache.
  var warmed = {};
  function warmOne(i) {
    if (i < 0 || i >= sources.length) return;
    var src = sources[i].src;
    if (warmed[src]) return;
    var pre = new Image();
    pre.decoding = 'async';
    pre.src = src;
    warmed[src] = pre;
  }
  function warmNeighbours(i) {
    warmOne(i);
    warmOne(i + 1);
    warmOne(i - 1);
  }
  function warmFirst() {
    warmOne(0);
    setTimeout(function () { warmOne(1); }, 300);
  }
  if ('requestIdleCallback' in window) {
    requestIdleCallback(warmFirst, { timeout: 3000 });
  } else {
    window.addEventListener('load', function () { setTimeout(warmFirst, 600); });
  }

  // ---- overlay ----------------------------------------------------------
  var lb = document.createElement('div');
  lb.className = 'lb';
  lb.innerHTML =
    '<button class="lb-close" aria-label="Close">&times;</button>' +
    '<button class="lb-nav lb-prev" aria-label="Previous">&#8249;</button>' +
    '<img alt="">' +
    '<button class="lb-nav lb-next" aria-label="Next">&#8250;</button>' +
    '<div class="lb-hint">click the panorama to zoom in</div>' +
    '<div class="lb-count"></div>';
  document.body.appendChild(lb);

  var lbImg = lb.querySelector('img');
  var hint = lb.querySelector('.lb-hint');
  var count = lb.querySelector('.lb-count');
  var prevBtn = lb.querySelector('.lb-prev');
  var nextBtn = lb.querySelector('.lb-next');
  var index = 0;
  var solo = sources.length < 2;

  if (solo) {
    prevBtn.style.display = 'none';
    nextBtn.style.display = 'none';
    count.style.display = 'none';
  }

  function show(i) {
    index = (i + sources.length) % sources.length;
    var s = sources[index];
    lbImg.src = s.src;
    lbImg.alt = s.alt;
    lb.classList.toggle('is-pano', s.wide);
    lb.classList.remove('is-zoomed');
    hint.textContent = 'click the panorama to zoom in';
    lb.scrollLeft = 0;
    count.textContent = index + 1 + ' / ' + sources.length;
    warmNeighbours(index);
  }

  function open(i) {
    show(i);
    lb.classList.add('is-open');
    // next frame, so the fade actually runs
    requestAnimationFrame(function () { lb.classList.add('is-visible'); });
    document.body.style.overflow = 'hidden';
  }

  function close() {
    lb.classList.remove('is-visible');
    document.body.style.overflow = '';
    setTimeout(function () {
      lb.classList.remove('is-open');
      lbImg.src = '';
    }, 180);
  }

  photos.forEach(function (img, i) {
    img.addEventListener('click', function () { open(i); });
    img.addEventListener('mouseenter', function () { warmOne(i); });
    img.addEventListener('touchstart', function () { warmOne(i); }, { passive: true });
  });

  prevBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    show(index - 1);
  });
  nextBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    show(index + 1);
  });
  // On a panorama the image itself toggles between whole-view and full height.
  lbImg.addEventListener('click', function (e) {
    e.stopPropagation();
    if (!lb.classList.contains('is-pano')) return;
    var zoomed = lb.classList.toggle('is-zoomed');
    hint.textContent = zoomed
      ? 'scroll sideways to pan, click again to fit'
      : 'click the panorama to zoom in';
    if (zoomed) {
      // start centred rather than at the far left edge
      lb.scrollLeft = (lb.scrollWidth - lb.clientWidth) / 2;
    }
  });
  lb.addEventListener('click', close);

  document.addEventListener('keydown', function (e) {
    if (!lb.classList.contains('is-open')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight' && !solo) show(index + 1);
    else if (e.key === 'ArrowLeft' && !solo) show(index - 1);
  });
})();
