const normalizeHref = (href) => href.replace(/#.*/, '').split('?')[0];

export const initNavigationHighlight = () => {
  const page = document.body.dataset.page;
  const links = document.querySelectorAll('.primary-nav a');
  links.forEach((link) => {
    const href = normalizeHref(link.getAttribute('href') || '');
    const isActive = page === 'home' ? href.endsWith('index.html') : href.includes(`${page}.html`);
    if (isActive) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
};

export const initMobileNav = () => {
  const nav = document.querySelector('.primary-nav');
  const toggle = document.querySelector('.nav-toggle');
  const list = document.querySelector('.primary-nav ul');
  if (!nav || !toggle || !list) {
    return;
  }

  const closeMenu = () => {
    toggle.setAttribute('aria-expanded', 'false');
    nav.setAttribute('aria-expanded', 'false');
    list.classList.remove('is-open');
  };

  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    const next = !expanded;
    toggle.setAttribute('aria-expanded', String(next));
    nav.setAttribute('aria-expanded', String(next));
    list.classList.toggle('is-open', next);
    if (next) {
      list.querySelector('a')?.focus({ preventScroll: true });
    }
  });

  list.addEventListener('click', (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      closeMenu();
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 720) {
      closeMenu();
    }
  });
};
