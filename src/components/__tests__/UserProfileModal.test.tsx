import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { UserProfileModal } from '../UserProfileModal';
import { useFlowStore } from '../../store/useFlowStore';
import { firebaseAuthService } from '../../services/firebaseAuthService';
import { userProfileService } from '../../services/userProfileService';
import { FirebaseUserProfile } from '../../types/routine';

vi.mock('../../services/firebaseAuthService', () => ({
  firebaseAuthService: { signInWithGoogle: vi.fn() },
}));

const googleAccount: FirebaseUserProfile = {
  uid: 'google-profile-user',
  displayName: 'Conta Google',
  email: 'google@example.com',
  photoURL: 'https://example.com/google-avatar.png',
  isAnonymous: false,
  providerId: 'google.com',
};

// Mock do audio
vi.mock('../../utils/audio', () => ({
  sounds: {
    playCheck: vi.fn(),
    playHapticClick: vi.fn(),
    playZenChime: vi.fn(),
  },
}));

// Mock do userProfileService cloud sync
vi.mock('../../services/userProfileService', async () => {
  const actual = await vi.importActual('../../services/userProfileService');
  return {
    ...actual,
    userProfileService: {
      isCloudConfigured: vi.fn(() => true),
      saveUserProfileToCloud: vi.fn().mockResolvedValue(true),
      fetchUserProfileFromCloud: vi.fn().mockResolvedValue(null),
      ensureUserProfileInitialized: vi.fn(),
    },
  };
});

describe('UserProfileModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(firebaseAuthService.signInWithGoogle).mockReset().mockResolvedValue(googleAccount);
    vi.mocked(userProfileService.ensureUserProfileInitialized).mockReset().mockResolvedValue({
      name: 'Meu perfil Google',
      objective: 'Objetivo salvo na nuvem',
      bio: 'Minha bio',
      avatarUrl: googleAccount.photoURL!,
      avatarPreset: 'zen',
    });
    useFlowStore.setState({
      isProfileModalOpen: false,
      firebaseUser: null,
      googleUser: null,
      isAuthSyncModalOpen: false,
      userProfile: {
        name: 'Rainan',
        objective: 'Foco Total',
        bio: 'Construindo o melhor app de produtividade',
        avatarPreset: 'spark',
        plan: 'free',
      },
      theme: 'dark',
      tasks: [
        {
          id: 't1',
          title: 'Tarefa Concluída',
          description: '',
          startTime: '08:00',
          endTime: '09:00',
          targetMinutes: 60,
          categoryId: 'cat_work',
          routineTypeId: 'dev',
          daysOfWeek: [1, 2, 3, 4, 5],
          tags: [],
        },
      ],
      logs: {
        l1: { id: '1', taskId: 't1', date: '2026-09-25', completed: true },
      },
      pomodoro: {
        isActive: false,
        timeLeftSeconds: 1500,
        totalDurationSeconds: 1500,
        mode: 'focus',
        linkedTaskId: null,
        completedSessions: 1,
      },
      reminderSettings: {
        enabled: true,
        advanceMinutes: 5,
        soundEnabled: true,
      },
    });
  });

  it('não deve renderizar nada quando isProfileModalOpen for false', () => {
    const { container } = render(<UserProfileModal />);
    expect(container).toBeEmptyDOMElement();
  });

  it('deve renderizar o modal com título, abas e informações iniciais quando aberto', () => {
    useFlowStore.setState({ isProfileModalOpen: true });
    render(<UserProfileModal />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('user-profile-modal-content')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Rainan');
    expect(screen.getByTestId('tab-profile-btn')).toBeInTheDocument();
    expect(screen.getByTestId('tab-settings-btn')).toBeInTheDocument();
    expect(screen.getByTestId('tab-stats-btn')).toBeInTheDocument();
  });

  it('deve permitir alternar para a aba de Configurações e interagir com opções', () => {
    useFlowStore.setState({ isProfileModalOpen: true });
    render(<UserProfileModal />);

    const settingsTab = screen.getByTestId('tab-settings-btn');
    fireEvent.click(settingsTab);

    expect(screen.getByText('Tema Visual')).toBeInTheDocument();
    expect(screen.getByText('Duração Padrão do Pomodoro')).toBeInTheDocument();
    expect(screen.getByText('Feedback Sensorial (Tigela Tibetana 528Hz)')).toBeInTheDocument();

    expect(screen.queryByTestId('toggle-plan-btn')).not.toBeInTheDocument();
    expect(screen.queryByText(/Plano Flow/)).not.toBeInTheDocument();
  });

  it('permite criar/entrar com Google diretamente na aba Perfil e carrega o perfil da conta', async () => {
    useFlowStore.setState({ isProfileModalOpen: true });
    render(<UserProfileModal />);
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta com Google' }));

    await waitFor(() =>
      expect(screen.getByTestId('profile-name-input')).toHaveValue('Meu perfil Google')
    );
    expect(firebaseAuthService.signInWithGoogle).toHaveBeenCalledTimes(1);
    expect(userProfileService.ensureUserProfileInitialized).toHaveBeenCalledWith(
      googleAccount.uid,
      {
        name: googleAccount.displayName,
        email: googleAccount.email,
        avatarUrl: googleAccount.photoURL,
      }
    );
    expect(useFlowStore.getState().firebaseUser).toEqual(googleAccount);
    expect(screen.getByTestId('profile-objective-input')).toHaveValue('Objetivo salvo na nuvem');
    expect(screen.getByRole('img', { name: 'Meu perfil Google' })).toHaveAttribute(
      'src',
      googleAccount.photoURL
    );
    expect(screen.getByText('Conectado como google@example.com')).toBeInTheDocument();
    expect(useFlowStore.getState().isAuthSyncModalOpen).toBe(false);
  });

  it('bloqueia cliques duplicados e salvar o perfil enquanto o login está pendente', async () => {
    let finish!: (user: FirebaseUserProfile) => void;
    vi.mocked(firebaseAuthService.signInWithGoogle).mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    useFlowStore.setState({ isProfileModalOpen: true });
    render(<UserProfileModal />);
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta com Google' }));
    const pendingButton = screen.getByRole('button', { name: 'Conectando com Google…' });
    expect(pendingButton).toBeDisabled();
    expect(screen.getByTestId('save-profile-btn')).toBeDisabled();
    fireEvent.click(pendingButton);
    expect(firebaseAuthService.signInWithGoogle).toHaveBeenCalledTimes(1);
    await act(async () => {
      finish(googleAccount);
    });
    expect(screen.getByTestId('save-profile-btn')).toBeEnabled();
  });

  it('mostra cancelamento, mantém as edições locais e permite tentar novamente', async () => {
    vi.mocked(firebaseAuthService.signInWithGoogle).mockRejectedValueOnce(
      Object.assign(new Error('Popup closed'), { code: 'auth/popup-closed-by-user' })
    );
    useFlowStore.setState({ isProfileModalOpen: true });
    render(<UserProfileModal />);
    fireEvent.change(screen.getByTestId('profile-name-input'), {
      target: { value: 'Nome editado' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta com Google' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('A conexão foi cancelada');
    expect(screen.getByTestId('profile-name-input')).toHaveValue('Nome editado');
    expect(useFlowStore.getState().firebaseUser).toBeNull();
    expect(userProfileService.ensureUserProfileInitialized).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta com Google' }));
    await waitFor(() =>
      expect(screen.getByText('Conectado como google@example.com')).toBeInTheDocument()
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('não anuncia sucesso se o perfil não puder ser carregado e permite repetir o login', async () => {
    vi.mocked(userProfileService.ensureUserProfileInitialized).mockResolvedValueOnce(null);
    useFlowStore.setState({ isProfileModalOpen: true });
    render(<UserProfileModal />);
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta com Google' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'não foi possível carregar o perfil'
    );
    expect(screen.getByRole('button', { name: 'Criar conta com Google' })).toBeEnabled();
  });

  it('oferece criação de conta Google para convidados', () => {
    useFlowStore.setState({
      isProfileModalOpen: true,
      firebaseUser: { ...googleAccount, uid: 'guest', isAnonymous: true, providerId: 'anonymous' },
    });
    render(<UserProfileModal />);
    expect(screen.getByRole('button', { name: 'Criar conta com Google' })).toBeEnabled();
  });

  it('mostra a conta conectada e abre seu gerenciamento sem sobrepor os modais', () => {
    useFlowStore.setState({ isProfileModalOpen: true, firebaseUser: googleAccount });
    render(<UserProfileModal />);
    expect(
      screen.queryByRole('button', { name: 'Criar conta com Google' })
    ).not.toBeInTheDocument();
    expect(screen.getByText('Conectado como google@example.com')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Gerenciar Conta' }));
    expect(useFlowStore.getState().isProfileModalOpen).toBe(false);
    expect(useFlowStore.getState().isAuthSyncModalOpen).toBe(true);
  });

  it('deve permitir alternar para a aba de Estatísticas & Conquistas e exibir métricas', () => {
    useFlowStore.setState({ isProfileModalOpen: true });
    render(<UserProfileModal />);

    const statsTab = screen.getByTestId('tab-stats-btn');
    fireEvent.click(statsTab);

    expect(screen.getByText('Nível de Produtividade Flow')).toBeInTheDocument();
    expect(screen.getByText('Tempo Focado')).toBeInTheDocument();
    expect(screen.getByText('Concluídas')).toBeInTheDocument();
    expect(screen.getByText('Sequência')).toBeInTheDocument();
    expect(screen.getByText('Mural de Conquistas')).toBeInTheDocument();
    expect(screen.getByText('Primeiro Passo')).toBeInTheDocument();
  });

  it('deve permitir editar nome e objetivo e salvar o perfil', () => {
    useFlowStore.setState({ isProfileModalOpen: true });
    render(<UserProfileModal />);

    const nameInput = screen.getByTestId('profile-name-input');
    fireEvent.change(nameInput, { target: { value: 'Rainan Dev' } });

    const objectiveInput = screen.getByTestId('profile-objective-input');
    fireEvent.change(objectiveInput, { target: { value: 'Lançar o Flow v1.0' } });

    const saveBtn = screen.getByTestId('save-profile-btn');
    fireEvent.click(saveBtn);

    const updatedProfile = useFlowStore.getState().userProfile;
    expect(updatedProfile?.name).toBe('Rainan Dev');
    expect(updatedProfile?.objective).toBe('Lançar o Flow v1.0');
    expect(screen.getByText('Salvo!')).toBeInTheDocument();
  });

  it('deve fechar o modal ao clicar no botão fechar', () => {
    useFlowStore.setState({ isProfileModalOpen: true });
    render(<UserProfileModal />);

    const closeBtn = screen.getByTestId('close-profile-modal-btn');
    fireEvent.click(closeBtn);
    expect(useFlowStore.getState().isProfileModalOpen).toBe(false);
  });

  it('deve fechar o modal ao pressionar a tecla Escape', () => {
    useFlowStore.setState({ isProfileModalOpen: true });
    render(<UserProfileModal />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useFlowStore.getState().isProfileModalOpen).toBe(false);
  });
  it('não exibe monetização para perfil Pro antigo nem altera seu plano ao salvar', () => {
    const legacy = {
      ...useFlowStore.getState().userProfile!,
      plan: 'premium' as const,
      aiQuota: { monthlyLimit: 1000, used: 25, totalTokensConsumed: 100, resetDate: '2026-11-01' },
    };
    useFlowStore.setState({ isProfileModalOpen: true, userProfile: legacy });
    render(<UserProfileModal />);
    expect(screen.queryByText('Flow Pro')).not.toBeInTheDocument();
    expect(screen.queryByText('Gratuito')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('tab-settings-btn'));
    expect(screen.queryByTestId('toggle-plan-btn')).not.toBeInTheDocument();
    expect(screen.queryByText('Consumo Mensal de IA:')).not.toBeInTheDocument();
    expect(screen.getByText('Tema Visual')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('save-profile-btn'));
    expect(useFlowStore.getState().userProfile?.plan).toBe('premium');
    expect(useFlowStore.getState().userProfile?.aiQuota).toEqual(legacy.aiQuota);
  });
});
