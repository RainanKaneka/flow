import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OnboardingWizard } from '../OnboardingWizard';
import { useFlowStore } from '../../store/useFlowStore';

describe('OnboardingWizard Component', () => {
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

  it('não deve renderizar nada se o onboarding já foi concluído e o modal não está aberto', () => {
    useFlowStore.setState({ hasCompletedOnboarding: true, isOnboardingModalOpen: false });
    const { container } = render(<OnboardingWizard />);
    expect(container.firstChild).toBeNull();
  });

  it('deve renderizar o Wizard se o onboarding não foi concluído', () => {
    render(<OnboardingWizard />);
    expect(screen.getByText('Bem-vindo ao Flow')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Digite seu nome ou apelido/i)).toBeInTheDocument();
    expect(screen.getByText('1. Identidade')).toBeInTheDocument();
  });

  it('deve desabilitar o botão Continuar no Passo 1 até que um nome seja preenchido', () => {
    render(<OnboardingWizard />);

    const continueBtn = screen.getByRole('button', { name: /Continuar/i });
    expect(continueBtn).toBeDisabled();

    const nameInput = screen.getByPlaceholderText(/Digite seu nome ou apelido/i);
    fireEvent.change(nameInput, { target: { value: 'Alex' } });

    expect(continueBtn).not.toBeDisabled();
  });

  it('deve permitir navegar pelos 4 passos até concluir o setup completo', () => {
    render(<OnboardingWizard />);

    // STEP 1: Preencher nome e selecionar objetivo
    const nameInput = screen.getByPlaceholderText(/Digite seu nome ou apelido/i);
    fireEvent.change(nameInput, { target: { value: 'Alex' } });

    const studyObjectiveBtn = screen.getByRole('button', { name: /Estudos & Concursos/i });
    fireEvent.click(studyObjectiveBtn);

    const continueBtn1 = screen.getByRole('button', { name: /Continuar/i });
    fireEvent.click(continueBtn1);

    // STEP 2: Template de Rotina
    expect(screen.getByText('Escolha seu ponto de partida')).toBeInTheDocument();
    expect(screen.getByText('2. Rotina')).toHaveClass(/stepBadgeActive/);

    const studyTemplateBtn = screen.getByRole('button', {
      name: /Selecionar template Estudos & Concursos/i,
    });
    fireEvent.click(studyTemplateBtn);

    const continueBtn2 = screen.getByRole('button', { name: /Continuar/i });
    fireEvent.click(continueBtn2);

    // STEP 3: Preferências
    expect(screen.getByText('Preferências de Foco & Ambiente')).toBeInTheDocument();
    expect(screen.getByText('3. Preferências')).toHaveClass(/stepBadgeActive/);

    // Alternar tema para claro
    const lightThemeBtn = screen.getByRole('button', { name: /Claro/i });
    fireEvent.click(lightThemeBtn);

    // Alternar pomodoro para 25 min
    const pomodoro25Btn = screen.getByRole('button', { name: /25 min \(Clássico\)/i });
    fireEvent.click(pomodoro25Btn);

    const continueBtn3 = screen.getByRole('button', { name: /Continuar/i });
    fireEvent.click(continueBtn3);

    // STEP 4: Conclusão
    expect(screen.getByText('Tudo pronto, Alex!')).toBeInTheDocument();
    expect(screen.getByText('4. Conclusão')).toHaveClass(/stepBadgeActive/);
    expect(screen.getByText('Estudos & Concursos (6 atividades)')).toBeInTheDocument();

    // Finalizar
    const finishBtn = screen.getByRole('button', { name: /Começar minha jornada no Flow/i });
    fireEvent.click(finishBtn);

    // Verifica que o estado foi atualizado
    const state = useFlowStore.getState();
    expect(state.hasCompletedOnboarding).toBe(true);
    expect(state.userProfile?.name).toBe('Alex');
    expect(state.userProfile?.objective).toBe('study');
    expect(state.theme).toBe('light');
    expect(state.tasks.length).toBe(6);
    expect(state.pomodoro.totalDurationSeconds).toBe(25 * 60);
  });

  it('deve permitir voltar para o passo anterior com o botão Voltar', () => {
    render(<OnboardingWizard />);

    const nameInput = screen.getByPlaceholderText(/Digite seu nome ou apelido/i);
    fireEvent.change(nameInput, { target: { value: 'Lucas' } });

    fireEvent.click(screen.getByRole('button', { name: /Continuar/i }));
    expect(screen.getByText('Escolha seu ponto de partida')).toBeInTheDocument();

    const backBtn = screen.getByRole('button', { name: /Voltar/i });
    fireEvent.click(backBtn);

    expect(screen.getByText('Bem-vindo ao Flow')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Lucas')).toBeInTheDocument();
  });

  it('deve permitir pular configuração com valores recomendados', () => {
    render(<OnboardingWizard />);

    const skipBtn = screen.getByRole('button', { name: /Pular configuração/i });
    fireEvent.click(skipBtn);

    const state = useFlowStore.getState();
    expect(state.hasCompletedOnboarding).toBe(true);
    expect(state.userProfile?.name).toBe('Usuário');
    expect(state.selectedRoutineTypeId).toBe('routine_deep_work');
    expect(state.tasks.length).toBeGreaterThan(0);
  });

  it('deve exibir botão de fechar quando reaberto após já ter completado o onboarding', () => {
    useFlowStore.setState({ hasCompletedOnboarding: true, isOnboardingModalOpen: true });
    render(<OnboardingWizard />);

    const closeBtn = screen.getByRole('button', { name: /Fechar setup/i });
    expect(closeBtn).toBeInTheDocument();

    fireEvent.click(closeBtn);
    expect(useFlowStore.getState().isOnboardingModalOpen).toBe(false);
  });
});
