// @ts-check
'use strict';

/**
 * @param {import('./router.js').SPARouter} routerInstance
 */
export function initDispatcher(routerInstance) {
  if (document.body.dataset['eventDispatcherInit']) return;
  document.body.dataset['eventDispatcherInit'] = 'true';

  document.addEventListener('click',     e => { handleRouterLinks(/** @type {MouseEvent} */ (e)); handleMenuClose(/** @type {MouseEvent} */ (e)); handleActions(/** @type {MouseEvent} */ (e)); });
  document.addEventListener('input',     handleFormCleanup);
  document.addEventListener('mouseover', e => handlePrefetch(/** @type {MouseEvent} */ (e), routerInstance));

  // ── IntersectionObserver con limpieza antes de cada navegación ─────────
  //
  // Problema del MVP: el observer nunca llamaba unobserve() sobre nodos que
  // el router eliminaba al reemplazar innerHTML de #app. Resultado:
  //   • El GC no podía liberar esos nodos (reference desde el observer).
  //   • En navegaciones sucesivas, el Set `prefetched` crecía indefinidamente.
  //
  // Solución: rastrear los elementos observados en observedLinks. El hook
  // beforeNavigate llama cleanup() antes de cada cambio de página, que
  // desconecta todos los nodos del observer y limpia el tracking Set.
  // Después de la navegación, afterNavigate re-observa los nuevos nodos.

  /** @type {Set<string>} Rutas ya prefetcheadas para no repetir */
  const prefetched = new Set();

  /** @type {Set<Element>} Nodos actualmente bajo observación */
  const observedLinks = new Set();

  const viewportObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const link = entry.target;
      const href = link.getAttribute('href');
      if (!href || href.includes('#')) return;

      const normalized = routerInstance.normalizeRoute(href);
      viewportObserver.unobserve(link);
      observedLinks.delete(link);

      if (!normalized || prefetched.has(normalized)) return;
      prefetched.add(normalized);
      routerInstance.prefetch(normalized);
    });
  }, { threshold: 0.1 });

  /**
   * Observa todos los [data-router-link][href] del DOM actual que no hayan
   * sido observados todavía.
   */
  function observeRouterLinks() {
    document.querySelectorAll('[data-router-link][href]').forEach(el => {
      const htmlEl = /** @type {HTMLElement} */ (el);
      if (!htmlEl.dataset['viewportObserved']) {
        htmlEl.dataset['viewportObserved'] = 'true';
        viewportObserver.observe(el);
        observedLinks.add(el);
      }
    });
  }

  /**
   * Limpia todos los nodos observados antes de que el router reemplace el DOM.
   * Sin esto, los nodos del #app anterior permanecerían en memoria porque el
   * IntersectionObserver mantiene referencias fuertes (no WeakRef) a ellos.
   */
  function cleanupObservedLinks() {
    observedLinks.forEach(el => {
      viewportObserver.unobserve(el);
      delete (/** @type {HTMLElement} */ (el)).dataset['viewportObserved'];
    });
    observedLinks.clear();
  }

  // Limpiar antes de la navegación, re-observar después.
  routerInstance.beforeNavigate(() => { cleanupObservedLinks(); });
  routerInstance.afterNavigate(() => { observeRouterLinks(); });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeRouterLinks);
  } else {
    observeRouterLinks();
  }

  // ── Action delegation (replaces inline onclick handlers) ───────────────
  /** @param {MouseEvent} e */
  function handleActions(e) {
    const target = /** @type {Element} */ (e.target);
    const btn    = target.matches('[data-action]') ? target : target.closest('[data-action]');
    if (!btn) return;

    const action = /** @type {HTMLElement} */ (btn).dataset['action'];
    if (!action) return;

    switch (action) {
      case 'toggle-language': {
        e.preventDefault();
        const locales = window.i18n.getSupportedLocales();
        const nextIdx = (locales.indexOf(window.i18n.getLocale()) + 1) % locales.length;
        window.i18n.setLocale(locales[nextIdx]);
        break;
      }
      case 'toggle-theme':
        e.preventDefault();
        window.toggleDarkMode();
        if (btn.classList.contains('mobile-theme-btn')) window.closeMobileMenu();
        break;
      case 'toggle-menu':
        e.preventDefault();
        window.toggleMobileMenu();
        break;
      case 'copy': {
        e.preventDefault();
        const text = /** @type {HTMLElement} */ (btn).dataset['clipboardText'];
        if (text && typeof window.copyToClipboard === 'function') {
          window.copyToClipboard(/** @type {HTMLButtonElement} */ (btn), text);
        }
        break;
      }
    }
  }

  // ── Router link delegation ─────────────────────────────────────────────
  /** @param {MouseEvent} e */
  function handleRouterLinks(e) {
    const target = /** @type {Element} */ (e.target);
    const link   = target.matches('[data-router-link]') ? target : target.closest('[data-router-link]');
    if (!link) return;

    const href = link.getAttribute('href') ?? '/';

    // Dejar pasar links externos y mailto para que el browser los maneje.
    if (/^(https?|mailto|tel):/.test(href)) return;

    e.preventDefault();

    // ── Resolución de anclas ──────────────────────────────────────────────
    // Problema del MVP: handleAnchorNavigation() era un silent no-op para
    // rutas no-home con hash (ej. /proyectos/jobbot#top). El href se pasaba
    // al método del router que solo manejaba el caso home+hash y retornaba
    // sin navegar para cualquier otra ruta.
    //
    // Solución aquí (en el dispatcher): resolver la lógica de anclas antes
    // de delegar al router, con tres casos explícitos:
    //
    //   1. Solo hash (#section): scroll in-page sin cambio de ruta.
    //   2. Misma ruta + hash: scroll in-page sin navigation push.
    //   3. Ruta diferente + hash: navigate() full y dejar que handleRoute
    //      resuelva el scroll después de cargar la página.
    const hashIdx    = href.indexOf('#');
    const pathPart   = hashIdx === -1 ? href          : href.slice(0, hashIdx);
    const hashPart   = hashIdx === -1 ? ''            : href.slice(hashIdx + 1);

    if (hashPart) {
      const normalizedTarget  = routerInstance.normalizeRoute(pathPart || '/');
      const normalizedCurrent = routerInstance.normalizeRoute(window.location.pathname);

      if (!pathPart || normalizedTarget === normalizedCurrent) {
        // Caso 1 y 2: scroll in-page
        const anchor = document.getElementById(hashPart);
        if (anchor) {
          anchor.scrollIntoView({ behavior: 'smooth' });
          history.replaceState(null, '', '#' + hashPart);
        }
      } else {
        // Caso 3: página diferente — navigate se encarga del scroll post-load
        routerInstance.navigate(href);
      }
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
   * @param {MouseEvent}                      e
   * @param {import('./router.js').SPARouter} router
   */
  function handlePrefetch(e, router) {
    const target = /** @type {Element} */ (e.target);
    const link   = target.closest('[data-router-link]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href || href.includes('#')) return;
    const normalized = router.normalizeRoute(href);
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