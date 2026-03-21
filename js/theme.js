// Dark mode — detección inicial y carga de preferencia
document.addEventListener('DOMContentLoaded', () => {
    let darkMode = localStorage.getItem('darkMode');

    if (!darkMode) {
        darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'enabled' : 'disabled';
        localStorage.setItem('darkMode', darkMode);
    }

    if (darkMode === 'enabled') {
        document.body.classList.add('dark-mode');
    }

    applyThemeIcons();
});

// Sincroniza los iconos de tema con el estado actual del DOM
function applyThemeIcons() {
    const isDark = document.body.classList.contains('dark-mode');
    const targetClass = isDark ? 'fa-sun' : 'fa-moon';

    const icons = [
        document.getElementById('themeIcon'),
        document.getElementById('themeIconMobile')
    ];

    icons.forEach(icon => {
        if (!icon) return;
        icon.classList.remove('fa-moon', 'fa-sun');
        icon.classList.add(targetClass);
    });
}

// Alternar modo oscuro
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');

    if (document.body.classList.contains('dark-mode')) {
        localStorage.setItem('darkMode', 'enabled');
    } else {
        localStorage.setItem('darkMode', 'disabled');
    }

    applyThemeIcons();
}