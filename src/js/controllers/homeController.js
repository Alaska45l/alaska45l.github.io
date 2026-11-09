// @ts-check
'use strict';

import { mountTerminal, unmountTerminal } from '../terminal.js';
import { handleFormSubmit }               from '../form.js';

/**
 * @typedef {{ unmount: () => void }} ControllerInstance
 */

/**
 * Called by the router after home.html is injected into #app.
 * @returns {ControllerInstance}
 */
export function mount() {
  // ── Terminal ────────────────────────────────────────────────────────────
  mountTerminal();

  // ── Contact form ────────────────────────────────────────────────────────
  const form = /** @type {HTMLFormElement|null} */ (
    document.getElementById('contact-form')
  );

  /** @param {SubmitEvent} e */
  function onSubmit(e) { handleFormSubmit(e, 'contact-form'); }
  form?.addEventListener('submit', onSubmit);

  // ── CV removed notice ───────────────────────────────────────────────────
  const cvBtn    = document.getElementById('cv-btn');
  const cvDialog = /** @type {HTMLDialogElement|null} */ (
    document.getElementById('cv-removed-dialog')
  );

  /** @param {MouseEvent} e */
  function onCvClick(e) {
    if (!cvDialog || typeof cvDialog.showModal !== 'function') return; // fallback: href="#contacto"
    e.preventDefault();
    cvDialog.showModal();
  }

  /** @param {MouseEvent} e */
  function onDialogClick(e) {
    if (!cvDialog) return;
    const target = /** @type {Element} */ (e.target);
    // Close on backdrop click (target is the dialog itself) or on [data-cv-dialog-close].
    // The contact link keeps propagating so the eventDispatcher scrolls to #contacto.
    if (target === cvDialog || target.closest('[data-cv-dialog-close]')) {
      cvDialog.close();
      cvBtn?.blur();
    }
  }

  cvBtn?.addEventListener('click', onCvClick);
  cvDialog?.addEventListener('click', onDialogClick);

  // ── Unmount ─────────────────────────────────────────────────────────────
  return {
    unmount() {
      form?.removeEventListener('submit', onSubmit);
      cvBtn?.removeEventListener('click', onCvClick);
      cvDialog?.removeEventListener('click', onDialogClick);
      if (cvDialog?.open) cvDialog.close();
      unmountTerminal();
    },
  };
}

export default { mount };