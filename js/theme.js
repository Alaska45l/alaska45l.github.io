// Dark mode — detección inicial y carga de preferencia
document.addEventListener('DOMContentLoaded', () => {
    const themeIcon = document.getElementById('themeIcon');
    const themeIconMobile = document.getElementById('themeIconMobile');
    let darkMode = localStorage.getItem('darkMode');

    // Si no hay preferencia guardada, usar la del sistema
    if (!darkMode) {
        darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'enabled' : 'disabled';
        localStorage.setItem('darkMode', darkMode);
    }

    // Aplicar la preferencia guardada
    if (darkMode === 'enabled') {
        document.body.classList.add('dark-mode');
        themeIcon.className = 'fas fa-sun';
        themeIconMobile.className = 'fas fa-sun';
    } else {
        themeIcon.className = 'fas fa-moon';
        themeIconMobile.className = 'fas fa-moon';
    }
});

// Alternar modo oscuro
function toggleDarkMode() {
    const themeIcon = document.getElementById('themeIcon');
    const themeIconMobile = document.getElementById('themeIconMobile');

    document.body.classList.toggle('dark-mode');

    if (document.body.classList.contains('dark-mode')) {
        themeIcon.className = 'fas fa-sun';
        themeIconMobile.className = 'fas fa-sun';
        localStorage.setItem('darkMode', 'enabled');
    } else {
        themeIcon.className = 'fas fa-moon';
        themeIconMobile.className = 'fas fa-moon';
        localStorage.setItem('darkMode', 'disabled');
    }
}