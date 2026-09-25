import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CalendarMonthView } from '../CalendarMonthView';
import { useFlowStore } from '../../store/useFlowStore';
import { Task } from '../../types/routine';

describe('CalendarMonthView Component (Calendário Mensal)', () => {
  const mockTasks: Task[] = [
    {
      id: 'task-1',
      title: 'Planejamento Matinal',
      description: '',
      startTime: '08:00',
      endTime: '08:30',
      routineTypeId: 'main',
      categoryId: 'cat_work',
      daysOfWeek: [1, 2, 3, 4, 5], // Seg a Sex
      targetMinutes: 30,
      tags: [],
    },
    {
      id: 'task-2',
      title: 'Exercício Noturno',
      description: '',
      startTime: '19:00',
      endTime: '20:00',
      routineTypeId: 'main',
      categoryId: 'cat_health',
      daysOfWeek: [4], // Quinta-feira
      targetMinutes: 60,
      tags: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    useFlowStore.setState({
      tasks: [...mockTasks],
      selectedDate: '2026-09-24', // Quinta-feira (dayOfWeek: 4)
      logs: {
        '2026-09-24_task-1': { completed: true },
      },
      categories: [
        { id: 'cat_work', name: 'Trabalho', color: '#6366F1' },
        { id: 'cat_health', name: 'Saúde', color: '#10B981' },
      ],
      activeView: 'calendar',
      isTaskModalOpen: false,
    });
  });

  it('deve renderizar o cabeçalho do mês, navegação e dias da semana', () => {
    render(<CalendarMonthView />);

    expect(screen.getByText('Setembro de 2026')).toBeInTheDocument();
    expect(screen.getByTitle('Mês anterior')).toBeInTheDocument();
    expect(screen.getByTitle('Próximo mês')).toBeInTheDocument();
    expect(screen.getByTitle('Ir para o mês atual')).toBeInTheDocument();

    // Dias da semana
    expect(screen.getByText('Dom')).toBeInTheDocument();
    expect(screen.getByText('Seg')).toBeInTheDocument();
    expect(screen.getByText('Sex')).toBeInTheDocument();
  });

  it('deve navegar para o mês anterior e próximo ao clicar nos botões de navegação', () => {
    render(<CalendarMonthView />);

    const nextBtn = screen.getByTitle('Próximo mês');
    fireEvent.click(nextBtn);
    expect(screen.getByText('Outubro de 2026')).toBeInTheDocument();

    const prevBtn = screen.getByTitle('Mês anterior');
    fireEvent.click(prevBtn);
    expect(screen.getByText('Setembro de 2026')).toBeInTheDocument();
  });

  it('deve exibir a taxa de completude no painel inspetor do dia selecionado', () => {
    render(<CalendarMonthView />);

    expect(
      screen.getByText(/1 de 2 tarefas concluídas \(50%\)/i)
    ).toBeInTheDocument();
  });

  it('deve permitir selecionar outro dia ao clicar na célula da grade', () => {
    render(<CalendarMonthView />);

    const dayCell = screen.getByTestId('calendar-day-2026-09-15');
    fireEvent.click(dayCell);

    expect(useFlowStore.getState().selectedDate).toBe('2026-09-15');
  });

  it('deve alternar a conclusão de uma tarefa no painel do dia', () => {
    render(<CalendarMonthView />);

    // task-2 está pendente no dia 24
    const uncheckButtons = screen.getAllByTitle('Marcar como concluída');
    expect(uncheckButtons.length).toBeGreaterThan(0);

    fireEvent.click(uncheckButtons[0]);

    const logs = useFlowStore.getState().logs;
    expect(logs['2026-09-24_task-2']?.completed).toBe(true);
  });

  it('deve redirecionar para a Rotina e para o Cronograma a partir dos botões de ação do dia', () => {
    render(<CalendarMonthView />);

    const rotinaBtn = screen.getByTitle('Abrir este dia no fluxo diário da Rotina');
    fireEvent.click(rotinaBtn);
    expect(useFlowStore.getState().activeView).toBe('routine');

    useFlowStore.setState({ activeView: 'calendar' });

    const timelineBtn = screen.getByTitle('Abrir este dia no Cronograma Visual');
    fireEvent.click(timelineBtn);
    expect(useFlowStore.getState().activeView).toBe('timeline');
  });

  it('deve abrir o modal de nova atividade a partir do botão do painel', () => {
    render(<CalendarMonthView />);

    const addBtn = screen.getByRole('button', { name: /Nova Atividade/i });
    fireEvent.click(addBtn);

    expect(useFlowStore.getState().isTaskModalOpen).toBe(true);
  });

  it('deve permitir mover uma atividade para o backlog pelo calendário', () => {
    render(<CalendarMonthView />);

    const moveBacklogBtn = screen.getByTestId('calendar-move-backlog-task-1');
    fireEvent.click(moveBacklogBtn);

    expect(screen.getByText('Mover para o Backlog?')).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /Confirmar e Mover/i });
    fireEvent.click(confirmBtn);

    // Tarefa deve ter saído de tasks e estar no backlog
    const state = useFlowStore.getState();
    expect(state.tasks.find((t) => t.id === 'task-1')).toBeUndefined();
    expect(state.backlog.find((b) => b.title === 'Planejamento Matinal')).toBeDefined();
  });

  it('deve permitir excluir uma atividade pelo calendário', () => {
    render(<CalendarMonthView />);

    const deleteBtn = screen.getByTestId('calendar-delete-task-2');
    fireEvent.click(deleteBtn);

    expect(screen.getByText('Excluir Atividade?')).toBeInTheDocument();

    const confirmDeleteBtn = screen.getByRole('button', { name: /Confirmar Exclusão/i });
    fireEvent.click(confirmDeleteBtn);

    // Tarefa deve ter sido removida de tasks
    const state = useFlowStore.getState();
    expect(state.tasks.find((t) => t.id === 'task-2')).toBeUndefined();
  });
});
