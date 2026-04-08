// @ts-check
'use strict';

document.addEventListener('DOMContentLoaded', () => {
  let darkMode = localStorage.getItem('darkMode');
  if (!darkMode) {
    darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'enabled' : 'disabled';
    localStorage.setItem('darkMode', darkMode);
  }
  if (darkMode === 'enabled') document.body.classList.add('dark-mode');
  applyThemeIcons();
});

export function applyThemeIcons() {
  const isDark      = document.body.classList.contains('dark-mode');
  const targetClass = isDark ? 'fa-sun' : 'fa-moon';
  ['themeIcon', 'themeIconMobile'].forEach(id => {
    const icon = document.getElementById(id);
    if (!icon) return;
    icon.classList.remove('fa-moon', 'fa-sun');
    icon.classList.add(targetClass);
  });
}

export function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem('darkMode',
    document.body.classList.contains('dark-mode') ? 'enabled' : 'disabled'
  );
  applyThemeIcons();
}

// ── Expose for inline onclick handlers in HTML ──────────────────────────
window.applyThemeIcons = applyThemeIcons;
window.toggleDarkMode  = toggleDarkMode;