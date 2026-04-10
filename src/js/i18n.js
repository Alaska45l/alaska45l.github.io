// @ts-check
'use strict';

/**
 * @fileoverview I18n engine — zero-dependency, lazy-loading, singleton.
 *
 * Locale resolution precedence:
 *   1. localStorage key 'i18n:locale'
 *   2. navigator.languages (first base-language match against supportedLocales)
 *   3. Fallback locale ('es')
 *
 * DOM annotation protocol:
 *   data-i18n="dot.separated.key"           → el.textContent = t(key)
 *   data-i18n-html="dot.separated.key"      → el.innerHTML   = t(key)
 *                                              (trusted strings from /locales/*.json ONLY)
 *   data-i18n-attr='{"attr":"key",...}'      → el.setAttribute(attr, t(key)) for each pair
 *   data-i18n-lang                           → el.lang = currentLocale
 *
 * Interpolation syntax: {{paramName}} anywhere inside a translation string.
 *
 * Custom Events dispatched on document:
 *   'i18n:localeChanged'  →  CustomEvent<{ locale: LocaleCode }>
 *
 * Structural notes:
 *   - The module is an ES-module singleton: ES module caching guarantees one
 *     instance of `i18n` regardless of how many times this module is imported.
 *   - I18nManager.getInstance() is provided for compatibility with class-oriented
 *     consumers; it always returns the same module-level `i18n` object.
 *   - The 'ja' locale is registered as a supported locale but no dictionary is
 *     shipped in this release. loadLocale('ja') will silently fall back to 'es'.
 *
 * @typedef {'es' | 'en' | 'ja'} LocaleCode
 * @typedef {Record<string, unknown>} Dictionary
 */

export class I18nManager {
  constructor() {
    /**
     * Currently active locale.
     * @type {LocaleCode}
     */
    this._locale = 'es';

    /**
     * Locale used as the last-resort fallback when a key is absent from the
     * active dictionary.
     * @type {LocaleCode}
     */
    this._fallbackLocale = 'es';

    /**
     * Ordered list of locales the engine will accept. Any locale absent from
     * this list is rejected by setLocale() and detectLocale().
     * @type {ReadonlyArray<LocaleCode>}
     */
    this._supportedLocales = /** @type {ReadonlyArray<LocaleCode>} */ (
      Object.freeze(['es', 'en', 'ja'])
    );

    /**
     * In-memory cache of loaded dictionaries keyed by locale code.
     * @type {Map<LocaleCode, Dictionary>}
     */
    this._dictionaries = new Map();

    /**
     * In-flight fetch promises, deduplicated per locale so that concurrent
     * loadLocale() calls for the same locale share a single network request.
     * @type {Map<LocaleCode, Promise<Dictionary>>}
     */
    this._loadingPromises = new Map();
  }

  // ─── Static factory ────────────────────────────────────────────────────────

  /**
   * Returns the module-level singleton. Prefer importing the `i18n` named
   * export directly; this method exists for compatibility with class-oriented
   * consumers that call getInstance().
   * @returns {I18nManager}
   */
  static getInstance() {
    return i18n;
  }

  // ─── Locale detection ──────────────────────────────────────────────────────

  /**
   * Detects the preferred locale using the following priority chain:
   *   1. The value stored in localStorage under 'i18n:locale' (persisted choice).
   *   2. The first entry in navigator.languages whose base language tag matches
   *      a supported locale (e.g. 'en-US' matches 'en').
   *   3. The configured fallback locale.
   * @returns {LocaleCode}
   */
  detectLocale() {
    const stored = localStorage.getItem('i18n:locale');
    if (stored && this._supportedLocales.includes(/** @type {LocaleCode} */ (stored))) {
      return /** @type {LocaleCode} */ (stored);
    }

    /** @type {string[]} */
    const langs = [];
    if (navigator.languages && navigator.languages.length) {
      langs.push(...Array.from(navigator.languages));
    } else if (navigator.language) {
      langs.push(navigator.language);
    }

    for (const lang of langs) {
      const base = /** @type {LocaleCode} */ (lang.split('-')[0].toLowerCase());
      if (this._supportedLocales.includes(base)) {
        return base;
      }
    }

    return this._fallbackLocale;
  }

  // ─── Dictionary loading ────────────────────────────────────────────────────

  /**
   * Fetches and caches the JSON dictionary for the given locale.
   * Concurrent calls for the same locale share a single in-flight Promise;
   * the resolved dictionary is stored in _dictionaries and subsequent calls
   * return it synchronously via Promise.resolve().
   *
   * On network/parse failure the engine falls back to the fallback locale.
   * If the fallback locale itself fails an empty dictionary is stored so that
   * t() degrades gracefully (returns the raw key).
   *
   * @param {LocaleCode} locale
   * @returns {Promise<Dictionary>}
   */
  loadLocale(locale) {
    const cached = this._dictionaries.get(locale);
    if (cached) return Promise.resolve(cached);

    const inflight = this._loadingPromises.get(locale);
    if (inflight) return inflight;

    const promise = fetch(`/locales/${locale}.json`, {
      headers: { 'Accept': 'application/json' },
      cache:   'force-cache',
    })
      .then(res => {
        if (!res.ok) {
          throw new Error(
            `[i18n] Failed to load locale "${locale}": HTTP ${res.status} ${res.statusText}`
          );
        }
        return /** @type {Promise<Dictionary>} */ (res.json());
      })
      .then(dict => {
        this._dictionaries.set(locale, dict);
        this._loadingPromises.delete(locale);
        return dict;
      })
      .catch(err => {
        this._loadingPromises.delete(locale);
        console.error(err);

        if (locale !== this._fallbackLocale) {
          console.warn(
            `[i18n] Locale "${locale}" unavailable. Falling back to "${this._fallbackLocale}".`
          );
          return this.loadLocale(this._fallbackLocale);
        }

        // Fallback locale itself failed — store an empty dictionary so the
        // engine continues to operate (t() will return raw keys).
        const empty = /** @type {Dictionary} */ ({});
        this._dictionaries.set(locale, empty);
        return empty;
      });

    this._loadingPromises.set(locale, promise);
    return promise;
  }

  // ─── Initialisation ────────────────────────────────────────────────────────

  /**
   * Bootstraps the engine: detects the preferred locale, loads its dictionary,
   * sets document.documentElement.lang, and eagerly pre-fetches the fallback
   * locale in the background.
   *
   * MUST be awaited before mounting the router or rendering any SPA view.
   * main.js wraps the entire bootstrap sequence in an async IIFE that awaits
   * this method before instantiating SPARouter.
   *
   * @returns {Promise<void>}
   */
  async init() {
    this._locale = this.detectLocale();
    await this.loadLocale(this._locale);
    document.documentElement.setAttribute('lang', this._locale);

    // Pre-fetch the fallback dictionary so it is available instantly if a key
    // is missing from the active locale. Errors are swallowed intentionally.
    if (this._locale !== this._fallbackLocale) {
      this.loadLocale(this._fallbackLocale).catch(() => {});
    }
  }

  // ─── Locale switching ──────────────────────────────────────────────────────

  /**
   * Switches the active locale at runtime:
   *   1. Validates the requested locale against _supportedLocales.
   *   2. Loads (or retrieves from cache) the target dictionary.
   *   3. Updates _locale, localStorage and document.documentElement.lang.
   *   4. Retranslates document.body via translateDOM().
   *   5. Dispatches 'i18n:localeChanged' on document so that consumers
   *      (e.g. the router's updateMetaTags) can react.
   *
   * The <head> meta tags are NOT updated here; the 'i18n:localeChanged'
   * listener in main.js calls router.updateMetaTags(currentRoute) for that.
   *
   * @param {LocaleCode} locale
   * @returns {Promise<void>}
   */
  async setLocale(locale) {
    if (!this._supportedLocales.includes(locale)) {
      console.warn(
        `[i18n] setLocale("${locale}") rejected. ` +
        `Supported locales: ${this._supportedLocales.join(', ')}.`
      );
      return;
    }
    if (locale === this._locale) return;

    await this.loadLocale(locale);

    this._locale = locale;
    localStorage.setItem('i18n:locale', locale);
    document.documentElement.setAttribute('lang', locale);

    this.translateDOM(document.body);

    document.dispatchEvent(
      new CustomEvent('i18n:localeChanged', {
        bubbles:    true,
        cancelable: false,
        detail:     { locale },
      })
    );
  }

  // ─── Accessors ─────────────────────────────────────────────────────────────

  /**
   * Returns the currently active locale code.
   * @returns {LocaleCode}
   */
  getLocale() {
    return this._locale;
  }

  /**
   * Returns the immutable ordered list of supported locale codes.
   * @returns {ReadonlyArray<LocaleCode>}
   */
  getSupportedLocales() {
    return this._supportedLocales;
  }

  // ─── Internal helpers ──────────────────────────────────────────────────────

  /**
   * Resolves a dot-separated key path against a nested Dictionary object.
   * Returns undefined when any path segment is missing or the traversal hits
   * a non-object value before the path is exhausted.
   *
   * @private
   * @param {Dictionary} obj
   * @param {string}     path  e.g. "home.hero.avatar_alt"
   * @returns {unknown}
   */
  _getNestedValue(obj, path) {
    return path.split('.').reduce(
      /**
       * @param {unknown} acc
       * @param {string}  part
       * @returns {unknown}
       */
      (acc, part) => {
        if (acc !== null && typeof acc === 'object') {
          return (/** @type {Dictionary} */ (acc))[part];
        }
        return undefined;
      },
      /** @type {unknown} */ (obj)
    );
  }

  /**
   * Replaces every {{paramName}} token in str with the corresponding value
   * from params. Tokens with no matching param key are left verbatim.
   *
   * @private
   * @param {string}                            str
   * @param {Record<string, string | number>=}  params
   * @returns {string}
   */
  _interpolate(str, params) {
    if (!params) return str;
    return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const val = params[key];
      return val !== undefined ? String(val) : match;
    });
  }

  // ─── Public translation API ────────────────────────────────────────────────

  /**
   * Looks up a translation for the given key with a two-tier fallback chain:
   *   active locale dictionary → fallback locale dictionary → raw key string.
   *
   * Supports {{param}} interpolation via the optional params argument.
   *
   * @param {string}                            key     Dot-separated path.
   * @param {Record<string, string | number>=}  params  Optional interpolation values.
   * @returns {string}
   */
  t(key, params) {
    const active   = this._dictionaries.get(this._locale)         ?? {};
    const fallback = this._dictionaries.get(this._fallbackLocale) ?? {};

    const activeVal   = this._getNestedValue(active,   key);
    const fallbackVal = this._getNestedValue(fallback, key);

    const raw =
      typeof activeVal   === 'string' ? activeVal   :
      typeof fallbackVal === 'string' ? fallbackVal :
      key;

    return this._interpolate(raw, params);
  }

  // ─── DOM translation ───────────────────────────────────────────────────────

  /**
   * Traverses the given DOM context and applies translations to all annotated
   * elements. Handles four annotation types:
   *
   *   [data-i18n="key"]
   *     Sets element.textContent to t(key).
   *     Use for all plain-text content.
   *
   *   [data-i18n-html="key"]
   *     Sets element.innerHTML to t(key).
   *     Use ONLY for trusted translation strings that intentionally contain
   *     inline HTML (e.g. <code>, <strong>, <em>). Never expose user-supplied
   *     content through this path.
   *
   *   [data-i18n-attr='{"aria-label":"key","placeholder":"key2"}']
   *     For each key–value pair in the JSON object, sets the named attribute
   *     to t(value). Supports any attribute: aria-label, placeholder, title,
   *     alt, content, etc.
   *
   *   [data-i18n-lang]
   *     Sets element.lang to the current active locale code.
   *     Use on <article lang="es"> elements in report pages.
   *
   * @param {Element | Document | DocumentFragment} context
   * @returns {void}
   */
  translateDOM(context) {
    const root =
      context instanceof Document
        ? context.documentElement
        : /** @type {Element} */ (context);

    if (!root) return;

    // ── Plain text content ────────────────────────────────────────────────
    root.querySelectorAll('[data-i18n]').forEach(el => {
      const key = /** @type {HTMLElement} */ (el).dataset['i18n'];
      if (key) el.textContent = this.t(key);
    });

    // ── HTML content (trusted strings only) ───────────────────────────────
    root.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = /** @type {HTMLElement} */ (el).dataset['i18nHtml'];
      if (key) el.innerHTML = this.t(key);
    });

    // ── Named attributes ──────────────────────────────────────────────────
    root.querySelectorAll('[data-i18n-attr]').forEach(el => {
      const raw = /** @type {HTMLElement} */ (el).dataset['i18nAttr'];
      if (!raw) return;
      try {
        const map = /** @type {Record<string, string>} */ (JSON.parse(raw));
        Object.entries(map).forEach(([attr, key]) => {
          el.setAttribute(attr, this.t(key));
        });
      } catch {
        console.warn('[i18n] Malformed data-i18n-attr JSON on element:', el);
      }
    });

    // ── lang attribute propagation ────────────────────────────────────────
    root.querySelectorAll('[data-i18n-lang]').forEach(el => {
      /** @type {HTMLElement} */ (el).lang = this._locale;
    });
  }
}

/**
 * Application-wide I18nManager singleton.
 *
 * ES module evaluation is guaranteed to run exactly once per module specifier
 * within a browsing context; this `const` is therefore a true singleton across
 * all imports in the application bundle.
 *
 * Usage:
 *   import { i18n } from './i18n.js';
 *   await i18n.init();           // in main.js bootstrap, awaited before router
 *   i18n.t('nav.logo');          // → '@alaska45l'
 *   i18n.setLocale('en');        // switches locale at runtime
 *   i18n.translateDOM(element);  // retranslates a subtree
 *
 * @type {I18nManager}
 */
export const i18n = new I18nManager();