// Mobile menu functionality
function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    menu.classList.toggle('active');
}

function closeMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    menu.classList.remove('active');
}

// Close mobile menu when clicking outside
document.addEventListener('click', function(event) {
    const menu = document.getElementById('mobileMenu');
    const menuBtn = document.querySelector('.mobile-menu-btn');

    if (!menu.contains(event.target) && !menuBtn.contains(event.target)) {
        menu.classList.remove('active');
    }
});

// Contact form handler
function handleContactForm(event) {
    event.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const message = document.getElementById('message').value;

    alert(`Mensaje enviado:\nNombre: ${name}\nEmail: ${email}\nMensaje: ${message}`);
    document.querySelector('.contact-form').reset();
}

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