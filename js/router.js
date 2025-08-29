// Router SPA para GitHub Pages - Versión con soporte para desarrollo local
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
    this.addRoute('/design', './pages/graphic_design.html');

    // Si estamos en desarrollo local, cargar contenido embebido
    if (this.isLocalDevelopment) {
      console.warn('Desarrollo local detectado. Usando contenido embebido.');
      this.loadEmbeddedContent();
      return;
    }

    // Manejar navegación del navegador
    window.addEventListener('popstate', () => {
      this.handleRoute();
    });

    // Manejar clics en enlaces con data-router-link
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-router-link]') || e.target.closest('[data-router-link]')) {
        e.preventDefault();
        const link = e.target.matches('[data-router-link]') ? e.target : e.target.closest('[data-router-link]');
        const href = link.getAttribute('href');
        
        console.log('Navegando a:', href);
        
        // Manejar anclas en la misma página
        if (href.includes('#') && (href.startsWith('/') || href.startsWith('#'))) {
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
        } else {
          this.navigateTo(href);
        }
      }
    });

    // Cargar ruta inicial
    this.handleRoute();
  }

  // Contenido embebido para desarrollo local
  loadEmbeddedContent() {
    const appElement = document.getElementById('app');
    if (appElement) {
      // Contenido de home embebido para desarrollo local
      appElement.innerHTML = `
        <section class="hero">
          <div class="hero-content">
            <h1>¡Hola! Soy <span class="highlight">Alaska González</span></h1>
            <p class="hero-description">
              Desarrolladora web y diseñadora gráfica apasionada por crear experiencias digitales únicas
            </p>
            <div class="hero-buttons">
              <a href="#sobre" class="btn primary">Conoce más</a>
              <a href="/design" data-router-link class="btn secondary">Ver diseños</a>
            </div>
          </div>
        </section>

        <section id="sobre" class="section">
          <div class="container">
            <h2>Sobre mí</h2>
            <div class="about-grid">
              <div class="about-text">
                <p>
                  Soy una profesional con experiencia en desarrollo web, diseño gráfico, 
                  soporte técnico y atención al cliente. Me apasiona crear soluciones 
                  digitales que combinen funcionalidad y estética.
                </p>
                <p>
                  Actualmente me especializo en desarrollo frontend y diseño de interfaces, 
                  siempre buscando maneras de mejorar la experiencia del usuario.
                </p>
              </div>
              <div class="skills">
                <h3>Habilidades técnicas</h3>
                <ul>
                  <li>HTML5, CSS3, JavaScript</li>
                  <li>React, Vue.js</li>
                  <li>Adobe Creative Suite</li>
                  <li>Figma, Sketch</li>
                  <li>Git, GitHub</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="estudios" class="section">
          <div class="container">
            <h2>Estudios y Certificaciones</h2>
            <div class="studies-grid">
              <div class="study-item">
                <h3>Desarrollo Web Full Stack</h3>
                <p>Bootcamp intensivo - 2023</p>
              </div>
              <div class="study-item">
                <h3>Diseño Gráfico Digital</h3>
                <p>Certificación Adobe - 2022</p>
              </div>
              <div class="study-item">
                <h3>UX/UI Design</h3>
                <p>Curso especializado - 2023</p>
              </div>
            </div>
          </div>
        </section>

        <section id="contacto" class="section">
          <div class="container">
            <h2>Contacto</h2>
            <div class="contact-grid">
              <div class="contact-info">
                <h3>¡Hablemos!</h3>
                <p>Estoy disponible para proyectos freelance y oportunidades laborales.</p>
                <div class="contact-methods">
                  <a href="mailto:alaska@ejemplo.com" class="contact-method">
                    <i class="fas fa-envelope"></i>
                    alaska@ejemplo.com
                  </a>
                  <a href="https://linkedin.com/in/alaska" class="contact-method">
                    <i class="fab fa-linkedin"></i>
                    LinkedIn
                  </a>
                  <a href="https://github.com/alaska45l" class="contact-method">
                    <i class="fab fa-github"></i>
                    GitHub
                  </a>
                </div>
              </div>
              <form class="contact-form">
                <div class="form-group">
                  <input type="text" placeholder="Tu nombre" required>
                </div>
                <div class="form-group">
                  <input type="email" placeholder="Tu email" required>
                </div>
                <div class="form-group">
                  <textarea placeholder="Tu mensaje" rows="5" required></textarea>
                </div>
                <button type="submit" class="btn primary">Enviar mensaje</button>
              </form>
            </div>
          </div>
        </section>
      `;
    }
    
    this.updateNavigation('/');
    this.updateMetaTags('/');
  }

  addRoute(path, htmlFile) {
    this.routes[path] = htmlFile;
  }

  navigateTo(path) {
    if (this.isLoading) return;
    
    // Scroll to top cuando se navega a cualquier página
    this.scrollToTop();
    
    // En desarrollo local, simular navegación
    if (this.isLocalDevelopment) {
      if (path === '/design') {
        this.loadDesignContent();
      } else {
        this.loadEmbeddedContent();
      }
      return;
    }
    
    console.log('Navegando a:', path);
    history.pushState(null, '', path);
    this.handleRoute();
  }

  // Contenido de diseño embebido para desarrollo local
  loadDesignContent() {
    const appElement = document.getElementById('app');
    if (appElement) {
      appElement.innerHTML = `
        <section class="design-hero">
          <div class="container">
            <h1>Portfolio de Diseño Gráfico</h1>
            <p>Explora mis trabajos en branding, redes sociales y diseño visual</p>
          </div>
        </section>

        <section class="design-gallery">
          <div class="container">
            <h2>Proyectos Destacados</h2>
            <div class="gallery-grid">
              <div class="gallery-item">
                <div class="placeholder-image">
                  <i class="fas fa-image"></i>
                  <p>Logo Design</p>
                </div>
              </div>
              <div class="gallery-item">
                <div class="placeholder-image">
                  <i class="fas fa-palette"></i>
                  <p>Branding</p>
                </div>
              </div>
              <div class="gallery-item">
                <div class="placeholder-image">
                  <i class="fas fa-mobile-alt"></i>
                  <p>Social Media</p>
                </div>
              </div>
              <div class="gallery-item">
                <div class="placeholder-image">
                  <i class="fas fa-print"></i>
                  <p>Print Design</p>
                </div>
              </div>
            </div>
            
            <div class="back-link">
              <a href="/" data-router-link class="btn secondary">← Volver al inicio</a>
            </div>
          </div>
        </section>
      `;
    }
    
    this.updateNavigation('/design');
    this.updateMetaTags('/design');
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
    
    if (this.routes[path]) {
      return path;
    }
    
    return '/';
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
      if (this.routes['/']) {
        await this.loadPage(this.routes['/'], '/');
      }
    }

    this.isLoading = false;
  }

  async loadPage(htmlFile, route) {
    try {
      console.log('Intentando cargar:', htmlFile, 'para ruta:', route);
      
      const response = await fetch(htmlFile);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const html = await response.text();
      
      const appElement = document.getElementById('app');
      if (appElement) {
        appElement.innerHTML = html;
        console.log('Contenido cargado exitosamente para:', route);
      } else {
        console.error('Elemento #app no encontrado');
      }
      
      this.updateNavigation(route);
      this.updateMetaTags(route);
      this.executePageScripts(route);
      this.currentRoute = route;
      
    } catch (error) {
      console.error('Error loading page:', error);
      console.error('Archivo no encontrado:', htmlFile);
      
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
  }

  updateNavigation(route) {
    const nav = document.getElementById('main-nav');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (!nav || !mobileMenu) return;
    
    const navLinks = `
      <a href="/" data-router-link>Inicio</a>
      <a href="/#sobre" data-router-link>Sobre mí</a>
      <a href="/#estudios" data-router-link>Estudios</a>
      <a href="/#contacto" data-router-link>Contacto</a>
    `;
    
    const mobileLinks = `
      <a href="/" data-router-link onclick="closeMobileMenu()">Inicio</a>
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
    
    const titleEl = document.getElementById('page-title');
    const descEl = document.getElementById('meta-description');
    const ogUrl = document.getElementById('meta-og-url');
    const ogTitle = document.getElementById('meta-og-title');
    const ogDesc = document.getElementById('meta-og-description');
    const twitterUrl = document.getElementById('meta-twitter-url');
    const twitterTitle = document.getElementById('meta-twitter-title');
    const twitterDesc = document.getElementById('meta-twitter-description');
    
    if (route === '/design') {
      if (titleEl) titleEl.textContent = 'Portfolio de Diseño Gráfico - Alaska E. González';
      if (descEl) descEl.setAttribute('content', 'Portfolio de diseño gráfico de Alaska E. González - Explora mis trabajos en branding, redes sociales y diseño visual.');
      if (ogUrl) ogUrl.setAttribute('content', `${baseUrl}/design`);
      if (ogTitle) ogTitle.setAttribute('content', 'Portfolio de Diseño Gráfico - Alaska E. González');
      if (ogDesc) ogDesc.setAttribute('content', 'Descubre mis trabajos de diseño gráfico: logotipos, branding, contenido para redes sociales y material publicitario.');
      if (twitterUrl) twitterUrl.setAttribute('content', `${baseUrl}/design`);
      if (twitterTitle) twitterTitle.setAttribute('content', 'Portfolio de Diseño Gráfico - Alaska E. González');
      if (twitterDesc) twitterDesc.setAttribute('content', 'Descubre mis trabajos de diseño gráfico: logotipos, branding, contenido para redes sociales y material publicitario.');
    } else {
      if (titleEl) titleEl.textContent = 'Alaska E. González — Portafolio';
      if (descEl) descEl.setAttribute('content', 'Portafolio profesional de Alaska E. González: experiencia en desarrollo web, diseño gráfico, soporte IT y atención al público. Descubre mis proyectos, estudios y formas de contacto.');
      if (ogUrl) ogUrl.setAttribute('content', baseUrl);
      if (ogTitle) ogTitle.setAttribute('content', 'Alaska E. González — Portafolio profesional');
      if (ogDesc) ogDesc.setAttribute('content', 'Explora el portafolio de Alaska E. González: proyectos, habilidades técnicas, estudios y contacto profesional en desarrollo web, diseño y soporte IT.');
      if (twitterUrl) twitterUrl.setAttribute('content', baseUrl);
      if (twitterTitle) twitterTitle.setAttribute('content', 'Alaska E. González — Portafolio profesional');
      if (twitterDesc) twitterDesc.setAttribute('content', 'Explora el portafolio de Alaska E. González: proyectos, habilidades técnicas, estudios y contacto profesional en desarrollo web, diseño y soporte IT.');
    }
  }

  executePageScripts(route) {
    if (route === '/design') {
      setTimeout(() => {
        this.initCarousel();
      }, 100);
    }
  }

  initCarousel() {
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
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        
        if (prevBtn) prevBtn.addEventListener('click', () => this.prevSlide());
        if (nextBtn) nextBtn.addEventListener('click', () => this.nextSlide());
        
        this.indicators.forEach((indicator, index) => {
          indicator.addEventListener('click', () => this.goToSlide(index));
        });

        this.setupTouchEvents();
        this.startAutoSlide();
        
        const container = document.querySelector('.carousel-container');
        if (container) {
          container.addEventListener('mouseenter', () => this.stopAutoSlide());
          container.addEventListener('mouseleave', () => this.startAutoSlide());
        }

        console.log('Carousel inicializado con', this.totalSlides, 'slides');
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

      destroy() {
        this.stopAutoSlide();
      }
    }
    
    window.carouselInstance = new Carousel();
  }

  // Función para hacer scroll to top suave
  scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
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