// @ts-check
'use strict';

import { i18n } from './i18n.js';

export class SPARouter {
  constructor() {
    /** @type {Record<string, string>} */
    this.routes = {};
    /** @type {string|null} */
    this.currentRoute = null;
    this.isLoading = false;
    /** @type {Map<string, string>} */
    this.cache = new Map();
    this.isLocalDevelopment = window.location.protocol === 'file:';
    this.navigate = this.navigateTo.bind(this);
    /** @type {Array<function({to:string,from:string|null,isPopstate:boolean}):boolean|void>} */
    this.beforeHooks = [];
    /** @type {Array<function(string,{from:string|null,requested:string}):void>} */
    this.afterHooks = [];
    /** @type {Set<string>} */
    this.prefetching = new Set();
    /** @type {Map<string,{unmount?:function():void}>} */
    this._pageControllers = new Map();
    /** @type {Record<string, ()=>Promise<any>>} */
    this._controllerLoaders = {};
    this.init();
  }

  init() {
    this.addRoute('/',           '/pages/home.html');
    this.addRoute('/index.html', '/pages/home.html');
    this.addRoute('/home',       '/pages/home.html');
    this.addRoute('/proyectos/jobbot',                  '/pages/jobbot.html');
    this.addRoute('/proyectos/auditoria-contratacion',  '/pages/auditoria-contratacion.html');

    this.handleRedirect();

    if (this.isLocalDevelopment) {
      console.warn('Local development detected. Some features may be unavailable.');
    }

    window.addEventListener('popstate', () => {
      const path = this.normalizeRoute(location.pathname);
      for (const hook of this.beforeHooks) {
        try {
          const result = hook({ to: path, from: this.currentRoute, isPopstate: true });
          if (result === false) return;
        } catch (e) {
          console.error('beforeNavigate hook error:', e);
        }
      }
      this.handleRoute();
    });

    this.handleRoute();

    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        ['/'].forEach(p => this.prefetch(p));
      });
    }
  }

  handleRedirect() {
    const params   = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect');
    if (redirect) {
      const targetPath = decodeURIComponent(redirect);
      window.history.replaceState(null, '', targetPath + window.location.hash);
      this.handleRoute();
    }
  }

  /**
   * @param {string} href
   */
  handleAnchorNavigation(href) {
    const [path, hash] = href.split('#');
    const homeRoutes   = ['/', '', '/index.html', '/home'];
    if (homeRoutes.includes(path)) {
      this.navigate(hash ? '/#' + hash : '/');
    }
  }

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
    const normalized = this.normalizeRoute(path);
    if (normalized === this.currentRoute && !path.includes('#')) return;
    for (const hook of this.beforeHooks) {
      try {
        const result = hook({ to: normalized, from: this.currentRoute, isPopstate: false });
        if (result === false) return;
      } catch (e) {
        console.error('beforeNavigate hook error:', e);
      }
    }
    history.pushState(null, '', path);
    this.handleRoute(true);
  }

  /**
   * @param {string} path
   * @returns {string}
   */
  normalizeRoute(path) {
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
    const homeRoutes = ['', '/', '/index.html', '/home'];
    if (homeRoutes.includes(path)) return '/';
    if (this.routes[path]) return path;
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

  /**
   * Fetches an HTML fragment, injects it into #app, translates the resulting
   * DOM via i18n.translateDOM(), and mounts the page controller.
   *
   * The translation step MUST happen before the controller's mount() so that
   * any JS in the controller reads already-localised text nodes if needed.
   *
   * @param {string} htmlFile
   * @param {string} route
   * @param {string} [requestedPath]
   */
  async loadPage(htmlFile, route, requestedPath = route) {
    try {
      // ── Teardown previous controller ──────────────────────────────────
      const prev = this._pageControllers.get(this.currentRoute ?? '');
      if (prev?.unmount) prev.unmount();

      let html = this.cache.get(htmlFile);
      if (!html) {
        const res = await fetch(htmlFile);
        if (!res.ok) throw new Error(`HTTP ${res.status} — ${htmlFile}`);
        html = await res.text();
        this.cache.set(htmlFile, html);
      }

      const app = document.getElementById('app');
      if (!app) { console.error('#app not found'); return; }
      app.innerHTML = html;

      // ── Translate the newly injected fragment ──────────────────────────
      // i18n is guaranteed to be initialised (main.js awaits i18n.init()
      // before the router is constructed).
      i18n.translateDOM(app);

      this.updateNavigation(route);
      this.updateMetaTags(route);

      const previousRoute  = this.currentRoute;
      this.currentRoute = route;

      // ── Mount page controller (lazy-loaded) ───────────────────────────
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
    const loaders = this._controllerLoaders ?? {};
    const loader  = loaders[route];
    if (!loader) return;
    try {
      const mod        = await loader();
      const controller = mod.default ?? mod;
      if (typeof controller.mount === 'function') {
        const instance = await controller.mount();
        this._pageControllers.set(route, instance ?? {});
      }
    } catch (e) {
      console.error(`Controller error for ${route}:`, e);
    }
  }

  /** @param {Record<string, () => Promise<any>>} loaders */
  registerControllers(loaders) {
    this._controllerLoaders = loaders;
  }

  _showNotFoundPage() {
    const app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = `
      <div style="text-align:center;padding:4rem 2rem;color:var(--text-secondary);">
        <h2>${i18n.t('errors.not_found_title')}</h2>
        <a href="/" data-router-link style="color:var(--primary-color);text-decoration:none;">
          ${i18n.t('errors.not_found_back')}
        </a>
      </div>`;
  }

  /** @param {string} _route */
  updateNavigation(_route) {
    const mobileMenu = document.getElementById('mobileMenu');
    if (!mobileMenu) return;
    mobileMenu.innerHTML = `
      <button
        class="theme-toggle mobile-theme-btn"
        onclick="toggleDarkMode(); closeMobileMenu();"
        data-i18n-attr='{"aria-label":"nav.toggle_theme"}'
        aria-label="${i18n.t('nav.toggle_theme')}"
      >
        <i class="fas fa-moon" id="themeIconMobile"></i>
        <span data-i18n="nav.toggle_theme">${i18n.t('nav.toggle_theme')}</span>
      </button>
      <button
        class="theme-toggle mobile-lang-btn"
        onclick="i18n.setLocale(i18n.getLocale() === 'es' ? 'en' : 'es')"
        data-i18n-attr='{"aria-label":"nav.toggle_language"}'
        aria-label="${i18n.t('nav.toggle_language')}"
      >
        <i class="fas fa-globe"></i>
        <span data-i18n="nav.toggle_language">${i18n.t('nav.toggle_language')}</span>
      </button>`;
  }

  /**
   * Updates all <head> meta tags using i18n.t() so that titles and
   * descriptions reflect both the current route and the active locale.
   * Called on every navigation and on every 'i18n:localeChanged' event
   * (via the listener wired in main.js).
   *
   * @param {string} route
   */
  updateMetaTags(route) {
    const baseUrl = 'https://alaska45l.github.io';

    /**
     * Per-route i18n key prefixes.
     * The keys 'meta.<prefix>.title' etc. must exist in every locale file.
     * @type {Record<string, string>}
     */
    const routeMetaPrefix = {
      '/':                                      'home',
      '/proyectos/jobbot':                      'jobbot',
      '/proyectos/auditoria-contratacion':      'auditoria',
    };

    const prefix    = routeMetaPrefix[route] ?? 'home';
    const title     = i18n.t(`meta.${prefix}.title`);
    const desc      = i18n.t(`meta.${prefix}.description`);
    const ogTitle   = i18n.t(`meta.${prefix}.og_title`);
    const ogDesc    = i18n.t(`meta.${prefix}.og_description`);
    const routePath = route === '/' ? '' : route;
    const url       = `${baseUrl}${routePath}`;

    /**
     * @type {Array<{id:string, prop:'textContent'|'content', value:string}>}
     */
    const fields = [
      { id: 'page-title',               prop: 'textContent', value: title   },
      { id: 'meta-description',         prop: 'content',     value: desc    },
      { id: 'meta-og-url',              prop: 'content',     value: url     },
      { id: 'meta-og-title',            prop: 'content',     value: ogTitle },
      { id: 'meta-og-description',      prop: 'content',     value: ogDesc  },
      { id: 'meta-twitter-url',         prop: 'content',     value: url     },
      { id: 'meta-twitter-title',       prop: 'content',     value: ogTitle },
      { id: 'meta-twitter-description', prop: 'content',     value: ogDesc  },
    ];

    fields.forEach(({ id, prop, value }) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (prop === 'textContent') el.textContent = value;
      else el.setAttribute(prop, value);
    });
  }

  /** @param {function({to:string,from:string|null,isPopstate:boolean}):boolean|void} fn */
  beforeNavigate(fn) { if (typeof fn === 'function') this.beforeHooks.push(fn); }

  /** @param {function(string, {from:string|null, requested:string}):void} fn */
  afterNavigate(fn)  { if (typeof fn === 'function') this.afterHooks.push(fn);  }

  /** @param {string} path */
  prefetch(path) {
    const normalized = this.normalizeRoute(path);
    const page       = this.routes[normalized];
    if (!page || this.cache.has(page) || this.prefetching.has(page)) return;
    this.prefetching.add(page);
    fetch(page)
      .then(r => r.text())
      .then(html => { this.cache.set(page, html); this.prefetching.delete(page); })
      .catch(() => this.prefetching.delete(page));
  }

  scrollToTop() {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop            = 0;
    if (window.scrollY !== 0) window.scrollTo(0, 0);
  }
}