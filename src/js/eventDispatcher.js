// @ts-check
'use strict';

/**
 * Attaches all delegated event listeners exactly once.
 * Must be called from main.js after the router is instantiated.
 *
 * @param {import('./router.js').SPARouter} routerInstance
 */
export function initDispatcher(routerInstance) {
  if (document.body.dataset.eventDispatcherInit) return;
  document.body.dataset.eventDispatcherInit = 'true';

  document.addEventListener('click',     e => { handleRouterLinks(e); handleMenuClose(e); });
  document.addEventListener('input',     handleFormCleanup);
  document.addEventListener('mouseover', e => handlePrefetch(e, routerInstance));

  // ── Viewport prefetch ──────────────────────────────────────────────────
  /** @type {Set<string>} */
  const prefetched = new Set();

  const viewportObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const link = /** @type {HTMLElement} */ (entry.target);
      const path = link.getAttribute('href');
      if (!path || path.includes('#')) return;
      const normalized = routerInstance.normalizeRoute(path);
      if (!normalized || prefetched.has(normalized)) return;
      viewportObserver.unobserve(link);
      prefetched.add(normalized);
      routerInstance.prefetch(normalized);
    });
  }, { threshold: 0.1 });

  function observeRouterLinks() {
    document.querySelectorAll('[data-router-link][href]').forEach(el => {
      const htmlEl = /** @type {HTMLElement} */ (el);
      if (!htmlEl.dataset.viewportObserved) {
        htmlEl.dataset.viewportObserved = 'true';
        viewportObserver.observe(htmlEl);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeRouterLinks);
  } else {
    observeRouterLinks();
  }

  routerInstance.afterNavigate(observeRouterLinks);

  // ── Router link delegation ─────────────────────────────────────────────
  /** @param {MouseEvent} e */
  function handleRouterLinks(e) {
    const target = /** @type {Element} */ (e.target);
    const link   = target.matches('[data-router-link]')
      ? target
      : target.closest('[data-router-link]');
    if (!link) return;

    e.preventDefault();
    const href = link.getAttribute('href') ?? '/';

    if (href.includes('#')) {
      routerInstance.handleAnchorNavigation(href);
    } else {
      routerInstance.navigate(href);
    }
  }

  // ── Mobile menu outside-click ──────────────────────────────────────────
  /** @param {MouseEvent} e */
  function handleMenuClose(e) {
    const menu    = document.getElementById('mobileMenu');
    const menuBtn = document.querySelector('.mobile-menu-btn');
    if (!menu || !menuBtn) return;
    const target = /** @type {Node} */ (e.target);
    if (!menu.contains(target) && !menuBtn.contains(target)) {
      menu.classList.remove('active');
    }
  }

  // ── Hover prefetch ─────────────────────────────────────────────────────
  /**
   * @param {MouseEvent} e
   * @param {import('./router.js').SPARouter} router
   */
  function handlePrefetch(e, router) {
    const target = /** @type {Element} */ (e.target);
    const link   = target.closest('[data-router-link]');
    if (!link) return;
    const path = link.getAttribute('href');
    if (!path || path.includes('#')) return;
    const normalized = router.normalizeRoute(path);
    if (!normalized || prefetched.has(normalized)) return;
    prefetched.add(normalized);
    router.prefetch(normalized);
  }

  // ── Form error cleanup ─────────────────────────────────────────────────
  /** @param {Event} e */
  function handleFormCleanup(e) {
    const target = /** @type {HTMLElement} */ (e.target);
    if (target.classList.contains('error')) target.classList.remove('error');
  }
}