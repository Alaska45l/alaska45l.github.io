// @ts-check
'use strict';

(function () {

  function initCarousel() {
    if (window.carouselInstance) window.carouselInstance.destroy();

    class Carousel {
      constructor() {
        this.currentSlide       = 0;
        this.slides             = /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll('.carousel-slide'));
        this.indicators         = /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll('.indicator'));
        this.totalSlides        = this.slides.length;
        /** @type {ReturnType<typeof setInterval>|null} */
        this.autoSlideInterval  = null;
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
        const c = /** @type {HTMLElement|null} */ (document.querySelector('.carousel-container'));
        if (!c) return;
        c.addEventListener('touchstart', e => {
          const touchEvent = /** @type {TouchEvent} */ (e);
          startX = touchEvent.touches[0].clientX;
        });
        c.addEventListener('touchend', e => {
          const touchEvent = /** @type {TouchEvent} */ (e);
          const diff = startX - touchEvent.changedTouches[0].clientX;
          if (Math.abs(diff) > 50) diff > 0 ? this.nextSlide() : this.prevSlide();
        });
      }

      /** @param {number} i */
      showSlide(i) {
        this.slides.forEach(s => s.classList.remove('active'));
        this.indicators.forEach(ind => ind.classList.remove('active'));
        this.slides[i]?.classList.add('active');
        this.indicators[i]?.classList.add('active');
        this.currentSlide = i;
      }

      nextSlide()      { this.showSlide((this.currentSlide + 1) % this.totalSlides); }
      prevSlide()      { this.showSlide((this.currentSlide - 1 + this.totalSlides) % this.totalSlides); }
      /** @param {number} i */ goToSlide(i) { this.showSlide(i); }

      startAutoSlide() {
        this.stopAutoSlide();
        this.autoSlideInterval = setInterval(() => this.nextSlide(), 5000);
      }
      stopAutoSlide()  {
        if (this.autoSlideInterval !== null) clearInterval(this.autoSlideInterval);
        this.autoSlideInterval = null;
      }
      destroy() { this.stopAutoSlide(); }
    }

    window.carouselInstance = new Carousel();
  }

  window.initCarousel = initCarousel;

}());