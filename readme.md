<div align="center">
  <h1>Alaska Elaina Gonzalez — Portafolio Profesional</h1>
  <p><strong>Custom Single Page Application (SPA), Modular Architecture & Vite Pipeline</strong></p>

  <img src="https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black" alt="JavaScript">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white" alt="HTML5">
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white" alt="CSS3">
  <img src="https://img.shields.io/badge/GitHub_Actions-2088FF?style=flat-square&logo=github-actions&logoColor=white" alt="GitHub Actions">
</div>

---

Este repositorio contiene el código fuente de mi portafolio profesional. Lejos de utilizar un framework pesado (como React o Vue) para una web de contenido estático, el proyecto está construido desde cero como una Single Page Application (SPA) utilizando Vanilla JavaScript, Módulos ES (ESM) estandarizados y Vite como empaquetador y servidor de desarrollo.

## <img src="https://api.iconify.design/material-symbols/lightbulb.svg?color=%23007acc" width="24" height="24" align="center"> Arquitectura y Filosofía

Construir este portafolio fue un ejercicio deliberado de ingeniería frontend enfocado en rendimiento, modularidad y control total sobre el DOM. Las decisiones técnicas clave incluyen:

* **Enrutamiento Custom (Vanilla SPA):** Un motor de enrutamiento propio (`router.js`) que intercepta el historial del navegador (`popstate`), inyecta vistas dinámicamente y expone *hooks* de ciclo de vida (`beforeNavigate`, `afterNavigate`).
* **Code-Splitting y Lazy Loading:** Los controladores de las vistas (Inicio, Experiencia, Juego) no se empaquetan en un solo bloque. Vite los divide y el router los invoca asíncronamente mediante `import()` dinámico solo cuando el usuario accede a la ruta.
* **Gestión Estricta de Memoria (Teardown):** Para evitar fugas de memoria (*memory leaks*) típicas en SPAs nativas, cada controlador implementa un método `unmount()` que limpia temporizadores (terminal interactiva) y destruye instancias (motor del minijuego) al cambiar de página.
* **Delegación de Eventos Centralizada:** Un `eventDispatcher.js` captura eventos delegados a nivel global. Esto desvincula la lógica del DOM y hace al sistema resistente a la destrucción y recreación constante de nodos HTML durante la navegación.

---

## <img src="https://api.iconify.design/material-symbols/layers-outline.svg?color=%23007acc" width="24" height="24" align="center"> Componentes Core

* **Terminal Interactiva:** Un emulador de terminal web (construido sin librerías de terceros) que incluye un sistema de archivos simulado, parseo de comandos personalizados, ping asíncrono y sistema de maximización/arrastre de ventana.
* **Motor de Prefetching Predictivo:** Utiliza la API `IntersectionObserver` y eventos `mouseover` para pre-cargar en una caché nativa (`Map`) el código HTML de las rutas antes de que el usuario haga clic, garantizando transiciones de vista en 0ms.
* **Quantum Cat Invaders:** Un *easter egg* que despliega un minijuego completo renderizado en `<canvas>`. Utiliza un bucle de animación iterativo (`requestAnimationFrame`), gestión de colisiones por bounding box y entidades orientadas a objetos.