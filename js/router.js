class SPARouter {
  constructor() {
    this.routes = {};
    this.currentRoute = null;
    this.isLoading = false;
    this.isLocalDevelopment = window.location.protocol === 'file:';
    this.init();
  }

  init() {
    this.addRoute('/', './pages/home.html');
    this.addRoute('/index.html', './pages/home.html');
    this.addRoute('/home', './pages/home.html');
    this.addRoute('/experience', './pages/experience.html');

    this.handleRedirect();

    if (this.isLocalDevelopment) {
      console.warn('Desarrollo local detectado. Algunas funciones pueden no estar disponibles.');
    }

    window.addEventListener('popstate', () => this.handleRoute());
    this.setupLinkHandlers();
    this.handleRoute();
  }

  handleRedirect() {
    const urlParams = new URLSearchParams(window.location.search);
    const redirect = urlParams.get('redirect');
    if (redirect) {
      history.replaceState(null, '', redirect + window.location.hash);
    }
  }

  setupLinkHandlers() {
    document.addEventListener('click', (e) => {
      const link = e.target.matches('[data-router-link]')
        ? e.target
        : e.target.closest('[data-router-link]');

      if (!link) return;

      e.preventDefault();
      const href = link.getAttribute('href');

      if (href.includes('#')) {
        this.handleAnchorNavigation(href);
      } else {
        this.navigateTo(href);
      }
    });
  }

  handleAnchorNavigation(href) {
    const [path, hash] = href.split('#');
    const homeRoutes = ['/', '', '/index.html', '/home'];

    if (homeRoutes.includes(path)) {
      this.navigateTo('/');
      if (hash) {
        setTimeout(() => {
          document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }

  addRoute(path, htmlFile) {
    this.routes[path] = htmlFile;
  }

  navigateTo(path) {
    if (this.isLoading) return;
    history.pushState(null, '', path);
    this.handleRoute(true);
  }

  normalizeRoute(path) {
    // Eliminar trailing slash salvo que sea la raíz
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }

    const homeRoutes = ['', '/', '/index.html', '/home'];
    if (homeRoutes.includes(path)) return '/';

    // Comparación exacta para evitar falsos positivos con rutas similares
    if (this.routes[path]) return path;

    return '/';
  }

  async handleRoute(isProgrammaticNavigation = false) {
    if (this.isLoading) return;
    this.isLoading = true;

    const path = window.location.pathname;
    const hash = window.location.hash;
    const route = this.normalizeRoute(path);

    if (this.routes[route]) {
      await this.loadPage(this.routes[route], route);

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
      await this.loadPage(this.routes['/'], '/');
    }

    this.isLoading = false;
  }

  async loadPage(htmlFile, route) {
    try {
      const response = await fetch(htmlFile);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const html = await response.text();
      const appElement = document.getElementById('app');
      if (!appElement) { console.error('Elemento #app no encontrado'); return; }

      appElement.innerHTML = html;

      this.updateNavigation(route);
      this.updateMetaTags(route);
      this.executePageScripts(route);
      this.currentRoute = route;

      // Re-aplicar íconos de tema tras inyectar nuevo HTML
      if (typeof applyThemeIcons === 'function') applyThemeIcons();

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
    const nav = document.getElementById('main-nav');
    const mobileMenu = document.getElementById('mobileMenu');
    if (!nav || !mobileMenu) return;

    nav.innerHTML = `
      <a href="/" data-router-link>Sobre mí</a>
      <a href="/experience" data-router-link>Experiencia</a>
      <a href="/#contacto" data-router-link>Contacto</a>
    `;

    mobileMenu.innerHTML = `
      <a href="/" data-router-link onclick="closeMobileMenu()">Sobre mí</a>
      <a href="/experience" data-router-link onclick="closeMobileMenu()">Experiencia</a>
      <a href="/#contacto" data-router-link onclick="closeMobileMenu()">Contacto</a>
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
        url: `${baseUrl}/experience`
      },
      '/design': {
        title: 'Portfolio de Diseño Gráfico - Alaska E. González',
        description: 'Portfolio de diseño gráfico de Alaska E. González.',
        ogTitle: 'Portfolio de Diseño Gráfico - Alaska E. González',
        ogDesc: 'Descubre mis trabajos de diseño gráfico: logotipos, branding, contenido para redes sociales y material publicitario.',
        url: `${baseUrl}/design`
      },
      '/': {
        title: 'Alaska E. González – Portafolio',
        description: 'Portafolio profesional de Alaska E. González: experiencia en desarrollo web, diseño gráfico, soporte IT y atención al público.',
        ogTitle: 'Alaska E. González – Portafolio profesional',
        ogDesc: 'Explora el portafolio de Alaska E. González: proyectos, habilidades técnicas, estudios y contacto profesional.',
        url: baseUrl
      }
    };

    const cfg = metaUpdates[route] || metaUpdates['/'];

    [
      { id: 'page-title',              prop: 'textContent', value: cfg.title },
      { id: 'meta-description',        prop: 'content',     value: cfg.description },
      { id: 'meta-og-url',             prop: 'content',     value: cfg.url },
      { id: 'meta-og-title',           prop: 'content',     value: cfg.ogTitle },
      { id: 'meta-og-description',     prop: 'content',     value: cfg.ogDesc },
      { id: 'meta-twitter-url',        prop: 'content',     value: cfg.url },
      { id: 'meta-twitter-title',      prop: 'content',     value: cfg.ogTitle },
      { id: 'meta-twitter-description',prop: 'content',     value: cfg.ogDesc }
    ].forEach(({ id, prop, value }) => {
      const el = document.getElementById(id);
      if (!el) return;
      prop === 'textContent' ? (el.textContent = value) : el.setAttribute(prop, value);
    });
  }

  executePageScripts(route) {
    if (route === '/design') {
      setTimeout(() => this.initCarousel(), 100);
    }
  }

  initCarousel() {
    if (window.carouselInstance) window.carouselInstance.destroy();

    class Carousel {
      constructor() {
        this.currentSlide = 0;
        this.slides = document.querySelectorAll('.carousel-slide');
        this.indicators = document.querySelectorAll('.indicator');
        this.totalSlides = this.slides.length;
        this.autoSlideInterval = null;
        if (this.slides.length > 0) this.init();
      }

      init() {
        this.setupEventListeners();
        this.setupTouchEvents();
        this.startAutoSlide();
        this.setupHoverEvents();
      }

      setupEventListeners() {
        document.getElementById('prevBtn')?.addEventListener('click', () => this.prevSlide());
        document.getElementById('nextBtn')?.addEventListener('click', () => this.nextSlide());
        this.indicators.forEach((ind, i) => ind.addEventListener('click', () => this.goToSlide(i)));
      }

      setupHoverEvents() {
        const c = document.querySelector('.carousel-container');
        if (c) {
          c.addEventListener('mouseenter', () => this.stopAutoSlide());
          c.addEventListener('mouseleave', () => this.startAutoSlide());
        }
      }

      setupTouchEvents() {
        let startX = 0;
        const c = document.querySelector('.carousel-container');
        if (!c) return;
        c.addEventListener('touchstart', e => { startX = e.touches[0].clientX; });
        c.addEventListener('touchend', e => {
          const diff = startX - e.changedTouches[0].clientX;
          if (Math.abs(diff) > 50) diff > 0 ? this.nextSlide() : this.prevSlide();
        });
      }

      showSlide(i) {
        this.slides.forEach(s => s.classList.remove('active'));
        this.indicators.forEach(ind => ind.classList.remove('active'));
        this.slides[i]?.classList.add('active');
        this.indicators[i]?.classList.add('active');
        this.currentSlide = i;
      }

      nextSlide() { this.showSlide((this.currentSlide + 1) % this.totalSlides); }
      prevSlide() { this.showSlide((this.currentSlide - 1 + this.totalSlides) % this.totalSlides); }
      goToSlide(i) { this.showSlide(i); }
      startAutoSlide() { this.stopAutoSlide(); this.autoSlideInterval = setInterval(() => this.nextSlide(), 5000); }
      stopAutoSlide() { clearInterval(this.autoSlideInterval); this.autoSlideInterval = null; }
      destroy() { this.stopAutoSlide(); }
    }

    window.carouselInstance = new Carousel();
  }

  scrollToTop() {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    if (window.scrollY !== 0) window.scrollTo(0, 0);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.router = new SPARouter();
});

window.navigateTo = path => window.router?.navigateTo(path);