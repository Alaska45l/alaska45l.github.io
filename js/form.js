// Form functionality

// Validación de formulario
function validateForm(formId) {
    const form = document.getElementById(formId);
    const inputs = form.querySelectorAll('input[required], textarea[required]');
    let isValid = true;

    inputs.forEach(input => {
        if (!input.value.trim()) {
            input.classList.add('error');
            isValid = false;
        } else {
            input.classList.remove('error');
        }
    });

    return isValid;
}

// manejo de envío de formulario
function handleFormSubmit(event, formId) {
    event.preventDefault();

    if (!validateForm(formId)) return;

    const form = document.getElementById(formId);
    const formData = new FormData(form);
    const submitBtn = form.querySelector('button[type="submit"]');

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

    fetch(form.action, {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' }
    })
    .then(response => {
        if (response.ok) {
            form.reset();
            submitBtn.innerHTML = '<i class="fas fa-check"></i> ¡Mensaje enviado!';
            submitBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';

            setTimeout(() => {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar mensaje';
                submitBtn.style.background = '';
            }, 4000);
        } else {
            return response.json().then(data => {
                throw new Error(data?.error || 'Error del servidor');
            });
        }
    })
    .catch(error => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-exclamation-circle"></i> Error al enviar';
        submitBtn.style.background = 'linear-gradient(135deg, #e53e3e, #c53030)';

        console.error('Error al enviar formulario:', error);

        setTimeout(() => {
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar mensaje';
            submitBtn.style.background = '';
        }, 4000);
    });
}

// Limpiar errores al escribir en los campos
document.addEventListener('input', function(event) {
    if (event.target.classList.contains('error')) {
        event.target.classList.remove('error');
    }
});