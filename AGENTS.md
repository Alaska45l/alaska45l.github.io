# AGENTS.md — alaska-portfolio

Compact reference for OpenCode sessions. Omitting anything discoverable from filenames or generic Vite defaults.

## Build & Verify

- `npm run build` — only verification step; no test suite exists.
- `npm run dev` — Vite dev server; root is `src/`.
- `npm run preview` — serves `dist/` locally.

## Vite Path Quirks

- **Root**: `src/` (`root: 'src'` in `vite.config.js`).
- **Entry HTML**: `src/index.html` (not at repo root).
- **Public assets**: `public/` mapped via `publicDir: '../public'`.
- **Build output**: `dist/` mapped via `outDir: '../dist'`.
- **Path aliases** (`tsconfig.json`):
  - `/js/*` → `src/js/*`
  - `/css/*` → `src/css/*`
- CSS is loaded via explicit `<link>` tags in `index.html` (no CSS bundling import in JS).

## TypeScript = JSDoc Check Only

- `tsconfig.json`: `"checkJs": true`, `"noEmit": true`.
- There are **zero `.ts` files**; types live in JSDoc comments and `global.d.ts`.
- Running `tsc --noEmit` manually works if you want a quick type check.

## Adding a New Route

1. **Register route** in `src/js/main.js` inside `router.registerRoutes([...])`.
2. **Create HTML fragment** at `public/pages/<page>.html`.
3. **If interactive**, create a controller at `src/js/controllers/<page>Controller.js` exporting `mount()` that returns `{ unmount() }`.
4. **Add i18n keys** to both `public/locales/es.json` and `public/locales/en.json`.
5. **Add meta tag mapping** in `src/js/router.js` → `updateMetaTags()` `prefixMap`.

## Controller Lifecycle (Critical for Memory)

- `mount()` runs after HTML is injected into `#app`.
- It **must return `{ unmount() }`** if it attaches listeners, starts timers, or instantiates objects (terminal, game, carousel).
- The router calls `unmount()` before swapping the next page to prevent leaks.
- Static pages (no JS behaviour) omit the `controller` property entirely.

## i18n

- Engine is `I18nManager` in `src/js/i18n.js`; zero dependencies.
- Supported locales: `es`, `en`, `ja`. `ja` is declared but **has no `public/locales/ja.json` yet** — runtime falls back to Spanish.
- All user-facing strings live in `public/locales/es.json` and `public/locales/en.json`. Keep them in sync.
- Translation attributes in HTML: `data-i18n`, `data-i18n-html`, `data-i18n-attr`, `data-i18n-lang`.

## Global Window Functions

- Inline `onclick` handlers in HTML rely on globals declared in `global.d.ts` (e.g. `window.toggleDarkMode`, `window.navigateTo`).
- If you add a new inline handler, update `global.d.ts` and attach the function to `window` in the relevant module.

## Event Dispatcher

- `src/js/eventDispatcher.js` handles delegated clicks for `data-router-link` and global interactions.
- Anchor tags meant for SPA navigation **must include `data-router-link`** or they will trigger full page reloads.

## Deploy

- GitHub Actions workflow (`.github/workflows/deploy.yml`) builds and deploys `dist/` to GitHub Pages on every push to `main`.
- `.nojekyll` at repo root prevents Jekyll processing.

## Assets

- Static assets (images, favicons, fonts) go in `public/`; Vite copies them to `dist/` as-is.
- Do not place large binaries under version control.
