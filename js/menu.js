// js/menu.js – responsive hamburger toggle for CCAS Dashboard
// -----------------------------------------------------------
// 1) Toggles the mobile nav drawer
// 2) Keeps aria-expanded up to date for accessibility
// 3) Auto-closes when a nav link is tapped or a click lands outside the menu

(function () {
  document.addEventListener('DOMContentLoaded', () => {
    const burger = document.querySelector('.hamburger');
    const nav    = document.getElementById('site-nav');
    if (!burger || !nav) return;

    /* open/close helper */
    const toggleNav = () => {
      nav.classList.toggle('open');
      burger.setAttribute(
        'aria-expanded',
        nav.classList.contains('open').toString()
      );
    };

    // (1) click burger → toggle
    burger.addEventListener('click', toggleNav);

    // (2) tap any nav link → close on small screens
    nav.querySelectorAll('a').forEach(link =>
      link.addEventListener('click', () => {
        if (window.innerWidth <= 640 && nav.classList.contains('open')) {
          toggleNav();
        }
      })
    );

    // (3) click outside → close
    document.addEventListener('click', evt => {
      if (
        nav.classList.contains('open') &&
        !nav.contains(evt.target) &&
        evt.target !== burger
      ) {
        toggleNav();
      }
    });
  });
})();
