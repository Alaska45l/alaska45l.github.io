(function () {

  function initCarousel() {
    if (window.carouselInstance) window.carouselInstance.destroy();

    class Carousel {
      constructor() {
        this.currentSlide      = 0;
        this.slides            = document.querySelectorAll('.carousel-slide');
        this.indicators        = document.querySelectorAll('.indicator');
        this.totalSlides       = this.slides.length;
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
        c.addEventListener('touchend',   e => {
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

      nextSlide()      { this.showSlide((this.currentSlide + 1) % this.totalSlides); }
      prevSlide()      { this.showSlide((this.currentSlide - 1 + this.totalSlides) % this.totalSlides); }
      goToSlide(i)     { this.showSlide(i); }
      startAutoSlide() { this.stopAutoSlide(); this.autoSlideInterval = setInterval(() => this.nextSlide(), 5000); }
      stopAutoSlide()  { clearInterval(this.autoSlideInterval); this.autoSlideInterval = null; }
      destroy()        { this.stopAutoSlide(); }
    }

    window.carouselInstance = new Carousel();
  }

  window.initCarousel = initCarousel;

}());