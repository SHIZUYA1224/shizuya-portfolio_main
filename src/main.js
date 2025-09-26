import { initNavigationHighlight, initMobileNav } from './router.js';

const init = () => {
  initNavigationHighlight();
  initMobileNav();
  const yearEl = document.querySelector('[data-year]');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear().toString();
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
