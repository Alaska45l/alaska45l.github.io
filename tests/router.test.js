// @ts-check
import { describe, it, expect, beforeEach } from 'vitest';
import { SPARouter } from '../src/js/router.js';

describe('SPARouter', () => {
  let router;

  beforeEach(() => {
    router = new SPARouter();
    router.registerRoutes([
      { path: '/', htmlFile: '/pages/home.html' },
      { path: '/proyectos/jobbot', htmlFile: '/pages/jobbot.html' },
    ]);
  });

  describe('normalizeRoute', () => {
    it('returns "/" for home aliases', () => {
      expect(router.normalizeRoute('/')).toBe('/');
      expect(router.normalizeRoute('')).toBe('/');
      expect(router.normalizeRoute('/index.html')).toBe('/');
      expect(router.normalizeRoute('/home')).toBe('/');
    });

    it('returns known route paths unchanged', () => {
      expect(router.normalizeRoute('/proyectos/jobbot')).toBe('/proyectos/jobbot');
    });

    it('returns "/" for unknown routes (fallback)', () => {
      expect(router.normalizeRoute('/unknown')).toBe('/');
    });

    it('strips trailing slashes', () => {
      expect(router.normalizeRoute('/proyectos/jobbot/')).toBe('/proyectos/jobbot');
    });
  });

  describe('handleRedirect', () => {
    it('processes redirect query param and returns true', () => {
      const originalReplaceState = window.history.replaceState;
      let called = false;
      window.history.replaceState = (_state, _title, url) => {
        called = true;
        expect(url).toContain('/proyectos/jobbot');
      };

      // Set a fake location.search
      const originalSearch = window.location.search;
      Object.defineProperty(window.location, 'search', {
        writable: true,
        value: '?redirect=%2Fproyectos%2Fjobbot',
      });

      const result = router.handleRedirect();
      expect(result).toBe(true);
      expect(called).toBe(true);

      window.history.replaceState = originalReplaceState;
      window.location.search = originalSearch;
    });

    it('returns false when no redirect param is present', () => {
      const originalSearch = window.location.search;
      Object.defineProperty(window.location, 'search', {
        writable: true,
        value: '',
      });

      const result = router.handleRedirect();
      expect(result).toBe(false);

      window.location.search = originalSearch;
    });
  });

  describe('prefetch', () => {
    it('does not duplicate fetches for the same path', () => {
      const fetchSpy = globalThis.fetch = async () => new Response('hello');
      let fetchCount = 0;
      globalThis.fetch = async (url) => {
        fetchCount++;
        return new Response('hello');
      };

      router.prefetch('/');
      router.prefetch('/');
      router.prefetch('/');

      expect(fetchCount).toBe(1);

      globalThis.fetch = fetchSpy;
    });
  });
});
