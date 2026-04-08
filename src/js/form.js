// @ts-check
'use strict';

/**
 * @param {string} formId
 * @returns {boolean}
 */
export function validateForm(formId) {
  const form = /** @type {HTMLFormElement|null} */ (document.getElementById(formId));
  if (!form) return false;
  let isValid = true;
  form.querySelectorAll('input[required], textarea[required]').forEach(el => {
    const input = /** @type {HTMLInputElement|HTMLTextAreaElement} */ (el);
    if (!input.value.trim()) { input.classList.add('error');    isValid = false; }
    else                     { input.classList.remove('error'); }
  });
  return isValid;
}

/**
 * @param {SubmitEvent} event
 * @param {string}      formId
 */
export function handleFormSubmit(event, formId) {
  event.preventDefault();
  if (!validateForm(formId)) return;

  const form = /** @type {HTMLFormElement|null} */ (document.getElementById(formId));
  if (!form) return;
  const submitBtn = /** @type {HTMLButtonElement|null} */ (form.querySelector('button[type="submit"]'));
  if (!submitBtn) return;

  const formData       = new FormData(form);
  submitBtn.disabled   = true;
  submitBtn.innerHTML  = '<i class="fas fa-spinner fa-spin"></i> Enviando…';

  fetch(form.action, { method: 'POST', body: formData, headers: { Accept: 'application/json' } })
    .then(response => {
      if (!response.ok) return response.json().then(d => { throw new Error(d?.error ?? 'Server error'); });
      form.reset();
      submitBtn.innerHTML        = '<i class="fas fa-check"></i> ¡Mensaje enviado!';
      submitBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
      setTimeout(() => {
        submitBtn.disabled         = false;
        submitBtn.innerHTML        = '<i class="fas fa-paper-plane"></i> Enviar mensaje';
        submitBtn.style.background = '';
      }, 4000);
    })
    .catch(err => {
      console.error('Form error:', err);
      submitBtn.disabled         = false;
      submitBtn.innerHTML        = '<i class="fas fa-exclamation-circle"></i> Error al enviar';
      submitBtn.style.background = 'linear-gradient(135deg, #e53e3e, #c53030)';
      setTimeout(() => {
        submitBtn.innerHTML        = '<i class="fas fa-paper-plane"></i> Enviar mensaje';
        submitBtn.style.background = '';
      }, 4000);
    });
}

// ── Expose for inline onsubmit handlers in HTML ─────────────────────────
/** @type {any} */ (window).handleFormSubmit = handleFormSubmit;
/** @type {any} */ (window).validateForm     = validateForm;