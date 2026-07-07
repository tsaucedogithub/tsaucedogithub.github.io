// Res Gestae timeline: progressive enhancement.
// Without this script every entry shows in full. With it, entries collapse to
// teasers and clicking a node expands it inline. Several can be open at once.
(function () {
  var timeline = document.querySelector('.timeline');
  if (!timeline) return;
  timeline.classList.add('js-timeline');

  var entries = timeline.querySelectorAll('.tl-entry');
  entries.forEach(function (entry) {
    entry.setAttribute('tabindex', '0');
    entry.setAttribute('role', 'button');
    entry.setAttribute('aria-expanded', 'false');

    function toggle() {
      var open = entry.classList.toggle('is-expanded');
      entry.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) {
        // Reveal the "full page" link only if the expanded text is still cut off.
        var text = entry.querySelector('.tl-text');
        var more = entry.querySelector('.tl-more[data-overflow-only]');
        if (text && more && text.scrollHeight - text.clientHeight > 4) {
          more.hidden = false;
        }
      }
    }

    entry.addEventListener('click', function (e) {
      if (e.target.closest('a')) return; // let links (title, inline, "full page") work
      toggle();
    });
    entry.addEventListener('keydown', function (e) {
      if (e.target.closest('a')) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });
})();
