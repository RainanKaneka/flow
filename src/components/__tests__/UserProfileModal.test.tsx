import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserProfileModal } from '../UserProfileModal';
import { useFlowStore } from '../../store/useFlowStore';

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
    },
  };
});

describe('UserProfileModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFlowStore.setState({
      isProfileModalOpen: false,
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
