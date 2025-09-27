const normalizeHref = (href) => href.replace(/#.*/, '').split('?')[0];

export const initNavigationHighlight = () => {
  const page = document.body.dataset.page;
  const links = document.querySelectorAll('.primary-nav a');
  links.forEach((link) => {
    const href = normalizeHref(link.getAttribute('href') || '');
    const isActive = page === 'home' ? href.endsWith('index.html') : href.includes(`${page}.html`);
    const listItem = link.closest('li');
    if (isActive) {
      link.setAttribute('aria-current', 'page');
      listItem?.setAttribute('data-active', 'true');
    } else {
      link.removeAttribute('aria-current');
      listItem?.removeAttribute('data-active');
    }
  });
};

export const initMobileNav = () => {
  const nav = document.querySelector('.primary-nav');
  const toggle = document.querySelector('.nav-toggle');
  const overlay = document.querySelector('.nav-overlay');
  const inlineList = document.querySelector('.nav-inline');
  if (!nav || !toggle || !overlay) {
    return;
  }

  const closeMenu = () => {
    toggle.setAttribute('aria-expanded', 'false');
    nav.classList.remove('is-open');
    overlay.dataset.state = 'closed';
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('nav-open');
  };

  const openMenu = () => {
    toggle.setAttribute('aria-expanded', 'true');
    nav.classList.add('is-open');
    overlay.dataset.state = 'open';
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('nav-open');
    overlay.querySelector('a')?.focus({ preventScroll: true });
  };

  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    if (expanded) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  overlay.addEventListener('click', (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      closeMenu();
      return;
    }
    if (event.target === overlay) {
      closeMenu();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && overlay.dataset.state === 'open') {
      closeMenu();
      toggle.focus({ preventScroll: true });
    }
  });

  inlineList?.addEventListener('click', (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      closeMenu();
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 720 && overlay.dataset.state === 'open') {
      closeMenu();
    }
  });
};
