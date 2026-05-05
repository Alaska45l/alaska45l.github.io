<div align="center">
  <h1>Alaska Elaina Gonzalez — Professional Portfolio</h1>
  <p><strong>Custom Single Page Application (SPA), Modular Architecture & Vite Pipeline</strong></p>

  <img src="https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black" alt="JavaScript">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white" alt="HTML5">
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white" alt="CSS3">
  <img src="https://img.shields.io/badge/GitHub_Actions-2088FF?style=flat-square&logo=github-actions&logoColor=white" alt="GitHub Actions">
</div>

---

This repository contains the source code for my professional portfolio. Instead of using a heavy framework (like React or Vue) for a static content website, the project is built from scratch as a Single Page Application (SPA) using Vanilla JavaScript, standardized ES Modules (ESM), and Vite as a bundler and development server.

## <img src="https://api.iconify.design/material-symbols/lightbulb.svg?color=%23007acc" width="24" height="24" align="center"> Architecture and Philosophy

Building this portfolio was a deliberate frontend engineering exercise focused on performance, modularity, and total control over the DOM. Key technical decisions include:

* **Custom Routing (Vanilla SPA):** A custom routing engine (`router.js`) that intercepts browser history (`popstate`), injects views dynamically, and exposes lifecycle *hooks* (`beforeNavigate`, `afterNavigate`).
* **Code-Splitting and Lazy Loading:** View controllers (Home, Experience, Game) are not bundled into a single block. Vite splits them, and the router invokes them asynchronously via dynamic `import()` only when the user accesses the route.
* **Strict Memory Management (Teardown):** To avoid memory leaks typical in native SPAs, each controller implements an `unmount()` method that clears timers (interactive terminal) and destroys instances (minigame engine) upon page change.
* **Centralized Event Delegation:** An `eventDispatcher.js` captures global delegated events. This decouples DOM logic and makes the system resilient to the constant destruction and recreation of HTML nodes during navigation.

---

## <img src="https://api.iconify.design/material-symbols/layers-outline.svg?color=%23007acc" width="24" height="24" align="center"> Core Components

* **Interactive Terminal:** A web terminal emulator (built without third-party libraries) that includes a simulated file system, custom command parsing, asynchronous ping, and a window maximization/drag system.
* **Predictive Prefetching Engine:** Uses the `IntersectionObserver` API and `mouseover` events to pre-load the HTML code of routes into a native cache (`Map`) before the user clicks, guaranteeing 0ms view transitions.
* **Quantum Cat Invaders:** An *easter egg* that deploys a complete minigame rendered in `<canvas>`. It uses an iterative animation loop (`requestAnimationFrame`), bounding box collision management, and object-oriented entities.