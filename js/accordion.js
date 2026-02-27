function copyToClipboard(btn, text) {
  navigator.clipboard.writeText(text).then(() => {
    const icon = btn.querySelector('i');
    btn.classList.add('copied');
    icon.className = 'fas fa-check';
    setTimeout(() => {
      btn.classList.remove('copied');
      icon.className = 'fas fa-copy';
    }, 2000);
  });
}

function toggleAccordion(trigger) {
  const body = trigger.nextElementSibling;
  const icon = trigger.querySelector('.accordion-icon');
  const isOpen = body.classList.contains('open');

  // Cerrar todos los ítems abiertos
  document.querySelectorAll('.accordion-body.open').forEach(b => {
    b.classList.remove('open');
    b.previousElementSibling.querySelector('.accordion-icon').classList.remove('rotated');
  });

  // Si el ítem clickeado estaba cerrado, abrirlo
  if (!isOpen) {
    body.classList.add('open');
    icon.classList.add('rotated');
  }
}