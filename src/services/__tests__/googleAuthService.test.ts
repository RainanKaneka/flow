import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  initiateGoogleOAuthPopup,
  FLOW_OFFICIAL_CLIENT_ID,
  PLACEHOLDER_CLIENT_ID,
  isValidGoogleClientId,
  getEffectiveGoogleClientId,
  isUsingOfficialClientId,
  isTokenExpired,
  getTimeUntilExpiryMinutes,
  refreshGoogleAccessToken,
  getValidGoogleAccessToken,
  verifyAndConnectGoogleToken,
} from '../googleAuthService';
import { useFlowStore } from '../../store/useFlowStore';
import { GoogleUserProfile } from '../../types/routine';
import * as firebaseConfig from '../firebaseConfig';

vi.mock('../firebaseConfig', () => ({
  getFirebaseAuthInstance: vi.fn(),
  isFirebaseConfigured: vi.fn(),
}));

describe('googleAuthService', () => {
  const originalOpen = window.open;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
    (firebaseConfig.getFirebaseAuthInstance as any).mockReturnValue(null);
  });

  afterEach(() => {
    window.open = originalOpen;
    globalThis.fetch = originalFetch;
  });

  describe('Client ID Oficial do Flow & Validação', () => {
    it('possui um Client ID oficial do Flow padrão e fallback definido', () => {
      expect(FLOW_OFFICIAL_CLIENT_ID).toBeDefined();
      expect(FLOW_OFFICIAL_CLIENT_ID.length).toBeGreaterThan(15);
      expect(FLOW_OFFICIAL_CLIENT_ID).toContain('.apps.googleusercontent.com');
    });

    it('getEffectiveGoogleClientId retorna o ID oficial quando nenhum for informado', () => {
      expect(getEffectiveGoogleClientId()).toBe(FLOW_OFFICIAL_CLIENT_ID);
      expect(getEffectiveGoogleClientId('')).toBe(FLOW_OFFICIAL_CLIENT_ID);
      expect(isUsingOfficialClientId()).toBe(true);
    });

    it('getEffectiveGoogleClientId respeita o Client ID customizado do usuário', () => {
      const custom = '123456789-custom.apps.googleusercontent.com';
      expect(getEffectiveGoogleClientId(custom)).toBe(custom);
      expect(isUsingOfficialClientId(custom)).toBe(false);
    });

    it('isValidGoogleClientId identifica e valida corretamente client IDs', () => {
      expect(isValidGoogleClientId(null)).toBe(false);
      expect(isValidGoogleClientId('')).toBe(false);
      expect(isValidGoogleClientId('curto')).toBe(false);
      expect(isValidGoogleClientId('sem-formato-google')).toBe(false);

      // Rejeita o placeholder fictício que causa 401 invalid_client
      expect(isValidGoogleClientId(PLACEHOLDER_CLIENT_ID)).toBe(false);
      expect(isValidGoogleClientId('12345-flow-official-client.apps.googleusercontent.com')).toBe(false);

      // Aceita client IDs autênticos do Google Cloud
      expect(isValidGoogleClientId('983421832049-abcdef123456.apps.googleusercontent.com')).toBe(true);
      expect(isValidGoogleClientId('123456789012-projeto-flow_test.apps.googleusercontent.com')).toBe(true);
    });
  });

  describe('Token Expiration & Helpers', () => {
    it('isTokenExpired retorna true se o usuário ou token for nulo', () => {
      expect(isTokenExpired(null)).toBe(true);
      expect(isTokenExpired({ id: '1', name: 'A', email: 'a@a.com', connectedAt: '' })).toBe(true);
    });

    it('isTokenExpired avalia corretamente com base na margem de segurança', () => {
      const now = Date.now();
      const freshUser: GoogleUserProfile = {
        id: '1',
        name: 'A',
        email: 'a@a.com',
        accessToken: 'valid-token',
        connectedAt: '',
        expiresAt: now + 30 * 60 * 1000, // Expira em 30 min
      };
      expect(isTokenExpired(freshUser, 5)).toBe(false);

      const expiringUser: GoogleUserProfile = {
        ...freshUser,
        expiresAt: now + 3 * 60 * 1000, // Expira em 3 min (< 5 min buffer)
      };
      expect(isTokenExpired(expiringUser, 5)).toBe(true);
    });

    it('getTimeUntilExpiryMinutes calcula os minutos restantes corretamente', () => {
      const now = Date.now();
      const user: GoogleUserProfile = {
        id: '1',
        name: 'A',
        email: 'a@a.com',
        accessToken: 'tok',
        connectedAt: '',
        expiresAt: now + 25 * 60 * 1000,
      };
      expect(getTimeUntilExpiryMinutes(user)).toBe(25);
    });
  });

  describe('initiateGoogleOAuthPopup', () => {
    it('deve retornar erro se um Client ID customizado inválido ou muito curto for passado', async () => {
      const res = await initiateGoogleOAuthPopup({ clientId: 'curto' });
      expect(res.success).toBe(false);
      expect(res.error).toContain('Client ID do Google Cloud Console válido');
    });

    it('deve retornar erro amigável sem abrir janela se o Client ID não estiver configurado (evita 401)', async () => {
      window.open = vi.fn();
      const res = await initiateGoogleOAuthPopup();
      expect(window.open).not.toHaveBeenCalled();
      expect(res.success).toBe(false);
      expect(res.error).toContain('Client ID do Google Cloud Console válido');
    });

    it('deve abrir a janela popup quando chamado com um Client ID válido', async () => {
      const validClientId = '123456789012-validproject.apps.googleusercontent.com';
      const mockPopup = {
        closed: true,
        close: vi.fn(),
        location: { hash: '' },
      };
      window.open = vi.fn().mockReturnValue(mockPopup);

      const res = await initiateGoogleOAuthPopup({ clientId: validClientId });

      expect(window.open).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent(validClientId)),
        'google_oauth_popup',
        expect.any(String)
      );
      expect(res.success).toBe(false);
    });

    it('deve retornar erro e indicar navegador externo se o popup for bloqueado pelo navegador', async () => {
      window.open = vi.fn().mockReturnValue(null);

      const res = await initiateGoogleOAuthPopup({
        clientId: '1234567890-validclientid.apps.googleusercontent.com',
      });

      expect(res.success).toBe(false);
      expect(res.isExternalBrowser).toBe(true);
      expect(res.error).toContain('bloqueou a janela pop-up');
    });

    it('deve abrir diretamente no navegador padrão quando estiver em ambiente Desktop (Tauri)', async () => {
      (window as any).__TAURI__ = true;
      window.open = vi.fn();

      const res = await initiateGoogleOAuthPopup({
        clientId: '123456789012-tauri-client.apps.googleusercontent.com',
      });

      expect(window.open).not.toHaveBeenCalled();
      expect(res.success).toBe(false);
      expect(res.isExternalBrowser).toBe(true);
      expect(res.error).toContain('navegador padrão');

      delete (window as any).__TAURI__;
    });

    it('deve concluir autenticação com sucesso quando receber token via postMessage', async () => {
      const mockPopup = {
        closed: false,
        close: vi.fn(),
        location: { hash: '' },
      };
      window.open = vi.fn().mockReturnValue(mockPopup);

      const mockUserInfo = {
        sub: 'google_user_999',
        name: 'Dev Flow',
        email: 'dev@flow.app',
        picture: 'https://avatar.url/pic.jpg',
      };

      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserInfo,
      });

      const authPromise = initiateGoogleOAuthPopup({
        clientId: '123456789012-oauth-client.apps.googleusercontent.com',
      });

      window.dispatchEvent(
        new MessageEvent('message', {
          origin: window.location.origin,
          data: {
            type: 'GOOGLE_OAUTH_TOKEN',
            token: 'mock-oauth-access-token-xyz',
            expiresIn: 3600,
            refreshToken: 'mock-refresh-token-123',
          },
        })
      );

      const res = await authPromise;

      expect(res.success).toBe(true);
      expect(res.user).toBeDefined();
      expect(res.user?.id).toBe('google_user_999');
      expect(res.user?.email).toBe('dev@flow.app');
      expect(res.user?.accessToken).toBe('mock-oauth-access-token-xyz');
      expect(res.user?.refreshToken).toBe('mock-refresh-token-123');
      expect(res.user?.isAutoRefreshEnabled).toBe(true);
      expect(mockPopup.close).toHaveBeenCalled();
    });

    it('deve retornar erro se a busca do perfil falhar após token', async () => {
      const mockPopup = {
        closed: false,
        close: vi.fn(),
        location: { hash: '' },
      };
      window.open = vi.fn().mockReturnValue(mockPopup);

      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const authPromise = initiateGoogleOAuthPopup({
        clientId: '1234567890-validclientid.apps.googleusercontent.com',
      });

      window.dispatchEvent(
        new MessageEvent('message', {
          origin: window.location.origin,
          data: {
            type: 'GOOGLE_OAUTH_TOKEN',
            token: 'invalid-token',
          },
        })
      );

      const res = await authPromise;

      expect(res.success).toBe(false);
      expect(res.error).toContain('Falha ao obter perfil do Google');
    });
  });

  describe('refreshGoogleAccessToken & getValidGoogleAccessToken', () => {
    it('renova token com endpoint oficial quando possuir refreshToken', async () => {
      const user: GoogleUserProfile = {
        id: 'user-refresh-1',
        name: 'Flow User',
        email: 'flow@test.com',
        accessToken: 'old-access-token',
        refreshToken: 'valid-refresh-token',
        expiresAt: Date.now() - 1000,
        connectedAt: '',
      };

      useFlowStore.setState({ googleUser: user });

      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new-refreshed-token-999',
          expires_in: 3600,
        }),
      });

      const res = await refreshGoogleAccessToken(user);
      expect(res.success).toBe(true);
      expect(res.user?.accessToken).toBe('new-refreshed-token-999');
      expect(useFlowStore.getState().googleUser?.accessToken).toBe('new-refreshed-token-999');
    });

    it('renova token via verificação de perfil quando ativo', async () => {
      const user: GoogleUserProfile = {
        id: 'user-verify-1',
        name: 'Flow User',
        email: 'flow@test.com',
        accessToken: 'active-token-xyz',
        expiresAt: Date.now() - 1000,
        connectedAt: '',
      };

      useFlowStore.setState({ googleUser: user });

      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ email: 'flow@test.com' }),
      });

      const res = await refreshGoogleAccessToken(user);
      expect(res.success).toBe(true);
      expect(res.user?.accessToken).toBe('active-token-xyz');
      expect(res.user?.expiresAt).toBeGreaterThan(Date.now());
    });

    it('retorna erro amigável se todas as estratégias de renovação falharem', async () => {
      const user: GoogleUserProfile = {
        id: 'user-fail-1',
        name: 'Flow User',
        email: 'flow@test.com',
        accessToken: 'expired-token',
        expiresAt: Date.now() - 1000,
        connectedAt: '',
      };

      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const res = await refreshGoogleAccessToken(user);
      expect(res.success).toBe(false);
      expect(res.error).toContain('expirado');
    });

    it('getValidGoogleAccessToken retorna token atual se válido sem chamar refresh', async () => {
      const freshUser: GoogleUserProfile = {
        id: 'user-fresh-1',
        name: 'Fresh User',
        email: 'fresh@test.com',
        accessToken: 'still-fresh-token',
        expiresAt: Date.now() + 50 * 60 * 1000, // 50 minutos
        connectedAt: '',
      };

      useFlowStore.setState({ googleUser: freshUser });

      const token = await getValidGoogleAccessToken();
      expect(token).toBe('still-fresh-token');
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('getValidGoogleAccessToken renova token automaticamente se estiver prestes a expirar', async () => {
      const expiringUser: GoogleUserProfile = {
        id: 'user-expiring-1',
        name: 'Expiring User',
        email: 'exp@test.com',
        accessToken: 'almost-dead-token',
        expiresAt: Date.now() + 2 * 60 * 1000, // 2 minutos (< 5 min buffer)
        refreshToken: 'valid-refresh-tok',
        connectedAt: '',
      };

      useFlowStore.setState({ googleUser: expiringUser });

      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'auto-renewed-token-123',
          expires_in: 3600,
        }),
      });

      const token = await getValidGoogleAccessToken();
      expect(token).toBe('auto-renewed-token-123');
      expect(globalThis.fetch).toHaveBeenCalled();
    });
  });

  describe('verifyAndConnectGoogleToken', () => {
    it('deve rejeitar tokens vazios ou excessivamente curtos', async () => {
      const resEmpty = await verifyAndConnectGoogleToken('');
      expect(resEmpty.success).toBe(false);

      const resShort = await verifyAndConnectGoogleToken('curto');
      expect(resShort.success).toBe(false);
      expect(resShort.error).toContain('inválido');
    });

    it('deve extrair e conectar com sucesso quando receber uma URL ou hash com access_token', async () => {
      const rawUrl =
        'http://localhost:3000/#access_token=ya29.mock-external-token-xyz&expires_in=3600';

      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sub: 'google_ext_user_1',
          name: 'Usuário Desktop',
          email: 'desktop@flow.app',
          picture: 'https://avatar.url/desktop.png',
        }),
      });

      const res = await verifyAndConnectGoogleToken(rawUrl);

      expect(res.success).toBe(true);
      expect(res.user?.id).toBe('google_ext_user_1');
      expect(res.user?.email).toBe('desktop@flow.app');
      expect(res.user?.accessToken).toBe('ya29.mock-external-token-xyz');
      expect(useFlowStore.getState().googleUser?.accessToken).toBe('ya29.mock-external-token-xyz');
    });

    it('deve lidar com erro se a validação do token retornar 401 Unauthorized do Google', async () => {
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const res = await verifyAndConnectGoogleToken('ya29.invalid-or-expired-token');
      expect(res.success).toBe(false);
      expect(res.error).toContain('inválido ou expirou');
    });
  });
});

