import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TimelineView } from '../TimelineView';
import { useFlowStore } from '../../store/useFlowStore';
import { Task } from '../../types/routine';

describe('TimelineView Component (Structured Timeline)', () => {
  const mockTasks: Task[] = [
    {
      id: 'task-1',
      title: 'Planejamento Matinal',
      description: 'Definir foco e blocos de trabalho',
      startTime: '08:00',
      endTime: '08:30',
      routineTypeId: 'main',
      categoryId: 'cat_work',
      daysOfWeek: [1, 2, 3, 4, 5],
      targetMinutes: 30,
      tags: [],
      isGoldenRule: true,
    },
    {
      id: 'task-2',
      title: 'Deep Work - Projeto Principal',
      description: 'Construção da arquitetura central',
      startTime: '10:00',
      endTime: '12:00',
      routineTypeId: 'main',
      categoryId: 'cat_work',
      daysOfWeek: [1, 2, 3, 4, 5],
      targetMinutes: 120,
      tags: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    useFlowStore.setState({
      tasks: [...mockTasks],
      selectedDate: '2026-09-24', // Quinta-feira (dayOfWeek: 4)
      logs: {},
      categories: [{ id: 'cat_work', name: 'Trabalho', color: '#6366F1' }],
      activeCategoryIdFilter: 'all',
      routineViewMode: 'timeline',
      isTaskModalOpen: false,
      selectedTaskIdForDetail: null,
    });
  });

  it('deve renderizar o estado vazio quando não houver atividades para o dia', () => {
    useFlowStore.setState({ tasks: [] });

    render(<TimelineView />);

    expect(
      screen.getByText('Nenhuma atividade agendada neste cronograma')
    ).toBeInTheDocument();
    const createBtn = screen.getByRole('button', { name: /Criar Primeira Atividade/i });
    expect(createBtn).toBeInTheDocument();

    fireEvent.click(createBtn);
    expect(useFlowStore.getState().isTaskModalOpen).toBe(true);
  });

  it('deve renderizar as tarefas na linha do tempo com suas métricas e o bloco de intervalo livre', () => {
    render(<TimelineView />);

    // Título e métricas
    expect(screen.getByText('Cronograma Visual')).toBeInTheDocument();
    expect(screen.getByText('Planejamento Matinal')).toBeInTheDocument();
    expect(screen.getByText('REGRA DE OURO')).toBeInTheDocument();
    expect(screen.getByText('Deep Work - Projeto Principal')).toBeInTheDocument();

    // Intervalo livre entre 08:30 e 10:00 (1h 30m)
    expect(screen.getByText(/Intervalo Livre •/i)).toBeInTheDocument();
    expect(screen.getByText(/08:30 - 10:00/i)).toBeInTheDocument();
  });

  it('deve permitir agendar atividade diretamente no intervalo livre', () => {
    render(<TimelineView />);

    const agendarBtn = screen.getByTitle('Agendar nova atividade neste horário livre');
    expect(agendarBtn).toBeInTheDocument();

    fireEvent.click(agendarBtn);

    const state = useFlowStore.getState();
    expect(state.isTaskModalOpen).toBe(true);
    expect(state.editingTask?.startTime).toBe('08:30');
    expect(state.editingTask?.endTime).toBe('10:00');
  });

  it('deve alternar status de conclusão ao clicar no checkbox da tarefa', () => {
    render(<TimelineView />);

    const checkButtons = screen.getAllByTitle('Marcar como concluída');
    expect(checkButtons.length).toBeGreaterThan(0);
    fireEvent.click(checkButtons[0]);

    const logKey = '2026-09-24_task-1';
    expect(useFlowStore.getState().logs[logKey]?.completed).toBe(true);
  });

  it('deve iniciar o Pomodoro ao clicar no botão de Foco da tarefa', () => {
    render(<TimelineView />);

    const focoButtons = screen.getAllByRole('button', { name: /Foco/i });
    expect(focoButtons.length).toBeGreaterThan(0);

    fireEvent.click(focoButtons[0]);

    const pomodoro = useFlowStore.getState().pomodoro;
    expect(pomodoro.isActive).toBe(true);
    expect(pomodoro.linkedTaskId).toBe('task-1');
  });

  it('deve permitir alternar o modo de visualização entre Lista e Cronograma', () => {
    render(<TimelineView showViewToggle={true} />);

    const listaBtn = screen.getByRole('button', { name: /Lista/i });
    expect(listaBtn).toBeInTheDocument();

    fireEvent.click(listaBtn);
    expect(useFlowStore.getState().routineViewMode).toBe('stream');
  });

  it('deve abrir os detalhes da atividade ao clicar no título', () => {
    render(<TimelineView />);

    const taskTitle = screen.getByText('Planejamento Matinal');
    fireEvent.click(taskTitle);

    expect(useFlowStore.getState().selectedTaskIdForDetail).toBe('task-1');
  });
});
