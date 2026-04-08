// @ts-check
'use strict';

import { mountTerminal, unmountTerminal } from '../terminal.js';
import { handleFormSubmit }               from '../form.js';
import { initEasterEgg }                  from '../easterEgg.js';

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

  // ── Easter egg ──────────────────────────────────────────────────────────
  const avatar = document.getElementById('hero-avatar');
  if (avatar && window.router) {
    initEasterEgg(avatar, path => window.router?.navigate(path));
  }

  // ── Unmount ─────────────────────────────────────────────────────────────
  return {
    unmount() {
      form?.removeEventListener('submit', onSubmit);
      unmountTerminal();
    },
  };
}

export default { mount };