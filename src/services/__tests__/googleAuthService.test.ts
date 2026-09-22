import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initiateGoogleOAuthPopup } from '../googleAuthService';

describe('googleAuthService', () => {
  const originalOpen = window.open;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    window.open = originalOpen;
    globalThis.fetch = originalFetch;
  });

  it('deve retornar erro se o Client ID for inválido ou muito curto', async () => {
    const res = await initiateGoogleOAuthPopup({ clientId: 'curto' });
    expect(res.success).toBe(false);
    expect(res.error).toContain('Client ID do Google OAuth 2.0 válido');
  });

  it('deve retornar erro se o popup for bloqueado pelo navegador', async () => {
    window.open = vi.fn().mockReturnValue(null);

    const res = await initiateGoogleOAuthPopup({
      clientId: '1234567890-validclientid.apps.googleusercontent.com',
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain('bloqueou a janela pop-up');
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
      clientId: '1234567890-validclientid.apps.googleusercontent.com',
    });

    // Simula mensagem enviada pela janela de callback
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: window.location.origin,
        data: {
          type: 'GOOGLE_OAUTH_TOKEN',
          token: 'mock-oauth-access-token-xyz',
        },
      })
    );

    const res = await authPromise;

    expect(res.success).toBe(true);
    expect(res.user).toBeDefined();
    expect(res.user?.id).toBe('google_user_999');
    expect(res.user?.email).toBe('dev@flow.app');
    expect(res.user?.accessToken).toBe('mock-oauth-access-token-xyz');
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
