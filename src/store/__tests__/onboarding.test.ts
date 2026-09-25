import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useFlowStore } from '../useFlowStore';
import { ROUTINE_TEMPLATES } from '../../data/routineTemplates';

describe('useFlowStore - Onboarding & User Profile Slice', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useFlowStore.setState({
      hasCompletedOnboarding: false,
      userProfile: null,
      isOnboardingModalOpen: false,
      theme: 'dark',
      routineTypes: [],
      categories: [],
      tasks: [],
      logs: {},
      pomodoro: {
        isActive: false,
        timeLeftSeconds: 1500,
        totalDurationSeconds: 1500,
        mode: 'focus',
        linkedTaskId: null,
        completedSessions: 0,
      },
      reminderSettings: {
        enabled: true,
        advanceMinutes: 5,
        soundEnabled: true,
      },
      snackbar: {
        isOpen: false,
        message: '',
      },
    });
  });

  it('deve ter o estado inicial de onboarding como não concluído', () => {
    const state = useFlowStore.getState();
    expect(state.hasCompletedOnboarding).toBe(false);
    expect(state.userProfile).toBeNull();
    expect(state.isOnboardingModalOpen).toBe(false);
  });

  it('deve abrir e fechar o modal de onboarding', () => {
    const { openOnboardingModal, closeOnboardingModal } = useFlowStore.getState();

    openOnboardingModal();
    expect(useFlowStore.getState().isOnboardingModalOpen).toBe(true);

    closeOnboardingModal();
    expect(useFlowStore.getState().isOnboardingModalOpen).toBe(false);
  });

  it('deve permitir atualizar o perfil do usuário pontualmente', () => {
    const { updateUserProfile } = useFlowStore.getState();

    updateUserProfile({ name: 'Alex', objective: 'focus' });
    expect(useFlowStore.getState().userProfile).toEqual({
      name: 'Alex',
      objective: 'focus',
    });

    updateUserProfile({ name: 'Alexander' });
    expect(useFlowStore.getState().userProfile?.name).toBe('Alexander');
    expect(useFlowStore.getState().userProfile?.objective).toBe('focus');
  });

  it('deve concluir o onboarding e configurar template, tarefas, categorias e preferências', () => {
    const { completeOnboarding } = useFlowStore.getState();
    const deepWorkTemplate = ROUTINE_TEMPLATES.find((t) => t.id === 'deep_work')!;

    completeOnboarding({
      name: 'Rainan',
      objective: 'focus',
      templateId: 'deep_work',
      theme: 'dark',
      pomodoroDurationMinutes: 50,
      remindersEnabled: true,
      reminderAdvanceMinutes: 10,
      soundEnabled: true,
    });

    const state = useFlowStore.getState();

    // Perfil e status
    expect(state.hasCompletedOnboarding).toBe(true);
    expect(state.isOnboardingModalOpen).toBe(false);
    expect(state.userProfile).toEqual({
      name: 'Rainan',
      objective: 'focus',
    });

    // Template aplicado
    expect(state.selectedRoutineTypeId).toBe(deepWorkTemplate.routineType.id);
    expect(state.routineTypes).toEqual([deepWorkTemplate.routineType]);
    expect(state.categories).toEqual(deepWorkTemplate.categories);
    expect(state.tasks).toEqual(deepWorkTemplate.tasks);

    // Pomodoro ajustado para 50 min (3000 segundos)
    expect(state.pomodoro.totalDurationSeconds).toBe(50 * 60);
    expect(state.pomodoro.timeLeftSeconds).toBe(50 * 60);

    // Lembretes ajustados
    expect(state.reminderSettings.enabled).toBe(true);
    expect(state.reminderSettings.advanceMinutes).toBe(10);
    expect(state.reminderSettings.soundEnabled).toBe(true);

    // Snackbar de boas-vindas
    expect(state.snackbar.isOpen).toBe(true);
    expect(state.snackbar.message).toContain('Bem-vindo ao Flow, Rainan!');
  });

  it('deve concluir o onboarding com template de estudos corretamente', () => {
    const { completeOnboarding } = useFlowStore.getState();
    const studyTemplate = ROUTINE_TEMPLATES.find((t) => t.id === 'study')!;

    completeOnboarding({
      name: 'Camila',
      objective: 'study',
      templateId: 'study',
      theme: 'light',
      pomodoroDurationMinutes: 25,
      remindersEnabled: false,
      reminderAdvanceMinutes: 0,
      soundEnabled: false,
    });

    const state = useFlowStore.getState();

    expect(state.hasCompletedOnboarding).toBe(true);
    expect(state.userProfile?.name).toBe('Camila');
    expect(state.userProfile?.objective).toBe('study');
    expect(state.theme).toBe('light');

    expect(state.selectedRoutineTypeId).toBe(studyTemplate.routineType.id);
    expect(state.tasks).toEqual(studyTemplate.tasks);
    expect(state.pomodoro.totalDurationSeconds).toBe(25 * 60);
    expect(state.reminderSettings.enabled).toBe(false);
  });
});
