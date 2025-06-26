// js/menu.js – responsive hamburger toggle for AQHI Dashboard
// -------------------------------------------------------------
// Handles:  • toggling the mobile nav drawer
//           • updating aria‐expanded for accessibility
//           • optional auto‑close when a nav link is tapped or when user
//             clicks outside the menu on small screens.

(function(){
  document.addEventListener('DOMContentLoaded', () => {
    const burger = document.querySelector('.hamburger');
    const nav    = document.getElementById('site-nav');

    // Abort if markup not present (e.g., on legacy pages).
    if (!burger || !nav) return;

    /* Helper: open ↔︎ close */
    const toggleNav = () => {
      nav.classList.toggle('open');
      const isOpen = nav.classList.contains('open');
      burger.setAttribute('aria-expanded', isOpen.toString());
    };

    // 1. Toggle on burger click
    burger.addEventListener('click', toggleNav);

    // 2. Auto‑close after clicking any nav link (for smoother mobile UX)
    nav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 640 && nav.classList.contains('open')) {
          toggleNav();
        }
      });
    });

    // 3. Close if user taps outside the nav while it’s open
    document.addEventListener('click', (evt) => {
      if (nav.classList.contains('open') && !nav.contains(evt.target) && evt.target !== burger) {
        toggleNav();
      }
    });
  });
})();
