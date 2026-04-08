// @ts-check
'use strict';

export function toggleMobileMenu() {
  document.getElementById('mobileMenu')?.classList.toggle('active');
}

export function closeMobileMenu() {
  document.getElementById('mobileMenu')?.classList.remove('active');
}

// Expose for legacy inline onclick handlers
window.toggleMobileMenu = toggleMobileMenu;
window.closeMobileMenu  = closeMobileMenu;
