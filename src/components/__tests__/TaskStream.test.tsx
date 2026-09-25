import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskStream } from '../TaskStream';
import { useFlowStore } from '../../store/useFlowStore';
import { Task } from '../../types/routine';

describe('TaskStream Component', () => {
  const mockTasks: Task[] = [
    {
      id: 'task-1',
      title: 'Planejamento Diário',
      description: 'Definir metas e blocos',
      startTime: '08:00',
      endTime: '08:30',
      routineTypeId: 'main',
      categoryId: 'cat_work',
      daysOfWeek: [1, 2, 3, 4, 5],
      targetMinutes: 30,
      tags: [],
    },
    {
      id: 'task-2',
      title: 'Deep Work - Projeto Principal',
      description: 'Foco total sem interrupções',
      startTime: '08:30',
      endTime: '11:00',
      routineTypeId: 'main',
      categoryId: 'cat_work',
      daysOfWeek: [1, 2, 3, 4, 5],
      targetMinutes: 150,
      tags: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    useFlowStore.setState({
      tasks: [...mockTasks],
      selectedDate: '2026-09-24',
      logs: {},
      categories: [
        { id: 'cat_work', name: 'Trabalho', color: '#6366F1' },
      ],
      isTaskModalOpen: false,
    });
  });

  it('deve renderizar o estado vazio quando a lista de tarefas estiver vazia', () => {
    render(<TaskStream tasks={[]} />);

    expect(screen.getByText('Nenhuma atividade para este dia')).toBeInTheDocument();
    const createBtn = screen.getByRole('button', { name: /Criar Primeira Atividade/i });
    expect(createBtn).toBeInTheDocument();

    fireEvent.click(createBtn);
    expect(useFlowStore.getState().isTaskModalOpen).toBe(true);
  });

  it('deve renderizar a lista de tarefas e a instrução de drag-and-drop quando houver mais de uma tarefa', () => {
    render(<TaskStream tasks={mockTasks} />);

    expect(screen.getByText('Planejamento Diário')).toBeInTheDocument();
    expect(screen.getByText('Deep Work - Projeto Principal')).toBeInTheDocument();
    expect(
      screen.getByText(/Arraste pelo ícone ⋮⋮ para reordenar a sequência e recalcular horários/i)
    ).toBeInTheDocument();
  });

  it('deve permitir ajustar horário rapidamente usando os botões -15m e +15m', () => {
    render(<TaskStream tasks={mockTasks} />);

    // Clica no botão +15m da primeira tarefa
    const shiftButtons = screen.getAllByRole('button', { name: /Adiantar 15 minutos/i });
    expect(shiftButtons.length).toBeGreaterThan(0);

    // Encontra o botão de adiantar ou atrasar
    const minusBtn = screen.getAllByTitle(/Adiantar horário em 15 minutos/i)[0];
    fireEvent.click(minusBtn);

    const updatedTask = useFlowStore.getState().tasks.find((t) => t.id === 'task-1');
    expect(updatedTask?.startTime).toBe('07:45');
    expect(updatedTask?.endTime).toBe('08:15');
  });

  it('deve disparar reorderTasks e reorganizar a rotina ao arrastar e soltar uma tarefa sobre outra', () => {
    const reorderSpy = vi.fn(useFlowStore.getState().reorderTasks);
    useFlowStore.setState({ reorderTasks: reorderSpy });

    render(<TaskStream tasks={mockTasks} />);

    const card1 = screen.getByTestId('task-card-task-1');
    const card2 = screen.getByTestId('task-card-task-2');

    // Simula evento de dragStart em task-1
    const dataTransfer = {
      effectAllowed: 'none',
      dropEffect: 'none',
      data: {} as Record<string, string>,
      setData: vi.fn((key: string, val: string) => {
        dataTransfer.data[key] = val;
      }),
      getData: vi.fn((key: string) => dataTransfer.data[key] || ''),
    };

    fireEvent.dragStart(card1, { dataTransfer });
    expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', 'task-1');

    // Simula dragOver em task-2
    fireEvent.dragOver(card2, { dataTransfer });

    // Simula drop em task-2
    fireEvent.drop(card2, { dataTransfer });

    expect(reorderSpy).toHaveBeenCalledWith('task-1', 'task-2', ['task-1', 'task-2']);
  });
});
