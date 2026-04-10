// @ts-check
'use strict';

/**
 * @fileoverview I18n engine — zero-dependency, lazy-loading, singleton.
 *
 * @typedef {'es' | 'en' | 'ja'} LocaleCode
 * @typedef {Record<string, unknown>} Dictionary
 */

// ── Constantes de módulo ───────────────────────────────────────────────────

/**
 * Regex de interpolación compilada UNA sola vez a nivel de módulo.
 *
 * Problema del MVP: la regex se compilaba en cada llamada a _interpolate(),
 * lo que para un translateDOM() sobre una página completa (cientos de nodos)
 * implicaba cientos de compilaciones de la misma expresión.
 *
 * Por qué es seguro usar un flag /g a nivel de módulo con String.replace():
 * String.prototype.replace() resetea internamente lastIndex antes de cada
 * invocación, por lo que no existe el estado compartido que causaría bugs
 * con RegExp.exec() en un loop. La regex puede reutilizarse sin problemas.
 */
const INTERPOLATION_RE = /\{\{(\w+)\}\}/g;

/**
 * URL base para la carga de locales, resuelta una sola vez.
 *
 * Por qué import.meta.env.BASE_URL en lugar de '/locales/':
 * En despliegues en subrutas (ej. https://user.github.io/repo/), la ruta
 * absoluta '/locales/es.json' resolvería contra la raíz del servidor
 * (https://user.github.io/locales/es.json), no contra la subruta del
 * proyecto. Vite inyecta import.meta.env.BASE_URL con el valor correcto
 * de la opción `base` del vite.config.js, y el fallback '/' cubre entornos
 * sin Vite (tests unitarios, previsualización estática).
 *
 * El .replace asegura que no haya doble slash si BASE_URL termina en '/'.
 */
const LOCALE_BASE_URL = (
  typeof import.meta !== 'undefined' && /** @type {any} */ (import.meta).env?.BASE_URL
    ? /** @type {any} */ (import.meta).env.BASE_URL
    : '/'
).replace(/\/$/, '');

export class I18nManager {
  constructor() {
    /** @type {LocaleCode} */
    this._locale = 'es';

    /** @type {LocaleCode} */
    this._fallbackLocale = 'es';

    /** @type {ReadonlyArray<LocaleCode>} */
    this._supportedLocales = /** @type {ReadonlyArray<LocaleCode>} */ (
      Object.freeze(['es', 'en', 'ja'])
    );

    /** @type {Map<LocaleCode, Dictionary>} */
    this._dictionaries = new Map();

    /**
     * Promesas en vuelo indexadas por locale.
     * Garantiza que llamadas concurrentes a loadLocale('en') compartan
     * un único fetch en lugar de disparar N peticiones redundantes.
     * @type {Map<LocaleCode, Promise<Dictionary>>}
     */
    this._loadingPromises = new Map();
  }

  /** @returns {I18nManager} */
  static getInstance() { return i18n; }

  // ─── Locale detection ──────────────────────────────────────────────────────

  /** @returns {LocaleCode} */
  detectLocale() {
    const stored = localStorage.getItem('i18n:locale');
    if (stored && this._supportedLocales.includes(/** @type {LocaleCode} */ (stored))) {
      return /** @type {LocaleCode} */ (stored);
    }

    const langs = navigator.languages?.length ? Array.from(navigator.languages) : [navigator.language];
    for (const lang of langs) {
      const base = /** @type {LocaleCode} */ (lang.split('-')[0].toLowerCase());
      if (this._supportedLocales.includes(base)) return base;
    }

    return this._fallbackLocale;
  }

  // ─── Dictionary loading ────────────────────────────────────────────────────

  /**
   * Carga y cachea el diccionario JSON para el locale dado.
   *
   * Cambios respecto al MVP:
   *   • URL construida con LOCALE_BASE_URL para soporte de subrutas.
   *   • cache: 'default' en lugar de 'force-cache'. 'force-cache' sirve
   *     el contenido cacheado incluso si el servidor indica stale, lo que
   *     puede causar que tras un deploy los usuarios reciban traducciones
   *     obsoletas. 'default' respeta las directivas Cache-Control del
   *     servidor y hace revalidación condicional (If-None-Match / ETag).
   *
   * @param {LocaleCode} locale
   * @returns {Promise<Dictionary>}
   */
  loadLocale(locale) {
    const cached = this._dictionaries.get(locale);
    if (cached) return Promise.resolve(cached);

    const inflight = this._loadingPromises.get(locale);
    if (inflight) return inflight;

    const url     = `${LOCALE_BASE_URL}/locales/${locale}.json`;
    const promise = fetch(url, {
      headers: { 'Accept': 'application/json' },
      cache:   'default',
    })
      .then(res => {
        if (!res.ok) throw new Error(`[i18n] HTTP ${res.status} — ${url}`);
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
          console.warn(`[i18n] Locale "${locale}" unavailable. Falling back to "${this._fallbackLocale}".`);
          return this.loadLocale(this._fallbackLocale);
        }

        const empty = /** @type {Dictionary} */ ({});
        this._dictionaries.set(locale, empty);
        return empty;
      });

    this._loadingPromises.set(locale, promise);
    return promise;
  }

  // ─── Initialisation ────────────────────────────────────────────────────────

  /** @returns {Promise<void>} */
  async init() {
    this._locale = this.detectLocale();
    await this.loadLocale(this._locale);
    document.documentElement.setAttribute('lang', this._locale);

    if (this._locale !== this._fallbackLocale) {
      this.loadLocale(this._fallbackLocale).catch(() => {});
    }
  }

  // ─── Locale switching ──────────────────────────────────────────────────────

  /**
   * @param {LocaleCode} locale
   * @returns {Promise<void>}
   */
  async setLocale(locale) {
    if (!this._supportedLocales.includes(locale)) {
      console.warn(`[i18n] setLocale("${locale}") rejected. Supported: ${this._supportedLocales.join(', ')}.`);
      return;
    }
    if (locale === this._locale) return;

    await this.loadLocale(locale);

    this._locale = locale;
    localStorage.setItem('i18n:locale', locale);
    document.documentElement.setAttribute('lang', locale);

    this.translateDOM(document.body);

    document.dispatchEvent(new CustomEvent('i18n:localeChanged', {
      bubbles: true, cancelable: false, detail: { locale },
    }));
  }

  /** @returns {LocaleCode} */
  getLocale() { return this._locale; }

  /** @returns {ReadonlyArray<LocaleCode>} */
  getSupportedLocales() { return this._supportedLocales; }

  // ─── Internal helpers ──────────────────────────────────────────────────────

  /**
   * @private
   * @param {Dictionary} obj
   * @param {string}     path
   * @returns {unknown}
   */
  _getNestedValue(obj, path) {
    return path.split('.').reduce(
      /** @param {unknown} acc @param {string} part @returns {unknown} */
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
   * Reemplaza tokens {{param}} usando INTERPOLATION_RE (module-level constant).
   *
   * @private
   * @param {string}                           str
   * @param {Record<string, string|number>=}   params
   * @returns {string}
   */
  _interpolate(str, params) {
    if (!params) return str;
    // String.replace con regex /g resetea lastIndex internamente antes de
    // cada invocación, por lo que reusar INTERPOLATION_RE es thread-safe
    // en el contexto single-threaded de JavaScript.
    return str.replace(INTERPOLATION_RE, (match, key) => {
      const val = params[key];
      return val !== undefined ? String(val) : match;
    });
  }

  // ─── Public translation API ────────────────────────────────────────────────

  /**
   * @param {string}                           key
   * @param {Record<string, string|number>=}   params
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
   * @param {Element | Document | DocumentFragment} context
   * @returns {void}
   */
  translateDOM(context) {
    const root =
      context instanceof Document
        ? context.documentElement
        : /** @type {Element} */ (context);

    if (!root) return;

    root.querySelectorAll('[data-i18n]').forEach(el => {
      const key = /** @type {HTMLElement} */ (el).dataset['i18n'];
      if (key) el.textContent = this.t(key);
    });

    root.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = /** @type {HTMLElement} */ (el).dataset['i18nHtml'];
      if (key) el.innerHTML = this.t(key);
    });

    root.querySelectorAll('[data-i18n-attr]').forEach(el => {
      const raw = /** @type {HTMLElement} */ (el).dataset['i18nAttr'];
      if (!raw) return;
      try {
        const map = /** @type {Record<string, string>} */ (JSON.parse(raw));
        Object.entries(map).forEach(([attr, key]) => el.setAttribute(attr, this.t(key)));
      } catch {
        console.warn('[i18n] Malformed data-i18n-attr JSON on element:', el);
      }
    });

    root.querySelectorAll('[data-i18n-lang]').forEach(el => {
      /** @type {HTMLElement} */ (el).lang = this._locale;
    });
  }
}

/** @type {I18nManager} */
export const i18n = new I18nManager();