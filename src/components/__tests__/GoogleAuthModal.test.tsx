import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { GoogleAuthModal } from '../GoogleAuthModal';
import { useFlowStore } from '../../store/useFlowStore';

// Mock do módulo de sons para não tocar áudio em ambiente de teste
vi.mock('../../utils/sound', () => ({
  sounds: {
    playTick: vi.fn(),
    playGlassChime: vi.fn(),
  },
}));

// Mock do googleAuthService
vi.mock('../../services/googleAuthService', async () => {
  const actual = await vi.importActual('../../services/googleAuthService');
  return {
    ...actual,
    initiateGoogleOAuthPopup: vi.fn().mockResolvedValue({ success: true }),
    refreshGoogleAccessToken: vi.fn().mockResolvedValue({ success: true }),
  };
});

describe('GoogleAuthModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFlowStore.setState({
      isGoogleAuthModalOpen: false,
      googleUser: null,
      geminiConfig: {
        apiKey: '',
        model: 'gemini-2.5-flash',
        temperature: 0.7,
        clientId: '',
        isConnected: false,
      },
    });
  });

  it('não deve renderizar nada quando isGoogleAuthModalOpen for false', () => {
    const { container } = render(<GoogleAuthModal />);
    expect(container.firstChild).toBeNull();
  });

  it('deve abrir o modal sem disparar erros de Rules of Hooks ao transicionar de fechado para aberto', () => {
    // Renderiza inicialmente fechado (como no carregamento inicial do app)
    const { rerender } = render(<GoogleAuthModal />);
    expect(screen.queryByText(/Configurar IA & Google/i)).not.toBeInTheDocument();

    // Simula abertura do modal quando o usuário clica no botão de configuração
    act(() => {
      useFlowStore.setState({ isGoogleAuthModalOpen: true });
    });
    rerender(<GoogleAuthModal />);

    // Deve renderizar com sucesso sem lançar 'Rendered more hooks than during previous render'
    expect(screen.getByText(/Conexão Google & Gemini IA/i)).toBeInTheDocument();
    expect(screen.getByTestId('flow-official-oauth-badge')).toBeInTheDocument();
  });

  it('deve fechar o modal ao clicar no botão de fechar', () => {
    useFlowStore.setState({ isGoogleAuthModalOpen: true });
    render(<GoogleAuthModal />);

    const closeBtn = screen.getByLabelText(/Fechar modal/i);
    fireEvent.click(closeBtn);

    expect(useFlowStore.getState().isGoogleAuthModalOpen).toBe(false);
  });

  it('deve exibir informações do perfil conectado e badge de auto-refresh quando o usuário possuir token', () => {
    useFlowStore.setState({
      isGoogleAuthModalOpen: true,
      googleUser: {
        id: 'u-100',
        name: 'Rainan Teste',
        email: 'rainan@flow.app',
        avatarUrl: 'https://example.com/pic.png',
        connectedAt: '25/09/2026',
        accessToken: 'valid-token-xyz',
        expiresAt: Date.now() + 50 * 60 * 1000,
        isAutoRefreshEnabled: true,
      },
    });

    render(<GoogleAuthModal />);

    expect(screen.getByText('Rainan Teste')).toBeInTheDocument();
    expect(screen.getByText('rainan@flow.app')).toBeInTheDocument();
    expect(screen.getByTestId('token-refresh-badge')).toBeInTheDocument();
    expect(screen.getByTestId('refresh-google-token-btn')).toBeInTheDocument();
  });

  it('deve exibir o card de conexão com token se o login for redirecionado para o navegador externo', async () => {
    const googleAuthService = await import('../../services/googleAuthService');
    (googleAuthService.initiateGoogleOAuthPopup as any).mockResolvedValueOnce({
      success: false,
      isExternalBrowser: true,
      error: 'O login foi aberto no seu navegador padrão.',
    });

    useFlowStore.setState({
      isGoogleAuthModalOpen: true,
      geminiConfig: {
        apiKey: '',
        model: 'gemini-2.5-flash',
        temperature: 0.7,
        clientId: '123456789012-mock-test.apps.googleusercontent.com',
        isConnected: false,
      },
    });
    render(<GoogleAuthModal />);

    const loginBtn = screen.getByText('Fazer Login com o Google');
    await act(async () => {
      fireEvent.click(loginBtn);
      await Promise.resolve();
    });

    expect(screen.getByTestId('external-browser-token-card')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Cole o token/i)).toBeInTheDocument();
    expect(screen.getByTestId('connect-with-token-btn')).toBeInTheDocument();
  });

  it('deve expandir a configuração de Client ID caso o usuário clique em login sem um Client ID válido (evitando erro 401)', async () => {
    useFlowStore.setState({
      isGoogleAuthModalOpen: true,
      geminiConfig: {
        apiKey: '',
        model: 'gemini-2.5-flash',
        temperature: 0.7,
        clientId: '',
        isConnected: false,
      },
    });
    render(<GoogleAuthModal />);

    const loginBtn = screen.getByText('Fazer Login com o Google');
    await act(async () => {
      fireEvent.click(loginBtn);
      await Promise.resolve();
    });

    expect(
      screen.getByText(/Para fazer login com o Google OAuth 2.0, é necessário cadastrar seu Client ID/i)
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Ex: 1234567890-abcdef.apps.googleusercontent.com/i)
    ).toBeInTheDocument();
  });

  it('deve permitir abrir o campo de token clicando no link do rodapé e conectar', async () => {
    const googleAuthService = await import('../../services/googleAuthService');
    (googleAuthService.verifyAndConnectGoogleToken as any) = vi.fn().mockResolvedValue({
      success: true,
      user: {
        id: 'u-ext',
        name: 'Usuário Manual',
        email: 'manual@test.com',
        accessToken: 'ya29.valid-manual-token',
        connectedAt: '25/09/2026',
      },
    });

    useFlowStore.setState({ isGoogleAuthModalOpen: true });
    render(<GoogleAuthModal />);

    const manualTokenLink = screen.getByText('Conectar com Token já gerado');
    fireEvent.click(manualTokenLink);

    const input = screen.getByPlaceholderText(/Cole o token/i);
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'ya29.valid-manual-token' } });

    const connectBtn = screen.getByTestId('connect-with-token-btn');
    await act(async () => {
      fireEvent.click(connectBtn);
      await Promise.resolve();
    });

    expect(googleAuthService.verifyAndConnectGoogleToken).toHaveBeenCalledWith(
      'ya29.valid-manual-token',
      expect.any(String)
    );
  });
});

