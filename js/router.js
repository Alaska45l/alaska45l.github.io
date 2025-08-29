// Router SPA para GitHub Pages - Versión optimizada
class SPARouter {
  constructor() {
    this.routes = {};
    this.currentRoute = null;
    this.isLoading = false;
    this.isLocalDevelopment = window.location.protocol === 'file:';
    this.init();
  }

  init() {
    // Configurar rutas
    this.addRoute('/', './pages/home.html');
    this.addRoute('/index.html', './pages/home.html');
    this.addRoute('/design', './pages/design.html');

    // Manejar redirección desde 404.html
    this.handleRedirect();

    // Si estamos en desarrollo local, mostrar aviso
    if (this.isLocalDevelopment) {
      console.warn('Desarrollo local detectado. Algunas funciones pueden no estar disponibles.');
    }

    // Manejar navegación del navegador
    window.addEventListener('popstate', () => {
      this.handleRoute();
    });

    // Manejar clics en enlaces con data-router-link
    this.setupLinkHandlers();
    
    // Cargar ruta inicial
    this.handleRoute();
  }

  handleRedirect() {
    const urlParams = new URLSearchParams(window.location.search);
    const redirect = urlParams.get('redirect');
    
    if (redirect) {
      // Limpiar el parámetro redirect de la URL
      const newUrl = window.location.origin + redirect + window.location.hash;
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
      
      console.log('Navegando a:', href);
      
      // Manejar anclas en la misma página
      if (href.includes('#')) {
        this.handleAnchorNavigation(href);
      } else {
        this.navigateTo(href);
      }
    });
  }

  handleAnchorNavigation(href) {
    const [path, hash] = href.split('#');
    
    if (path === '/' || path === '' || path === '/index.html') {
      this.navigateTo('/');
      if (hash) {
        setTimeout(() => {
          const element = document.getElementById(hash);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      }
    }
  }

  addRoute(path, htmlFile) {
    this.routes[path] = htmlFile;
  }

  navigateTo(path) {
    if (this.isLoading) return;
    
    this.scrollToTop();
    
    console.log('Navegando a:', path);
    history.pushState(null, '', path);
    this.handleRoute();
  }

  normalizeRoute(path) {
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    
    if (path === '' || path === '/' || path === '/index.html') {
      return '/';
    }
    
    if (path === '/design' || path.includes('design')) {
      return '/design';
    }
    
    return this.routes[path] ? path : '/';
  }

  async handleRoute() {
    if (this.isLoading) return;
    this.isLoading = true;

    let path = window.location.pathname;
    const hash = window.location.hash;
    
    console.log('Manejando ruta:', path, 'Hash:', hash);
    
    let route = this.normalizeRoute(path);
    console.log('Ruta normalizada:', route);

    // Scroll to top al cambiar de ruta (excepto si hay hash)
    if (!hash) {
      this.scrollToTop();
    }

    if (this.routes[route]) {
      await this.loadPage(this.routes[route], route);
      
      // Manejar scroll a ancla después de cargar la página
      if (hash) {
        setTimeout(() => {
          const element = document.getElementById(hash.replace('#', ''));
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      }
    } else {
      console.warn('Ruta no encontrada:', route);
      // Fallback a página principal
      if (this.routes['/']) {
        await this.loadPage(this.routes['/'], '/');
      }
    }

    this.isLoading = false;
  }

  async loadPage(htmlFile, route) {
    try {
      console.log('Cargando:', htmlFile, 'para ruta:', route);
      
      const response = await fetch(htmlFile);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const html = await response.text();
      
      const appElement = document.getElementById('app');
      if (!appElement) {
        console.error('Elemento #app no encontrado');
        return;
      }
      
      appElement.innerHTML = html;
      console.log('Contenido cargado exitosamente para:', route);
      
      // Ejecutar tareas post-carga
      this.updateNavigation(route);
      this.updateMetaTags(route);
      this.executePageScripts(route);
      this.currentRoute = route;
      
    } catch (error) {
      console.error('Error loading page:', error);
      this.showNotFoundPage();
    }
  }

  showNotFoundPage() {
    const appElement = document.getElementById('app');
    if (appElement) {
      appElement.innerHTML = `
        <div style="text-align: center; padding: 4rem 2rem; color: var(--text-secondary);">
          <h2>Página no encontrada</h2>
          <p>No se pudo cargar el contenido solicitado.</p>
          <a href="/" data-router-link style="color: var(--primary-color); text-decoration: none;">
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
    
    const navLinks = `
      <a href="/#sobre" data-router-link>Sobre mí</a>
      <a href="/#estudios" data-router-link>Estudios</a>
      <a href="/#contacto" data-router-link>Contacto</a>
    `;
    
    const mobileLinks = `
      <a href="/#sobre" data-router-link onclick="closeMobileMenu()">Sobre mí</a>
      <a href="/#estudios" data-router-link onclick="closeMobileMenu()">Estudios</a>
      <a href="/#contacto" data-router-link onclick="closeMobileMenu()">Contacto</a>
      <button class="theme-toggle mobile-theme-btn" onclick="toggleDarkMode(); closeMobileMenu();">
        <i class="fas fa-moon" id="themeIconMobile"></i> Cambiar tema
      </button>
    `;
    
    nav.innerHTML = navLinks;
    mobileMenu.innerHTML = mobileLinks;
  }

  updateMetaTags(route) {
    const baseUrl = 'https://alaska45l.github.io';
    
    const metaUpdates = {
      '/design': {
        title: 'Portfolio de Diseño Gráfico - Alaska E. González',
        description: 'Portfolio de diseño gráfico de Alaska E. González - Explora mis trabajos en branding, redes sociales y diseño visual.',
        ogTitle: 'Portfolio de Diseño Gráfico - Alaska E. González',
        ogDesc: 'Descubre mis trabajos de diseño gráfico: logotipos, branding, contenido para redes sociales y material publicitario.',
        url: `${baseUrl}/design`
      },
      '/': {
        title: 'Alaska E. González – Portafolio',
        description: 'Portafolio profesional de Alaska E. González: experiencia en desarrollo web, diseño gráfico, soporte IT y atención al público. Descubre mis proyectos, estudios y formas de contacto.',
        ogTitle: 'Alaska E. González – Portafolio profesional',
        ogDesc: 'Explora el portafolio de Alaska E. González: proyectos, habilidades técnicas, estudios y contacto profesional en desarrollo web, diseño y soporte IT.',
        url: baseUrl
      }
    };

    const config = metaUpdates[route] || metaUpdates['/'];
    
    // Actualizar meta tags
    const updates = [
      { id: 'page-title', prop: 'textContent', value: config.title },
      { id: 'meta-description', prop: 'content', value: config.description },
      { id: 'meta-og-url', prop: 'content', value: config.url },
      { id: 'meta-og-title', prop: 'content', value: config.ogTitle },
      { id: 'meta-og-description', prop: 'content', value: config.ogDesc },
      { id: 'meta-twitter-url', prop: 'content', value: config.url },
      { id: 'meta-twitter-title', prop: 'content', value: config.ogTitle },
      { id: 'meta-twitter-description', prop: 'content', value: config.ogDesc }
    ];

    updates.forEach(({ id, prop, value }) => {
      const element = document.getElementById(id);
      if (element) {
        if (prop === 'textContent') {
          element.textContent = value;
        } else {
          element.setAttribute(prop, value);
        }
      }
    });
  }

  executePageScripts(route) {
    if (route === '/design') {
      // Inicializar carousel con delay para asegurar que el DOM esté listo
      setTimeout(() => {
        this.initCarousel();
      }, 100);
    }
  }

  initCarousel() {
    // Destruir instancia anterior si existe
    if (window.carouselInstance) {
      window.carouselInstance.destroy();
    }

    class Carousel {
      constructor() {
        this.currentSlide = 0;
        this.slides = document.querySelectorAll('.carousel-slide');
        this.indicators = document.querySelectorAll('.indicator');
        this.totalSlides = this.slides.length;
        this.autoSlideInterval = null;
        
        if (this.slides.length > 0) {
          this.init();
        }
      }

      init() {
        this.setupEventListeners();
        this.setupTouchEvents();
        this.startAutoSlide();
        this.setupHoverEvents();
        
        console.log('Carousel inicializado con', this.totalSlides, 'slides');
      }

      setupEventListeners() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        
        if (prevBtn) prevBtn.addEventListener('click', () => this.prevSlide());
        if (nextBtn) nextBtn.addEventListener('click', () => this.nextSlide());
        
        this.indicators.forEach((indicator, index) => {
          indicator.addEventListener('click', () => this.goToSlide(index));
        });
      }

      setupHoverEvents() {
        const container = document.querySelector('.carousel-container');
        if (container) {
          container.addEventListener('mouseenter', () => this.stopAutoSlide());
          container.addEventListener('mouseleave', () => this.startAutoSlide());
        }
      }

      setupTouchEvents() {
        let startX = 0;
        let endX = 0;
        const container = document.querySelector('.carousel-container');

        if (container) {
          container.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
          });

          container.addEventListener('touchend', (e) => {
            endX = e.changedTouches[0].clientX;
            this.handleSwipe(startX, endX);
          });
        }
      }

      handleSwipe(startX, endX) {
        const threshold = 50;
        const diff = startX - endX;

        if (Math.abs(diff) > threshold) {
          if (diff > 0) {
            this.nextSlide();
          } else {
            this.prevSlide();
          }
        }
      }

      showSlide(index) {
        this.slides.forEach(slide => slide.classList.remove('active'));
        this.indicators.forEach(indicator => indicator.classList.remove('active'));

        if (this.slides[index]) this.slides[index].classList.add('active');
        if (this.indicators[index]) this.indicators[index].classList.add('active');

        this.currentSlide = index;
      }

      nextSlide() {
        const next = (this.currentSlide + 1) % this.totalSlides;
        this.showSlide(next);
      }

      prevSlide() {
        const prev = (this.currentSlide - 1 + this.totalSlides) % this.totalSlides;
        this.showSlide(prev);
      }

      goToSlide(index) {
        this.showSlide(index);
      }

      startAutoSlide() {
        this.stopAutoSlide();
        this.autoSlideInterval = setInterval(() => this.nextSlide(), 5000);
      }

      stopAutoSlide() {
        if (this.autoSlideInterval) {
          clearInterval(this.autoSlideInterval);
          this.autoSlideInterval = null;
        }
      }

      destroy() {
        this.stopAutoSlide();
      }
    }
    
    window.carouselInstance = new Carousel();
  }

  scrollToTop() {
    // Forzar scroll inmediato y luego suave
    window.scrollTo(0, 0);
    
    // Usar requestAnimationFrame para el comportamiento suave
    requestAnimationFrame(() => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }
}

// Inicializar router cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {
  window.router = new SPARouter();
  console.log('Router inicializado');
});

// Función de navegación global para uso en templates
window.navigateTo = (path) => {
  if (window.router) {
    window.router.navigateTo(path);
  }
};