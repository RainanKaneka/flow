import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGoogleTokenRefresh } from '../useGoogleTokenRefresh';
import { useFlowStore } from '../../store/useFlowStore';
import * as googleAuthService from '../../services/googleAuthService';

vi.mock('../../services/googleAuthService', async () => {
  const actual = await vi.importActual('../../services/googleAuthService');
  return {
    ...actual,
    refreshGoogleAccessToken: vi.fn(),
  };
});

describe('useGoogleTokenRefresh Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    (googleAuthService.refreshGoogleAccessToken as any).mockResolvedValue({
      success: true,
      user: {
        id: 'u-mock',
        name: 'Mock User',
        email: 'mock@example.com',
        accessToken: 'mock-refreshed-token',
        expiresAt: Date.now() + 3600 * 1000,
        connectedAt: '',
      },
    });

    useFlowStore.setState({
      googleUser: null,
      geminiConfig: {
        apiKey: '',
        model: 'gemini-1.5-flash',
        temperature: 0.7,
        clientId: 'mock-client-id.apps.googleusercontent.com',
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('não deve fazer nada quando não houver usuário conectado', async () => {
    renderHook(() => useGoogleTokenRefresh(5000, true));
    expect(googleAuthService.refreshGoogleAccessToken).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(10000);
      await Promise.resolve();
    });
    expect(googleAuthService.refreshGoogleAccessToken).not.toHaveBeenCalled();
  });

  it('não deve chamar refresh se o token estiver fresco (> 10 minutos)', async () => {
    useFlowStore.setState({
      googleUser: {
        id: 'u1',
        name: 'User Fresh',
        email: 'fresh@example.com',
        accessToken: 'fresh-token',
        expiresAt: Date.now() + 30 * 60 * 1000, // 30 min
        connectedAt: '',
      },
    });

    renderHook(() => useGoogleTokenRefresh(5000, true));
    await act(async () => {
      await Promise.resolve();
    });

    expect(googleAuthService.refreshGoogleAccessToken).not.toHaveBeenCalled();
  });

  it('deve chamar refresh imediatamente se o token estiver prestes a expirar (< 10 minutos)', async () => {
    useFlowStore.setState({
      googleUser: {
        id: 'u2',
        name: 'User Expiring',
        email: 'exp@example.com',
        accessToken: 'expiring-token',
        expiresAt: Date.now() + 4 * 60 * 1000, // 4 min restante
        connectedAt: '',
      },
    });

    renderHook(() => useGoogleTokenRefresh(5000, true));
    await act(async () => {
      await Promise.resolve();
    });

    expect(googleAuthService.refreshGoogleAccessToken).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'u2', accessToken: 'expiring-token' }),
      'mock-client-id.apps.googleusercontent.com'
    );
  });

  it('deve disparar verificação no intervalo periódico quando o tempo avançar para expiração', async () => {
    const now = Date.now();
    // Configura expiração para exatamente 10 minutos e 2 segundos a partir de agora
    const mockUser = {
      id: 'u3',
      name: 'User Interval',
      email: 'interval@example.com',
      accessToken: 'token-interval',
      expiresAt: now + 10 * 60 * 1000 + 2000, // 10 min e 2 seg
      connectedAt: '',
    };
    useFlowStore.setState({ googleUser: mockUser });

    renderHook(() => useGoogleTokenRefresh(5000, true));
    await act(async () => {
      await Promise.resolve();
    });
    // Na inicialização, ainda faltam > 10 min, portanto não renova
    expect(googleAuthService.refreshGoogleAccessToken).not.toHaveBeenCalled();

    // Avança 5 segundos no tempo simulado: faltarão ~9 min e 57s (< 10 min)
    await act(async () => {
      vi.advanceTimersByTime(5000);
      await Promise.resolve();
    });

    expect(googleAuthService.refreshGoogleAccessToken).toHaveBeenCalledTimes(1);
  });

  it('deve disparar verificação ao receber evento de foco ou visibilidade da janela', async () => {
    useFlowStore.setState({
      googleUser: {
        id: 'u4',
        name: 'User Focus',
        email: 'focus@example.com',
        accessToken: 'token-focus',
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 min (< 10 min)
        connectedAt: '',
      },
    });

    renderHook(() => useGoogleTokenRefresh(60000, true));
    await act(async () => {
      await Promise.resolve();
    });
    expect(googleAuthService.refreshGoogleAccessToken).toHaveBeenCalledTimes(1);

    // Simula evento de foco na janela
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      await Promise.resolve();
    });
    expect(googleAuthService.refreshGoogleAccessToken).toHaveBeenCalledTimes(2);
  });
  it('não renova tokens antigos com a IA desativada na versão atual', async () => {
    useFlowStore.setState({
      googleUser: {
        id: 'legacy',
        name: 'Legacy',
        email: 'legacy@example.com',
        accessToken: 'expired-token',
        expiresAt: Date.now() - 1000,
        connectedAt: '',
      },
    });
    renderHook(() => useGoogleTokenRefresh());
    await act(async () => {
      vi.advanceTimersByTime(120000);
      window.dispatchEvent(new Event('focus'));
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });
    expect(googleAuthService.refreshGoogleAccessToken).not.toHaveBeenCalled();
  });
});
