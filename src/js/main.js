// @ts-check
'use strict';

import { i18n }         from './i18n.js';
import { SPARouter }    from './router.js';
import { initDispatcher } from './eventDispatcher.js';

// ── Theme & menu helpers exposed on window for inline onclick handlers
import './theme.js';
import './menu.js';

// ── Shared accordion utility (copyToClipboard, toggleAccordion)
import './accordion.js';

// ── Carousel
import './carousel.js';

/**
 * Bootstraps the application.
 *
 * Order of operations:
 *   1. i18n.init() — detects locale, loads its dictionary, sets <html lang>.
 *      The router MUST NOT be instantiated before this resolves; any view
 *      injected before i18n is ready would display un-translated text.
 *   2. SPARouter construction — calls handleRoute() which injects the first
 *      view and calls i18n.translateDOM(app) on the injected fragment.
 *   3. Router lifecycle hooks — beforeNavigate / afterNavigate wiring.
 *   4. Locale-change listener — reacts to i18n:localeChanged by updating
 *      <head> meta tags (body is already retranslated inside setLocale()).
 *   5. Global window assignments — expose router and helpers for legacy
 *      inline onclick handlers in HTML fragments.
 *   6. Event dispatcher — wire delegated click / prefetch / form listeners.
 *
 * @returns {Promise<void>}
 */
async function bootstrap() {
  // ── 1. Initialise i18n before any DOM rendering ───────────────────────
  await i18n.init();

  // Expose singleton globally so inline onclick="i18n.setLocale('en')"
  // works from any HTML fragment injected by the router.
  /** @type {any} */ (window).i18n = i18n;

  // ── 2. Instantiate router (calls handleRoute() synchronously inside) ──
  const router = new SPARouter();

  // ── 3. Register lazy controller loaders (code-split per route) ────────
  router.registerControllers({
    '/': () => import('./controllers/homeController.js'),
  });

  // ── 3b. Router lifecycle hooks ────────────────────────────────────────
  let navStart = 0;

  router.beforeNavigate(ctx => {
    navStart = performance.now();
    console.log(
      '[NAV:start]',
      { to: ctx.to, from: ctx.from, type: ctx.isPopstate ? 'popstate' : 'push' }
    );
    document.getElementById('app')?.classList.add('is-transitioning');
  });

  router.afterNavigate((to, ctx) => {
    if (!navStart) return;
    const duration = performance.now() - navStart;
    console.log(
      '[NAV:complete]',
      {
        to,
        from:      ctx.from,
        requested: ctx.requested,
        duration:  Math.round(duration) + 'ms',
      }
    );

    const app = document.getElementById('app');
    if (app) {
      requestAnimationFrame(() => app.classList.remove('is-transitioning'));
      setTimeout(()           => app.classList.remove('is-transitioning'), 1000);
    }
    navStart = 0;
  });

  // ── 4. Locale-change listener ─────────────────────────────────────────
  // setLocale() already calls translateDOM(document.body), so only the
  // <head> meta tags need to be updated here (they are outside document.body).
  document.addEventListener('i18n:localeChanged', () => {
    const currentRoute = router.currentRoute ?? '/';
    router.updateMetaTags(currentRoute);
    console.log('[i18n] Meta tags updated for route:', currentRoute, '— locale:', i18n.getLocale());
  });

  // ── 5. Global window assignments for legacy inline handlers ───────────
  window.router     = router;
  window.navigateTo = path => router.navigate(path);

  // ── 6. Wire delegated event listeners ────────────────────────────────
  initDispatcher(router);
}

bootstrap().catch(err => {
  console.error('[bootstrap] Fatal initialisation error:', err);
});