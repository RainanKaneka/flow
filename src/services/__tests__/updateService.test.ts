import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isNewerVersion,
  checkForUpdates,
  CURRENT_APP_VERSION,
  GITHUB_REPO,
} from '../updateService';

describe('updateService', () => {
  describe('isNewerVersion', () => {
    it('deve identificar corretamente versões mais recentes', () => {
      expect(isNewerVersion('0.2.1', '0.2.0')).toBe(true);
      expect(isNewerVersion('0.3.0', '0.2.0')).toBe(true);
      expect(isNewerVersion('1.0.0', '0.2.0')).toBe(true);
      expect(isNewerVersion('0.2.0.1', '0.2.0')).toBe(true);
    });

    it('deve retornar false quando a versão for igual ou anterior', () => {
      expect(isNewerVersion('0.2.0', '0.2.0')).toBe(false);
      expect(isNewerVersion('0.1.6', '0.2.0')).toBe(false);
      expect(isNewerVersion('0.0.9', '0.2.0')).toBe(false);
    });

    it('deve normalizar prefixo "v" em versões', () => {
      expect(isNewerVersion('v0.2.1', '0.2.0')).toBe(true);
      expect(isNewerVersion('v0.2.1', 'v0.2.0')).toBe(true);
      expect(isNewerVersion('0.2.0', 'v0.2.0')).toBe(false);
    });
  });

  describe('checkForUpdates', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      globalThis.fetch = vi.fn();
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('deve retornar informações de atualização quando houver nova versão com asset .exe', async () => {
      const mockRelease = {
        tag_name: 'v0.4.0',
        name: 'Flow v0.4.0 - Grande Lançamento',
        body: 'Notas de atualização da v0.4.0',
        published_at: '2026-09-22T12:00:00Z',
        html_url: `https://github.com/${GITHUB_REPO}/releases/tag/v0.4.0`,
        assets: [
          {
            name: 'flow-installer.exe',
            browser_download_url: 'https://github.com/releases/flow-installer.exe',
          },
        ],
      };

      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockRelease,
      });

      const update = await checkForUpdates();

      expect(update).not.toBeNull();
      expect(update?.hasUpdate).toBe(true);
      expect(update?.currentVersion).toBe(CURRENT_APP_VERSION);
      expect(update?.latestVersion).toBe('0.4.0');
      expect(update?.releaseName).toBe('Flow v0.4.0 - Grande Lançamento');
      expect(update?.downloadUrl).toBe('https://github.com/releases/flow-installer.exe');
    });

    it('deve retornar hasUpdate: false quando a versão mais recente for a mesma ou anterior', async () => {
      const mockRelease = {
        tag_name: `v${CURRENT_APP_VERSION}`,
        name: `Flow v${CURRENT_APP_VERSION}`,
        body: 'Sem novas mudanças',
        published_at: '2026-09-22T10:00:00Z',
        html_url: 'https://github.com/release',
        assets: [],
      };

      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockRelease,
      });

      const update = await checkForUpdates();

      expect(update).not.toBeNull();
      expect(update?.hasUpdate).toBe(false);
      expect(update?.latestVersion).toBe(CURRENT_APP_VERSION);
    });

    it('deve retornar null se a API responder com status 404 (sem releases)', async () => {
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const update = await checkForUpdates();
      expect(update).toBeNull();
    });

    it('deve tratar exceção de rede e retornar null com segurança', async () => {
      (globalThis.fetch as any).mockRejectedValueOnce(new Error('Falha de rede'));

      const update = await checkForUpdates();
      expect(update).toBeNull();
    });
  });
});
