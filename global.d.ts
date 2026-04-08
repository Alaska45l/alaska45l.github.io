interface Window {
  router:             import('./src/js/router.js').SPARouter | undefined;
  navigateTo:         (path: string) => void;
  applyThemeIcons:    () => void;
  toggleDarkMode:     () => void;
  toggleMobileMenu:   () => void;
  closeMobileMenu:    () => void;
  initEasterEgg:      (el: HTMLElement, nav: (p: string) => void) => void;
  initCarousel:       () => void;
  copyToClipboard:    (btn: HTMLButtonElement, text: string) => void;
  toggleAccordion:    (trigger: HTMLElement) => void;
  handleFormSubmit:   (event: SubmitEvent, formId: string) => void;
  validateForm:       (formId: string) => boolean;
  _quantumCatGame:    { destroy(): void } | null | undefined;
  carouselInstance:   { destroy(): void } | undefined;
  GAME_CONFIG:        Readonly<Record<string, unknown>>;
}