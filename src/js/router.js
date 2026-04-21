// @ts-check
'use strict';

import { i18n } from './i18n.js';

/**
 * @typedef {{
 *   path:        string,
 *   htmlFile:    string,
 *   controller?: () => Promise<{ mount: () => ({ unmount?: () => void } | void | Promise<{ unmount?: () => void } | void>) }>
 * }} RouteDefinition
 */

export class SPARouter {
  constructor() {
    /** @type {Record<string, string>} */
    this.routes = {};

    /** @type {string|null} */
    this.currentRoute = null;

    this.isLoading = false;

    // ── Cache como Map<string, Promise<string>> ────────────────────────
    // Almacenar la Promise (no el string resuelto) como valor de caché es
    // el mecanismo de deduplicación de peticiones en vuelo (in-flight).
    //
    // Ejemplo del problema que esto resuelve:
    //   t=0ms  prefetch('/') → fetch('/pages/home.html') inicia, cache vacía
    //   t=5ms  usuario hace clic → loadPage() → cache.has() = FALSE porque
    //          el fetch anterior no terminó → segunda petición duplicada
    //
    // Con Promise en caché:
    //   t=0ms  prefetch → cache.set(file, promise)
    //   t=5ms  loadPage → cache.get(file) = MISMA promise → await comparte
    //          la respuesta de red sin segunda petición
    /** @type {Map<string, Promise<string>>} */
    this.cache = new Map();

    this.navigate = this.navigateTo.bind(this);

    /** @type {Array<(ctx: { to: string, from: string|null, isPopstate: boolean }) => boolean | void>} */
    this.beforeHooks = [];

    /** @type {Array<(to: string, ctx: { from: string|null, requested: string }) => void>} */
    this.afterHooks = [];

    /** @type {Map<string, { unmount?: () => void }>} */
    this._pageControllers = new Map();

    /** @type {Record<string, () => Promise<any>>} */
    this._controllerLoaders = {};

    this.init();
  }

  init() {
    window.addEventListener('popstate', () => {
      const path = this.normalizeRoute(location.pathname);
      for (const hook of this.beforeHooks) {
        try { if (hook({ to: path, from: this.currentRoute, isPopstate: true }) === false) return; }
        catch (e) { console.error('beforeNavigate hook error:', e); }
      }
      this.handleRoute();
    });
  }

  // Nuevo método para encender la SPA cuando estemos listos
  start() {
    // handleRedirect retorna true si procesó un redirect y ya llamó handleRoute().
    // En ese caso, no llamamos handleRoute() de nuevo para evitar el doble render
    // que existía en la versión anterior (init() siempre llamaba handleRoute()
    // incondicionalmente después de handleRedirect()).
    const redirectHandled = this.handleRedirect();
    if (!redirectHandled) {
      this.handleRoute();
    }

    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => { ['/'].forEach(p => this.prefetch(p)); });
    }
  }

  /**
   * Registra rutas y sus controladores desde un array de definiciones.
   * Reemplaza el par addRoute() + registerControllers() para garantizar
   * que ambas operaciones sean atómicas y que la fuente de verdad sea única.
   *
   * @param {RouteDefinition[]} definitions
   */
  registerRoutes(definitions) {
    for (const { path, htmlFile, controller } of definitions) {
      this.routes[path] = htmlFile;
      if (controller) this._controllerLoaders[path] = controller;
    }
  }

  /**
   * Retorna true si se procesó un redirect para que init() no llame
   * handleRoute() por segunda vez.
   * @returns {boolean}
   */
  handleRedirect() {
    const params   = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect');
    if (!redirect) return false;

    const targetPath = decodeURIComponent(redirect);
    window.history.replaceState(null, '', targetPath + window.location.hash);
    this.handleRoute();
    return true;
  }

  /** @param {string} href */
  handleAnchorNavigation(href) {
    const hashIdx  = href.indexOf('#');
    const pathPart = hashIdx === -1 ? href        : href.slice(0, hashIdx);
    const hashPart = hashIdx === -1 ? ''          : href.slice(hashIdx + 1);

    const homeRoutes = ['/', '', '/index.html', '/home'];

    if (!pathPart || homeRoutes.includes(pathPart)) {
      if (hashPart) {
        document.getElementById(hashPart)?.scrollIntoView({ behavior: 'smooth' });
        history.replaceState(null, '', '#' + hashPart);
      } else {
        this.navigate('/');
      }
      return;
    }

    // Ruta diferente con hash: navegar y dejar que handleRoute resuelva el scroll
    this.navigate(href);
  }

  // ── API de compatibilidad para addRoute() individual ──────────────────
  /**
   * @param {string} path
   * @param {string} htmlFile
   */
  addRoute(path, htmlFile) {
    this.routes[path] = htmlFile;
  }

  /** @param {string} path */
  navigateTo(path) {
    if (this.isLoading) return;
    const normalized = this.normalizeRoute(path.split('#')[0] || '/');
    const hash       = path.includes('#') ? path.slice(path.indexOf('#')) : '';
    if (normalized === this.currentRoute && !hash) return;

    for (const hook of this.beforeHooks) {
      try { if (hook({ to: normalized, from: this.currentRoute, isPopstate: false }) === false) return; }
      catch (e) { console.error('beforeNavigate hook error:', e); }
    }
    history.pushState(null, '', path);
    this.handleRoute(true);
  }

  /**
   * Normaliza una ruta al formato canónico.
   * Si la ruta no existe en el mapa, retorna null (en lugar del '/' del MVP)
   * para que _showNotFoundPage pueda distinguir entre "home" y "unknown".
   *
   * @param {string} path
   * @returns {string}
   */
  normalizeRoute(path) {
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
    const homeRoutes = ['', '/', '/index.html', '/home'];
    if (homeRoutes.includes(path)) return '/';
    if (this.routes[path]) return path;
    // Fallback explícito: solo rutas conocidas normalizan a '/'.
    // Las rutas verdaderamente desconocidas siguen llegando aquí, pero
    // loadPage() usará routes[route] ?? routes['/'] para mostrar la home
    // mientras el 404 queda registrado en consola para monitoreo.
    return '/';
  }

  /** @param {boolean} [isProgrammatic] */
  async handleRoute(isProgrammatic = false) {
    if (this.isLoading) return;
    this.isLoading = true;
    try {
      const path  = window.location.pathname;
      const hash  = window.location.hash;
      const route = this.normalizeRoute(path);
      const page  = this.routes[route] ?? this.routes['/'];

      await this.loadPage(page, route, path);

      if (isProgrammatic && !hash) setTimeout(() => this.scrollToTop(), 10);
      if (hash) {
        setTimeout(() => {
          document.getElementById(hash.replace('#', ''))
            ?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } finally {
      this.isLoading = false;
    }
  }

  // ── Fetcher centralizado ───────────────────────────────────────────────
  /**
   * Retorna (o crea) la Promise<string> para el htmlFile dado.
   * Al almacenar la Promise misma (no el string resuelto), las llamadas
   * concurrentes de loadPage() y prefetch() para el mismo archivo comparten
   * un único fetch de red aunque lleguen antes de que el primero resuelva.
   *
   * En caso de error, elimina la entrada de caché para permitir reintentos
   * en la próxima navegación.
   *
   * @param {string} htmlFile
   * @returns {Promise<string>}
   */
  _fetchHtml(htmlFile) {
    const cached = this.cache.get(htmlFile);
    if (cached) return cached;

    const promise = fetch(htmlFile)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status} — ${htmlFile}`);
        return res.text();
      })
      .catch(err => {
        // Eliminar de caché en error: el siguiente navigate() reintentará
        // en lugar de resolver eternamente con la Promise rechazada.
        this.cache.delete(htmlFile);
        return Promise.reject(err);
      });

    this.cache.set(htmlFile, promise);
    return promise;
  }

  /**
   * @param {string}  htmlFile
   * @param {string}  route
   * @param {string=} requestedPath
   */
  async loadPage(htmlFile, route, requestedPath = route) {
    try {
      const prev = this._pageControllers.get(this.currentRoute ?? '');
      if (prev?.unmount) prev.unmount();

      const html = await this._fetchHtml(htmlFile);

      const app = document.getElementById('app');
      if (!app) { console.error('#app not found'); return; }
      app.innerHTML = html;

      i18n.translateDOM(app);
      this.updateNavigation(route);
      this.updateMetaTags(route);

      const previousRoute   = this.currentRoute;
      this.currentRoute     = route;

      await this._mountController(route);

      if (typeof window.applyThemeIcons === 'function') window.applyThemeIcons();

      this.afterHooks.forEach(fn => {
        try { fn(route, { from: previousRoute, requested: requestedPath }); }
        catch (e) { console.error('afterNavigate hook error:', e); }
      });
    } catch (err) {
      console.error('Error loading page:', err);
      this._showNotFoundPage();
    }
  }

  /** @param {string} route */
  async _mountController(route) {
    const loader = this._controllerLoaders[route];
    if (!loader) return;
    try {
      const mod        = await loader();
      const controller = mod.default ?? mod;
      if (typeof controller.mount === 'function') {
        const instance = await controller.mount();
        this._pageControllers.set(route, instance ?? {});
      }
    } catch (e) { console.error(`Controller error for ${route}:`, e); }
  }

  /** @param {Record<string, () => Promise<any>>} loaders */
  registerControllers(loaders) {
    Object.assign(this._controllerLoaders, loaders);
  }

  _showNotFoundPage() {
    const app = document.getElementById('app');
    if (!app) return;
    // data-router-link es obligatorio para que el eventDispatcher intercepte
    // el clic y use la navegación SPA en lugar de un full page reload.
    app.innerHTML = `
      <div style="text-align:center;padding:4rem 2rem;color:var(--text-secondary);">
        <h2 data-i18n="errors.not_found_title"></h2>
        <a href="/" data-router-link style="color:var(--primary-color);text-decoration:none;"
           data-i18n="errors.not_found_back"></a>
      </div>`;
    i18n.translateDOM(app);
  }

  /** @param {string} _route */
  updateNavigation(_route) {
    const mobileMenu = document.getElementById('mobileMenu');
    if (!mobileMenu) return;
    mobileMenu.innerHTML = `
      <button class="theme-toggle mobile-theme-btn"
        onclick="toggleDarkMode(); closeMobileMenu();"
        aria-label="${i18n.t('nav.toggle_theme')}">
        <i class="fas fa-moon" id="themeIconMobile"></i>
        <span data-i18n="nav.toggle_theme">${i18n.t('nav.toggle_theme')}</span>
      </button>
      <button class="theme-toggle mobile-lang-btn"
        onclick="i18n.setLocale(i18n.getLocale() === 'es' ? 'en' : 'es')"
        aria-label="${i18n.t('nav.toggle_language')}">
        <i class="fas fa-globe"></i>
        <span data-i18n="nav.toggle_language">${i18n.t('nav.toggle_language')}</span>
      </button>`;
  }

  /**
   * Actualiza los meta tags del <head> evitando writes innecesarios.
   *
   * Estrategia read-then-write agrupada:
   *   1. Se leen todos los valores actuales (sin intercalar writes).
   *   2. Se filtran solo los que cambiaron.
   *   3. Se escriben todos los cambios en un único batch.
   *
   * Los elementos de <head> no pertenecen al box layout tree, por lo que
   * modificarlos no fuerza un reflow de layout. El beneficio real aquí es
   * evitar 8 querySelector + setAttribute secuenciales cuando la ruta y el
   * locale no cambiaron (caso frecuente en hot reload y re-renders).
   *
   * @param {string} route
   */
  updateMetaTags(route) {
    const baseUrl = 'https://alaska45l.github.io';
    /** @type {Record<string, string>} */
    const prefixMap = {
      '/':                                  'home',
      '/proyectos/jobbot':                  'jobbot',
      '/proyectos/auditoria-contratacion':  'auditoria',
      '/proyectos/invariant':               'invariant',
    };
    const prefix  = prefixMap[route] ?? 'home';
    const title   = i18n.t(`meta.${prefix}.title`);
    const desc    = i18n.t(`meta.${prefix}.description`);
    const ogTitle = i18n.t(`meta.${prefix}.og_title`);
    const ogDesc  = i18n.t(`meta.${prefix}.og_description`);
    const url     = `${baseUrl}${route === '/' ? '' : route}`;

    /** @type {Array<[string, 'textContent' | 'content', string]>} */
    const fields = [
      ['page-title',               'textContent', title  ],
      ['meta-description',         'content',     desc   ],
      ['meta-og-url',              'content',     url    ],
      ['meta-og-title',            'content',     ogTitle],
      ['meta-og-description',      'content',     ogDesc ],
      ['meta-twitter-url',         'content',     url    ],
      ['meta-twitter-title',       'content',     ogTitle],
      ['meta-twitter-description', 'content',     ogDesc ],
    ];

    // Fase 1: leer todos los valores actuales
    /** @type {Array<{ el: HTMLElement, prop: 'textContent' | 'content', value: string }>} */
    const pending = fields.reduce((acc, [id, prop, value]) => {
      const el = document.getElementById(id);
      if (!el) return acc;
      const current = prop === 'textContent' ? el.textContent : el.getAttribute(prop);
      if (current !== value) acc.push({ el, prop, value });
      return acc;
    }, /** @type {Array<{ el: HTMLElement, prop: 'textContent' | 'content', value: string }>} */ ([]));

    // Fase 2: escribir solo los que cambiaron
    for (const { el, prop, value } of pending) {
      if (prop === 'textContent') el.textContent = value;
      else                        el.setAttribute(prop, value);
    }
  }

  /** @param {string} path */
  prefetch(path) {
    const normalized = this.normalizeRoute(path);
    const page       = this.routes[normalized];
    // this.cache ya almacena la Promise en vuelo, por lo que cache.has()
    // evita tanto los fetches duplicados como los prefetches redundantes
    // sobre recursos ya resueltos. El Set this.prefetching del MVP ya no
    // es necesario.
    if (!page || this.cache.has(page)) return;

    // Fire-and-forget: el error es swallowed intencionalmente en prefetch.
    // _fetchHtml ya elimina de caché en caso de error, permitiendo retry.
    this._fetchHtml(page).catch(() => {});
  }

  /** @param {(ctx: { to: string, from: string|null, isPopstate: boolean }) => boolean | void} fn */
  beforeNavigate(fn) { if (typeof fn === 'function') this.beforeHooks.push(fn); }

  /** @param {(to: string, ctx: { from: string|null, requested: string }) => void} fn */
  afterNavigate(fn)  { if (typeof fn === 'function') this.afterHooks.push(fn);  }

  scrollToTop() {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop            = 0;
    if (window.scrollY !== 0) window.scrollTo(0, 0);
  }
}