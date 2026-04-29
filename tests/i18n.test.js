// @ts-check
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { I18nManager } from '../src/js/i18n.js';

class MockStorage {
  constructor() { this._data = new Map(); }
  getItem(k) { return this._data.get(k) ?? null; }
  setItem(k, v) { this._data.set(k, String(v)); }
  removeItem(k) { this._data.delete(k); }
  clear() { this._data.clear(); }
}

describe('I18nManager', () => {
  let i18n;
  let originalStorage;

  beforeEach(() => {
    originalStorage = globalThis.localStorage;
    globalThis.localStorage = new MockStorage();
    i18n = new I18nManager();
    // Seed a minimal dictionary directly to avoid fetch
    i18n._dictionaries.set('es', { greeting: 'Hola', nested: { key: 'valor' } });
    i18n._dictionaries.set('en', { greeting: 'Hello', nested: { key: 'value' }, onlyEn: 'English only' });
  });

  afterEach(() => {
    globalThis.localStorage = originalStorage;
  });

  describe('t()', () => {
    it('returns the active locale translation when key exists', () => {
      i18n._locale = 'es';
      expect(i18n.t('greeting')).toBe('Hola');
    });

    it('falls back to fallback locale when key is missing in active locale', () => {
      i18n._locale = 'es';
      i18n._fallbackLocale = 'en';
      expect(i18n.t('onlyEn')).toBe('English only');
    });

    it('returns the key itself when neither locale has the key', () => {
      i18n._locale = 'es';
      expect(i18n.t('missing.key')).toBe('missing.key');
    });

    it('interpolates {{params}} correctly', () => {
      i18n._locale = 'es';
      i18n._dictionaries.set('es', { welcome: 'Bienvenido, {{name}}' });
      expect(i18n.t('welcome', { name: 'Alaska' })).toBe('Bienvenido, Alaska');
    });

    it('leaves unmatched interpolation tokens intact', () => {
      i18n._locale = 'es';
      i18n._dictionaries.set('es', { welcome: 'Hola, {{name}}' });
      expect(i18n.t('welcome')).toBe('Hola, {{name}}');
    });
  });

  describe('detectLocale', () => {
    it('respects localStorage preference when valid', () => {
      localStorage.setItem('i18n:locale', 'en');
      expect(i18n.detectLocale()).toBe('en');
    });

    it('ignores invalid localStorage value and falls back to navigator', () => {
      localStorage.setItem('i18n:locale', 'fr');
      Object.defineProperty(navigator, 'languages', {
        writable: true,
        value: ['en-US', 'en'],
      });
      expect(i18n.detectLocale()).toBe('en');
    });

    it('falls back to default when nothing matches', () => {
      localStorage.clear();
      Object.defineProperty(navigator, 'languages', {
        writable: true,
        value: ['fr-FR'],
      });
      expect(i18n.detectLocale()).toBe('es');
    });
  });
});
