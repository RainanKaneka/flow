import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthSyncModal } from '../AuthSyncModal';
import { useFlowStore } from '../../store/useFlowStore';
import { firebaseAuthService } from '../../services/firebaseAuthService';
import { cloudSyncService } from '../../services/cloudSyncService';

vi.mock('../../services/firebaseAuthService', () => ({
  firebaseAuthService: {
    isConfigured: vi.fn().mockReturnValue(true),
    getCurrentUser: vi.fn().mockReturnValue(null),
    signInWithEmail: vi.fn(),
    signUpWithEmail: vi.fn(),
    signInAnonymously: vi.fn(),
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChanged: vi.fn().mockReturnValue(() => {}),
  },
}));

vi.mock('../../services/cloudSyncService', () => ({
  cloudSyncService: {
    isConfigured: vi.fn().mockReturnValue(true),
    pushToCloud: vi.fn().mockResolvedValue(true),
    pullFromCloud: vi.fn().mockResolvedValue(null),
    syncBidirectional: vi.fn().mockResolvedValue({
      success: true,
      syncedAt: '2026-09-25T10:00:00.000Z',
      action: 'pushed_to_cloud',
    }),
    subscribeToCloudChanges: vi.fn().mockReturnValue(() => {}),
  },
}));

describe('AuthSyncModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFlowStore.setState({
      isAuthSyncModalOpen: true,
      firebaseUser: null,
      cloudSyncStatus: {
        isSyncing: false,
        lastSyncedAt: null,
        error: null,
        autoSyncEnabled: true,
      },
      tasks: [],
      routineTypes: [],
      categories: [],
      logs: {},
      backlog: [],
      notes: [],
    });
  });

  it('não renderiza nada se isAuthSyncModalOpen for falso', () => {
    useFlowStore.setState({ isAuthSyncModalOpen: false });
    const { container } = render(<AuthSyncModal />);
    expect(container.firstChild).toBeNull();
  });

  it('renderiza título e tabs de login quando aberto e deslogado', () => {
    render(<AuthSyncModal />);
    expect(screen.getByText('Nuvem & Sincronização Firebase')).toBeDefined();
    expect(screen.getByRole('button', { name: /^Entrar$/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Criar Conta/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Configurações/i })).toBeDefined();
  });

  it('permite alternar entre as abas de Criar Conta e Configurações', () => {
    render(<AuthSyncModal />);

    // Aba Criar Conta
    fireEvent.click(screen.getByRole('button', { name: /Criar Conta/i }));
    expect(screen.getByPlaceholderText('Como deseja ser chamado?')).toBeDefined();

    // Aba Configurações
    fireEvent.click(screen.getByRole('button', { name: /Configurações/i }));
    expect(screen.getByText(/Insira as credenciais do seu projeto Firebase/i)).toBeDefined();
    expect(screen.getByText('API Key')).toBeDefined();
    expect(screen.getByText('Project ID')).toBeDefined();
  });

  it('chama signInWithGoogle ao clicar no botão do Google', async () => {
    (firebaseAuthService.signInWithGoogle as any).mockResolvedValueOnce({
      uid: 'google-123',
      displayName: 'Google Dev',
      email: 'google@flow.com',
      photoURL: null,
      isAnonymous: false,
      providerId: 'google.com',
    });

    render(<AuthSyncModal />);
    const googleBtn = screen.getByRole('button', { name: /Continuar com Google/i });
    fireEvent.click(googleBtn);

    await waitFor(() => {
      expect(firebaseAuthService.signInWithGoogle).toHaveBeenCalled();
      expect(useFlowStore.getState().firebaseUser?.uid).toBe('google-123');
    });
  });

  it('chama signInAnonymously ao clicar no botão de Convidado', async () => {
    (firebaseAuthService.signInAnonymously as any).mockResolvedValueOnce({
      uid: 'anon-123',
      displayName: 'Convidado (Offline/Sync)',
      email: null,
      photoURL: null,
      isAnonymous: true,
      providerId: 'anonymous',
    });

    render(<AuthSyncModal />);
    const guestBtn = screen.getByRole('button', { name: /Continuar como Convidado/i });
    fireEvent.click(guestBtn);

    await waitFor(() => {
      expect(firebaseAuthService.signInAnonymously).toHaveBeenCalled();
      expect(useFlowStore.getState().firebaseUser?.uid).toBe('anon-123');
    });
  });

  it('exibe perfil do usuário e botão de sincronização quando conectado', async () => {
    useFlowStore.setState({
      firebaseUser: {
        uid: 'user-connected',
        displayName: 'Rainan Dev',
        email: 'rainan@flow.com',
        photoURL: null,
        isAnonymous: false,
        providerId: 'password',
      },
    });

    render(<AuthSyncModal />);
    expect(screen.getByText('Rainan Dev')).toBeDefined();
    expect(screen.getByText('rainan@flow.com')).toBeDefined();

    const syncBtn = screen.getByRole('button', { name: /Sincronizar Agora/i });
    expect(syncBtn).toBeDefined();

    fireEvent.click(syncBtn);
    await waitFor(() => {
      expect(cloudSyncService.syncBidirectional).toHaveBeenCalled();
    });
  });

  it('chama signOut ao clicar em Desconectar', async () => {
    useFlowStore.setState({
      firebaseUser: {
        uid: 'user-connected',
        displayName: 'Rainan Dev',
        email: 'rainan@flow.com',
        photoURL: null,
        isAnonymous: false,
        providerId: 'password',
      },
    });

    render(<AuthSyncModal />);
    const signOutBtn = screen.getByRole('button', { name: /Sair/i });
    fireEvent.click(signOutBtn);

    await waitFor(() => {
      expect(firebaseAuthService.signOut).toHaveBeenCalled();
      expect(useFlowStore.getState().firebaseUser).toBeNull();
    });
  });

  it('fecha o modal ao clicar no botão fechar', () => {
    render(<AuthSyncModal />);
    const closeBtn = screen.getByTestId('close-auth-sync-modal-btn');
    fireEvent.click(closeBtn);
    expect(useFlowStore.getState().isAuthSyncModalOpen).toBe(false);
  });
});
