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
    
    if (validateForm(formId)) {
        // Aquí iría la lógica de envío del formulario
        console.log('Formulario válido, enviando...');
        // Ejemplo: enviar datos por fetch API
    } else {
        console.log('Formulario inválido');
    }
}

// Limpiar errores al escribir en los campos
document.addEventListener('input', function(event) {
    if (event.target.classList.contains('error')) {
        event.target.classList.remove('error');
    }
});