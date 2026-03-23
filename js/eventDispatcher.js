(function () {
  // Guard: attach listeners exactly once for the lifetime of the page.
  // document.body persists across SPA navigation so this flag is stable.
  if (document.body.dataset.eventDispatcherInit) return;
  document.body.dataset.eventDispatcherInit = 'true';

  document.addEventListener('click',     handleClick);
  document.addEventListener('input',     handleInput);
  document.addEventListener('mouseover', handlePrefetch);

  // ── Click dispatcher ────────────────────────────────────────────────────
  function handleClick(e) {
    handleRouterLinks(e);
    handleMenuClose(e);
  }

  // ── Input dispatcher ────────────────────────────────────────────────────
  function handleInput(e) {
    handleFormCleanup(e);
  }

  // ── Router link delegation ───────────────────────────────────────────────
  // Extracted from router.js → setupLinkHandlers()
  function handleRouterLinks(e) {
    const link = e.target.matches('[data-router-link]')
      ? e.target
      : e.target.closest('[data-router-link]');

    if (!link) return;

    e.preventDefault();
    const href = link.getAttribute('href');

    if (href.includes('#')) {
      if (window.router) window.router.handleAnchorNavigation(href);
    } else {
      if (window.router) window.router.navigate(href);
    }
  }

  // ── Mobile menu outside-click ────────────────────────────────────────────
  // Extracted from menu.js → document click listener
  function handleMenuClose(event) {
    const menu    = document.getElementById('mobileMenu');
    const menuBtn = document.querySelector('.mobile-menu-btn');

    if (!menu || !menuBtn) return;

    if (!menu.contains(event.target) && !menuBtn.contains(event.target)) {
      menu.classList.remove('active');
    }
  }

  // ── Prefetch on hover ────────────────────────────────────────────────────
  // Set tracks paths already handed to the router so repeated mouseover
  // events on child elements of the same link never trigger duplicate work.
  const prefetched = new Set();

  function handlePrefetch(e) {
    const link = e.target.closest('[data-router-link]');
    if (!link) return;

    const path = link.getAttribute('href');
    if (!path || path.includes('#')) return;

    // Normalize through the router so '/', '/home', '/index.html' all
    // collapse to the same key before the Set and cache checks.
    const normalized = window.router?.normalizeRoute(path);
    if (!normalized || prefetched.has(normalized)) return;

    prefetched.add(normalized);
    window.router?.prefetch(normalized);
  }

  // ── Viewport prefetch (IntersectionObserver) ─────────────────────────────
  // Prefetches routes as their [data-router-link] elements scroll into view.
  // Shares the same `prefetched` Set as hover prefetch to prevent any
  // duplicate work across both strategies.
  const viewportObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;

      const link = entry.target;
      const path = link.getAttribute('href');
      if (!path || path.includes('#')) return;

      const normalized = window.router?.normalizeRoute(path);
      if (!normalized || prefetched.has(normalized)) return;

      // Stop observing this element — it only needs to be prefetched once.
      viewportObserver.unobserve(link);

      prefetched.add(normalized);
      window.router?.prefetch(normalized);
    });
  }, { threshold: 0.1 });

  // Observe all current [data-router-link] elements and re-observe whenever
  // the SPA router injects new DOM (handled by existing MutationObserver
  // in terminal.js / experienceAccordion.js). Since the SPA replaces
  // #app.innerHTML on every navigation, we re-scan on each click that
  // triggers a route change by delegating a one-time scan after navigation.
  function observeRouterLinks() {
    document.querySelectorAll('[data-router-link][href]').forEach(function (el) {
      if (!el.dataset.viewportObserved) {
        el.dataset.viewportObserved = 'true';
        viewportObserver.observe(el);
      }
    });
  }

  // Initial scan after DOM is ready, then re-scan after every navigation
  // by piggy-backing on the existing afterNavigate hook.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeRouterLinks);
  } else {
    observeRouterLinks();
  }

  // Re-scan after SPA route changes so freshly injected links get observed.
  // Safe to call multiple times — the dataset guard prevents double-observing.
  (function scheduleAfterNavigate() {
    if (window.router) {
      window.router.afterNavigate(observeRouterLinks);
    } else {
      // Router not yet instantiated — retry after DOMContentLoaded
      document.addEventListener('DOMContentLoaded', function () {
        window.router?.afterNavigate(observeRouterLinks);
      });
    }
  }());
  // Extracted from form.js → document input listener
  function handleFormCleanup(event) {
    if (event.target.classList.contains('error')) {
      event.target.classList.remove('error');
    }
  }

}());