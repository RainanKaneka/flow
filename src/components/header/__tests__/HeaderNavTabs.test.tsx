import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HeaderNavTabs } from '../HeaderNavTabs';

describe('HeaderNavTabs', () => {
  it('deve renderizar todas as abas de navegação corretamente', () => {
    const handleSelectView = vi.fn();
    render(
      <HeaderNavTabs
        activeView="routine"
        onSelectView={handleSelectView}
        pomodoroActive={false}
        pomodoroTimeStr="25:00"
        notesCount={3}
        backlogCount={5}
      />
    );

    expect(screen.getByText('Rotina')).toBeInTheDocument();
    expect(screen.getByText('Cronograma')).toBeInTheDocument();
    expect(screen.getByText('Calendário')).toBeInTheDocument();
    expect(screen.getByText('Pomodoro')).toBeInTheDocument();
    expect(screen.getByText('Notas')).toBeInTheDocument();
    expect(screen.getByText('Backlog')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('IA')).toBeInTheDocument();

    // Badges de contador
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('deve chamar onSelectView com a aba correta ao clicar', () => {
    const handleSelectView = vi.fn();
    render(
      <HeaderNavTabs
        activeView="routine"
        onSelectView={handleSelectView}
        pomodoroActive={false}
        pomodoroTimeStr="25:00"
        notesCount={0}
        backlogCount={0}
      />
    );

    fireEvent.click(screen.getByText('Dashboard'));
    expect(handleSelectView).toHaveBeenCalledWith('dashboard');

    fireEvent.click(screen.getByText('Pomodoro'));
    expect(handleSelectView).toHaveBeenCalledWith('pomodoro');
  });

  it('deve exibir badge de tempo live quando o Pomodoro estiver ativo', () => {
    render(
      <HeaderNavTabs
        activeView="routine"
        onSelectView={vi.fn()}
        pomodoroActive={true}
        pomodoroTimeStr="18:42"
        notesCount={0}
        backlogCount={0}
      />
    );

    expect(screen.getByText('18:42')).toBeInTheDocument();
  });
});
