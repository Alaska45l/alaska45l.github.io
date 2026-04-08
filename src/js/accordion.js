// @ts-check
'use strict';

/**
 * @param {HTMLButtonElement} btn
 * @param {string} text
 */
export function copyToClipboard(btn, text) {
  navigator.clipboard.writeText(text).then(() => {
    const icon = btn.querySelector('i');
    btn.classList.add('copied');
    if (icon) icon.className = 'fas fa-check';
    setTimeout(() => {
      btn.classList.remove('copied');
      if (icon) icon.className = 'fas fa-copy';
    }, 2000);
  });
}

/** @param {HTMLElement} trigger */
export function toggleAccordion(trigger) {
  const body = /** @type {HTMLElement|null} */ (trigger.nextElementSibling);
  const icon = trigger.querySelector('.accordion-icon');
  if (!body) return;
  const isOpen = body.classList.contains('open');

  document.querySelectorAll('.accordion-body.open').forEach(b => {
    b.classList.remove('open');
    const prev = b.previousElementSibling;
    prev?.querySelector('.accordion-icon')?.classList.remove('rotated');
  });

  if (!isOpen) {
    body.classList.add('open');
    icon?.classList.add('rotated');
  }
}

// Expose on window for legacy inline onclick handlers in HTML pages
window.copyToClipboard  = copyToClipboard;
window.toggleAccordion  = toggleAccordion;