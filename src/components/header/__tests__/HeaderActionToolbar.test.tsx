import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HeaderActionToolbar } from '../HeaderActionToolbar';

describe('HeaderActionToolbar Component', () => {
  const defaultProps = {
    activeView: 'routine',
    pomodoroActive: false,
    pomodoroTimeStr: '25:00',
    onOpenPomodoro: vi.fn(),
    availableUpdate: null,
    onOpenUpdateModal: vi.fn(),
    googleUser: null,
    geminiConfig: { apiKey: '', model: 'gemini-2.5-flash', isConnected: false },
    onOpenGoogleAuthModal: vi.fn(),
    reminderEnabled: true,
    onOpenNotificationModal: vi.fn(),
    onOpenBackupModal: vi.fn(),
    onOpenOnboardingModal: vi.fn(),
    onOpenGlobalSearch: vi.fn(),
    theme: 'dark' as const,
    onToggleTheme: vi.fn(),
    onOpenNewTaskModal: vi.fn(),
  };

  it('deve renderizar o botão de pesquisa global com atalho Ctrl+K e disparar callback ao clicar', () => {
    const onOpenGlobalSearch = vi.fn();
    render(<HeaderActionToolbar {...defaultProps} onOpenGlobalSearch={onOpenGlobalSearch} />);

    const searchBtn = screen.getByTestId('header-global-search-btn');
    expect(searchBtn).toBeInTheDocument();
    expect(screen.getByText('Buscar...')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+K')).toBeInTheDocument();

    fireEvent.click(searchBtn);
    expect(onOpenGlobalSearch).toHaveBeenCalledTimes(1);
  });

  it('deve disparar abertura de nova tarefa ao clicar no botão de Nova Atividade', () => {
    const onOpenNewTaskModal = vi.fn();
    render(<HeaderActionToolbar {...defaultProps} onOpenNewTaskModal={onOpenNewTaskModal} />);

    const newTaskBtn = screen.getByText('Nova Atividade');
    fireEvent.click(newTaskBtn);
    expect(onOpenNewTaskModal).toHaveBeenCalledTimes(1);
  });

  it('deve alternar tema ao clicar no botão de tema', () => {
    const onToggleTheme = vi.fn();
    render(<HeaderActionToolbar {...defaultProps} onToggleTheme={onToggleTheme} />);

    const themeBtn = screen.getByTitle('Mudar para Modo Claro');
    fireEvent.click(themeBtn);
    expect(onToggleTheme).toHaveBeenCalledTimes(1);
  });
});
