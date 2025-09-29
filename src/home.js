const cards = document.querySelectorAll('[data-animate="work-card"]');

if (cards.length > 0) {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const setDelay = (element) => {
    const delayValue = Number.parseInt(element.dataset.delay || '0', 10);
    if (Number.isFinite(delayValue)) {
      element.style.setProperty('--work-delay', `${Math.max(delayValue, 0) / 1000}s`);
    }
  };

  if (prefersReducedMotion) {
    cards.forEach((card) => {
      setDelay(card);
      card.classList.add('is-visible');
    });
  } else {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.35,
        rootMargin: '0px 0px -10%',
      }
    );

    cards.forEach((card) => {
      setDelay(card);
      observer.observe(card);
    });
  }
}
