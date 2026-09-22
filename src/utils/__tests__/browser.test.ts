import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isTauri, openExternalUrl, copyToClipboard } from '../browser';

describe('browser utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as any).__TAURI__;
    delete (window as any).__TAURI_INTERNALS__;
    delete (window as any).__TAURI_METADATA__;
  });

  describe('isTauri', () => {
    it('deve retornar false quando não estiver em ambiente Tauri', () => {
      expect(isTauri()).toBe(false);
    });

    it('deve retornar true quando flags globais do Tauri existirem', () => {
      (window as any).__TAURI__ = {};
      expect(isTauri()).toBe(true);
    });
  });

  describe('openExternalUrl', () => {
    it('deve retornar false se a URL for vazia', async () => {
      const res = await openExternalUrl('');
      expect(res).toBe(false);
    });

    it('deve abrir URL via elemento âncora no navegador comum', async () => {
      const clickSpy = vi.fn();
      const origCreateElement = document.createElement.bind(document);

      vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
        const el = origCreateElement(tagName);
        if (tagName === 'a') {
          el.click = clickSpy;
        }
        return el;
      });

      const res = await openExternalUrl('https://google.com');
      expect(res).toBe(true);
      expect(clickSpy).toHaveBeenCalled();
    });
  });

  describe('copyToClipboard', () => {
    it('deve copiar texto usando navigator.clipboard quando disponível e contexto seguro', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextMock },
        configurable: true,
      });

      const res = await copyToClipboard('texto de teste');
      expect(res).toBe(true);
      expect(writeTextMock).toHaveBeenCalledWith('texto de teste');
    });

    it('deve utilizar fallback com textarea e document.execCommand se navigator.clipboard falhar', async () => {
      Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true });
      document.execCommand = vi.fn().mockReturnValue(true);

      const res = await copyToClipboard('fallback copy');
      expect(res).toBe(true);
      expect(document.execCommand).toHaveBeenCalledWith('copy');
    });
  });
});
