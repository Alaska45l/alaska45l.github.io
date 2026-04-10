// @ts-check
'use strict';

import { i18n }            from './i18n.js';
import { SPARouter }       from './router.js';
import { initDispatcher }  from './eventDispatcher.js';

import './theme.js';
import './menu.js';
import './accordion.js';
import './carousel.js';

async function bootstrap() {
  // 1. DISPARAR i18n SIN AWAIT (Fire and forget momentáneo)
  // Esto inicia el fetch del JSON en segundo plano.
  const i18nPromise = i18n.init();

  // 2. CONFIGURAR ROUTER SIN ARRANCARLO AÚN
  const router = new SPARouter();

  // ── Definición centralizada de rutas ─────────────────────────────────
  // registerRoutes() reemplaza el par addRoute() + registerControllers().
  // Todas las rutas + controladores en un único lugar: al agregar una ruta
  // nueva basta con añadir una entrada aquí; no hay que tocar router.js.
  router.registerRoutes([
    {
      path:       '/',
      htmlFile:   '/pages/home.html',
      controller: () => import('./controllers/homeController.js'),
    },
    {
      path:     '/proyectos/jobbot',
      htmlFile: '/pages/jobbot.html',
      // Sin controlador: la página es puramente declarativa
    },
    {
      path:     '/proyectos/auditoria-contratacion',
      htmlFile: '/pages/auditoria-contratacion.html',
    },
  ]);

  // 3. ¡EL TRUCO MAGISTRAL! 
  // Disparamos la petición del HTML actual inmediatamente.
  // Ahora el HTML y el JSON están viajando por la red en paralelo.
  router.prefetch(window.location.pathname);

  // 4. AHORA SÍ, ESPERAMOS AL DICCIONARIO
  // Para cuando JS llegue aquí, el JSON y el HTML probablemente 
  // ya estén casi terminando de descargar.
  await i18nPromise;
  /** @type {any} */ (window).i18n = i18n;

  // ── Lifecycle hooks ───────────────────────────────────────────────────
  let navStart = 0;

  router.beforeNavigate(ctx => {
    navStart = performance.now();
    console.log('[NAV:start]', { to: ctx.to, from: ctx.from, type: ctx.isPopstate ? 'popstate' : 'push' });
    document.getElementById('app')?.classList.add('is-transitioning');
  });

  router.afterNavigate((to, ctx) => {
    if (!navStart) return;
    console.log('[NAV:complete]', { to, from: ctx.from, requested: ctx.requested, duration: Math.round(performance.now() - navStart) + 'ms' });
    navStart = 0;
    const app = document.getElementById('app');
    if (app) {
      requestAnimationFrame(() => app.classList.remove('is-transitioning'));
      setTimeout(()           => app.classList.remove('is-transitioning'), 1000);
    }
  });

  // ── Locale-change listener ─────────────────────────────────────────────
  document.addEventListener('i18n:localeChanged', () => {
    const currentRoute = router.currentRoute ?? '/';
    router.updateMetaTags(currentRoute);
    console.log('[i18n] Meta tags updated for route:', currentRoute, '— locale:', i18n.getLocale());
  });

  // ── Globals para inline onclick handlers ──────────────────────────────
  window.router     = router;
  window.navigateTo = path => router.navigate(path);

  // 5. HOOKS Y ARRANQUE
  // Al llamar a start(), loadPage buscará en la caché y encontrará 
  // la promesa que prefetch() inició en el Paso 3, deduplicando la carga.
  router.start();

  // ── Event dispatcher ──────────────────────────────────────────────────
  initDispatcher(router);
}

bootstrap().catch(err => {
  console.error('[bootstrap] Fatal initialisation error:', err);
});