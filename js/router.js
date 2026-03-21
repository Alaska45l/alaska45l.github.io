class SPARouter {
  constructor() {
    this.routes = {};
    this.currentRoute = null;
    this.isLoading = false;
    this.cache = new Map();
    this.isLocalDevelopment = window.location.protocol === 'file:';
    // navigate = internal API used throughout JS files.
    // navigateTo = legacy/public method kept for the window.navigateTo
    //              wrapper and backward compatibility with inline HTML.
    this.navigate = this.navigateTo.bind(this);
    // HOOK SYSTEM START
    this.beforeHooks  = [];
    this.afterHooks   = [];
    this.prefetching  = new Set(); // tracks in-flight prefetch requests
    // HOOK SYSTEM END
    this.init();
  }

  init() {
    this.addRoute('/', './pages/home.html');
    this.addRoute('/index.html', './pages/home.html');
    this.addRoute('/home', './pages/home.html');
    this.addRoute('/experience', './pages/experience.html');
    this.addRoute('/game', './pages/game.html');

    this.handleRedirect();

    if (this.isLocalDevelopment) {
      console.warn('Desarrollo local detectado. Algunas funciones pueden no estar disponibles.');
    }

    window.addEventListener('popstate', () => {
      // HOOK SYSTEM START — beforeHooks run on browser back/forward
      const path = this.normalizeRoute(location.pathname);
      for (const hook of this.beforeHooks) {
        try {
          const result = hook({ to: path, from: this.currentRoute, isPopstate: true });
          if (result === false) {
            console.warn('Navigation cancelled by beforeNavigate hook:', path);
            return;
          }
        } catch (e) {
          console.error('beforeNavigate hook error:', e);
        }
      }
      // HOOK SYSTEM END
      this.handleRoute();
    });
    this.handleRoute();

    if ('requestIdleCallback' in window) {
      // Warm up only the most likely next destinations.
      // Hover-based prefetch covers the rest on demand.
      const criticalRoutes = ['/', '/experience'];
      requestIdleCallback(() => {
        criticalRoutes.forEach(path => this.prefetch(path));
      });
    }
  }

  handleRedirect() {
    const urlParams = new URLSearchParams(window.location.search);
    const redirect = urlParams.get('redirect');
    if (redirect) {
      history.replaceState(null, '', redirect + window.location.hash);
    }
  }

  handleAnchorNavigation(href) {
    const [path, hash] = href.split('#');
    const homeRoutes = ['/', '', '/index.html', '/home'];

    if (homeRoutes.includes(path)) {
      // Pass the full href including the hash so beforeHooks receive the
      // complete destination and scroll still fires via handleRoute's hash logic.
      this.navigate(hash ? '/#' + hash : '/');
    }
  }

  addRoute(path, htmlFile) {
    this.routes[path] = htmlFile;
  }

  navigateTo(path) {
    if (this.isLoading) return;

    const normalized = this.normalizeRoute(path);
    if (normalized === this.currentRoute && !path.includes('#')) return;

    // HOOK SYSTEM START — beforeHooks can cancel navigation by returning false
    for (const hook of this.beforeHooks) {
      try {
        const result = hook({ to: normalized, from: this.currentRoute, isPopstate: false });
        if (result === false) {
          console.warn('Navigation cancelled by beforeNavigate hook:', normalized);
          return;
        }
      } catch (e) {
        console.error('beforeNavigate hook error:', e);
      }
    }
    // HOOK SYSTEM END

    history.pushState(null, '', path);
    this.handleRoute(true);
  }

  normalizeRoute(path) {
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }

    const homeRoutes = ['', '/', '/index.html', '/home'];
    if (homeRoutes.includes(path)) return '/';

    if (this.routes[path]) return path;

    return '/';
  }

  async handleRoute(isProgrammaticNavigation = false) {
    if (this.isLoading) return;
    this.isLoading = true;

    try {
      const path  = window.location.pathname;
      const hash  = window.location.hash;
      const route = this.normalizeRoute(path);

      if (this.routes[route]) {
        await this.loadPage(this.routes[route], route, path);

        if (isProgrammaticNavigation && !hash) {
          setTimeout(() => this.scrollToTop(), 10);
        }

        if (hash) {
          setTimeout(() => {
            document.getElementById(hash.replace('#', ''))?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
      } else {
        console.warn('Ruta no encontrada:', route);
        await this.loadPage(this.routes['/'], '/', path);
      }
    } finally {
      this.isLoading = false;
    }
  }

  async loadPage(htmlFile, route, requestedPath = route) {
    try {
      let html;

      if (this.cache.has(htmlFile)) {
        html = this.cache.get(htmlFile);
      } else {
        const response = await fetch(htmlFile);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        html = await response.text();
        this.cache.set(htmlFile, html);
      }

      const appElement = document.getElementById('app');
      if (!appElement) { console.error('Elemento #app no encontrado'); return; }

      // Inject HTML first so all subsequent calls operate on the new DOM.
      appElement.innerHTML = html;

      this.updateNavigation(route);
      this.updateMetaTags(route);
      this.executePageScripts(route);
      // HOOK SYSTEM START — afterHooks run after successful page load.
      // previousRoute is captured before assignment so hooks always receive
      // the route the user navigated FROM, not the one they landed on.
      // `requested` preserves the original path so hooks can distinguish
      // a clean navigation to '/' from a fallback caused by an unknown route.
      const previousRoute = this.currentRoute;
      this.currentRoute = route;

      if (typeof applyThemeIcons === 'function') applyThemeIcons();

      const current = this.currentRoute;
      this.afterHooks.forEach(fn => {
        try {
          fn(current, { from: previousRoute, requested: requestedPath });
        } catch (e) {
          console.error('afterNavigate hook error:', e);
        }
      });
      // HOOK SYSTEM END

    } catch (error) {
      console.error('Error loading page:', error);
      this.showNotFoundPage();
    }
  }

  showNotFoundPage() {
    const appElement = document.getElementById('app');
    if (appElement) {
      appElement.innerHTML = `
        <div style="text-align:center;padding:4rem 2rem;color:var(--text-secondary);">
          <h2>Página no encontrada</h2>
          <p>No se pudo cargar el contenido solicitado.</p>
          <a href="/" data-router-link style="color:var(--primary-color);text-decoration:none;">
            ← Volver al inicio
          </a>
        </div>
      `;
    }
  }

  updateNavigation(route) {
    const nav        = document.getElementById('main-nav');
    const mobileMenu = document.getElementById('mobileMenu');
    if (!nav || !mobileMenu) return;

    mobileMenu.innerHTML = `
      <button class="theme-toggle mobile-theme-btn" onclick="toggleDarkMode(); closeMobileMenu();">
        <i class="fas fa-moon" id="themeIconMobile"></i> Cambiar tema
      </button>
    `;
  }

  updateMetaTags(route) {
    const baseUrl = 'https://alaska45l.github.io';

    const metaUpdates = {
      '/experience': {
        title: 'Experiencia Profesional - Alaska E. González',
        description: 'Conoce mi trayectoria profesional, habilidades técnicas y experiencia en atención al cliente, soporte IT y diseño gráfico.',
        ogTitle: 'Experiencia Profesional - Alaska E. González',
        ogDesc: 'Descubre mi experiencia laboral en atención al cliente, soporte técnico, diseño gráfico y gestión de redes sociales.',
        url: `${baseUrl}/experience`,
      },
      '/game': {
        title: 'Quantum Cat Invaders - Alaska E. González',
        description: 'Un Space Invaders con temática cuántica. Gatos, física y jefes como la Caja de Schrödinger.',
        ogTitle: 'Quantum Cat Invaders 🐱',
        ogDesc: 'Easter egg: un Space Invaders cuántico escondido en el portafolio de Alaska.',
        url: `${baseUrl}/game`,
      },
      '/': {
        title: 'Alaska E. González – Portafolio',
        description: 'Portafolio profesional de Alaska E. González: experiencia en desarrollo web, diseño gráfico, soporte IT y atención al público.',
        ogTitle: 'Alaska E. González – Portafolio profesional',
        ogDesc: 'Explora el portafolio de Alaska E. González: proyectos, habilidades técnicas, estudios y contacto profesional.',
        url: baseUrl,
      },
    };

    const cfg = metaUpdates[route] || metaUpdates['/'];

    // Cache elements before the loop to avoid repeated getElementById calls.
    const fields = [
      { id: 'page-title',               prop: 'textContent', value: cfg.title       },
      { id: 'meta-description',         prop: 'content',     value: cfg.description },
      { id: 'meta-og-url',              prop: 'content',     value: cfg.url         },
      { id: 'meta-og-title',            prop: 'content',     value: cfg.ogTitle     },
      { id: 'meta-og-description',      prop: 'content',     value: cfg.ogDesc      },
      { id: 'meta-twitter-url',         prop: 'content',     value: cfg.url         },
      { id: 'meta-twitter-title',       prop: 'content',     value: cfg.ogTitle     },
      { id: 'meta-twitter-description', prop: 'content',     value: cfg.ogDesc      },
    ];

    fields.forEach(({ id, prop, value }) => {
      const el = document.getElementById(id);
      if (!el) return;
      prop === 'textContent' ? (el.textContent = value) : el.setAttribute(prop, value);
    });
  }

  executePageScripts(route) {
    if (route === '/design') {
      setTimeout(() => {
        if (typeof initCarousel === 'function') initCarousel();
      }, 100);
    }
    if (route === '/') {
      setTimeout(() => {
        const avatar = document.getElementById('hero-avatar');
        if (typeof initEasterEgg === 'function') {
          initEasterEgg(avatar, path => this.navigate(path));
        }
      }, 200);
    }
    // /game: game.js self-initialises via MutationObserver on #game-canvas
  }

  // HOOK SYSTEM START
  beforeNavigate(fn) {
    if (typeof fn === 'function') this.beforeHooks.push(fn);
  }

  afterNavigate(fn) {
    if (typeof fn === 'function') this.afterHooks.push(fn);
  }
  // HOOK SYSTEM END

  prefetch(path) {
    const normalized = this.normalizeRoute(path);
    const page = this.routes[normalized];

    if (!page) return;
    if (this.cache.has(page)) return;
    if (this.prefetching.has(page)) return; // request already in flight

    this.prefetching.add(page);
    fetch(page)
      .then(res => res.text())
      .then(html => {
        this.cache.set(page, html);
        this.prefetching.delete(page);
      })
      .catch(() => { this.prefetching.delete(page); });
  }

  scrollToTop() {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop            = 0;
    if (window.scrollY !== 0) window.scrollTo(0, 0);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.router = new SPARouter();
});

// Thin global wrapper kept for backward compatibility with inline HTML handlers
// (onclick="navigateTo(...)"). All internal code uses router.navigate() instead.
window.navigateTo = (path) => window.router?.navigate(path);