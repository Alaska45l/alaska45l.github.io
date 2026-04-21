// ─────────────────────────────────────────────────────────────────────────────
// 1. src/js/main.js — Agregar la nueva ruta dentro de registerRoutes()
// ─────────────────────────────────────────────────────────────────────────────

router.registerRoutes([
  {
    path:       '/',
    htmlFile:   '/pages/home.html',
    controller: () => import('./controllers/homeController.js'),
  },
  {
    path:     '/proyectos/jobbot',
    htmlFile: '/pages/jobbot.html',
  },
  {
    path:     '/proyectos/auditoria-contratacion',
    htmlFile: '/pages/auditoria-contratacion.html',
  },
  // ── NUEVO ──────────────────────────────────────────────────
  {
    path:     '/proyectos/invariant',
    htmlFile: '/pages/invariant.html',
    // Sin controlador: la página es puramente declarativa (igual que jobbot)
  },
]);


// ─────────────────────────────────────────────────────────────────────────────
// 2. src/js/router.js — Actualizar prefixMap dentro de updateMetaTags()
// ─────────────────────────────────────────────────────────────────────────────
//
// Localiza el objeto prefixMap (línea ~290 aprox.) y añade la entrada:

const prefixMap = {
  '/':                                  'home',
  '/proyectos/jobbot':                  'jobbot',
  '/proyectos/auditoria-contratacion':  'auditoria',
  '/proyectos/invariant':               'invariant', // ← NUEVO
};
