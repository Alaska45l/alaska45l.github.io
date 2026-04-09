// @ts-check
'use strict';

import { SPARouter }      from './router.js';
import { initDispatcher } from './eventDispatcher.js';

// ── Theme & menu helpers are exposed on window for inline onclick handlers
import './theme.js';
import './menu.js';

// ── Shared accordion utility (copyToClipboard, toggleAccordion)
import './accordion.js';

// ── Carousel
import './carousel.js';

const router = new SPARouter();

// ── Lazy controller loaders — code-split per route ────────────────────────
router.registerControllers({
  '/':           () => import('./controllers/homeController.js'),
});

// ── Nav performance hooks (mirrors the inline <script> from old index.html)
let navStart = 0;

router.beforeNavigate(ctx => {
  navStart = performance.now();
  console.log('[NAV:start]', { to: ctx.to, from: ctx.from, type: ctx.isPopstate ? 'popstate' : 'push' });
  document.getElementById('app')?.classList.add('is-transitioning');
});

router.afterNavigate((to, ctx) => {
  if (!navStart) return;
  const duration = performance.now() - navStart;
  console.log('[NAV:complete]', { to, from: ctx.from, requested: ctx.requested, duration: Math.round(duration) + 'ms' });

  const app = document.getElementById('app');
  if (app) {
    requestAnimationFrame(() => app.classList.remove('is-transitioning'));
    setTimeout(() => app.classList.remove('is-transitioning'), 1000);
  }
  navStart = 0;
});

// ── Expose router globally for legacy inline handlers (onclick="navigateTo(...)")
window.router     = router;
window.navigateTo = path => router.navigate(path);

// ── Wire delegated event listeners
initDispatcher(router);