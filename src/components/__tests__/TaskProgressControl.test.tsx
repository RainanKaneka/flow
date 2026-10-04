import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { TaskCard } from '../TaskCard';
import { TaskDetailModal } from '../TaskDetailModal';
import { useFlowStore } from '../../store/useFlowStore';
import { Task, TaskLog } from '../../types/routine';

const date = '2026-10-03';
const task: Task = {
  id: 'task-progress',
  title: 'Revisar projeto',
  description: 'Revisar as entregas de hoje',
  startTime: '10:00',
  endTime: '11:00',
  targetMinutes: 60,
  routineTypeId: 'main',
  categoryId: 'work',
  daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
  tags: [],
};

const makeLog = (updates: Partial<TaskLog>): TaskLog => ({
  id: `${date}_${task.id}`,
  taskId: task.id,
  date,
  completed: false,
  ...updates,
});

describe.each(['card', 'details'] as const)('Progresso da tarefa no %s', (surface) => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 3, 10, 15));
    useFlowStore.setState({
      ...useFlowStore.getInitialState(),
      tasks: [{ ...task }],
      selectedDate: date,
      selectedTaskIdForDetail: task.id,
      categories: [{ id: 'work', name: 'Trabalho', color: '#6366F1' }],
      routineTypes: [{ id: 'main', name: 'Rotina', description: '' }],
      selectedRoutineTypeId: 'main',
      logs: {},
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  const renderSurface = () =>
    render(
      surface === 'card' ? (
        <TaskCard task={useFlowStore.getState().tasks[0]} />
      ) : (
        <TaskDetailModal />
      )
    );

  it('inicia a tarefa, exibe seu andamento e mantém conclusão e Pomodoro independentes', () => {
    renderSurface();

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar tarefa' }));

    expect(screen.getByText('Em andamento')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Iniciar tarefa' })).not.toBeInTheDocument();
    const state = useFlowStore.getState();
    expect(state.logs[`${date}_${task.id}`]).toMatchObject({
      completed: false,
      inProgress: true,
      startedAt: new Date(2026, 9, 3, 10, 15).toISOString(),
    });
    expect(state.pomodoro.isActive).toBe(false);
    expect(state.activeView).toBe('routine');
    expect(
      screen.getByRole('button', {
        name: surface === 'card' ? 'Iniciar Pomodoro nesta tarefa' : 'Focar com Pomodoro',
      })
    ).toBeInTheDocument();
  });

  it.each(['2026-10-02', '2026-10-04'])('não inicia ao consultar a data %s', (selectedDate) => {
    useFlowStore.setState({ selectedDate });
    renderSurface();

    const button = screen.getByRole('button', { name: 'Iniciar tarefa' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(useFlowStore.getState().logs).toEqual({});
  });

  it('não permite iniciar uma ocorrência fora dos dias da tarefa', () => {
    useFlowStore.setState({ tasks: [{ ...task, daysOfWeek: [1] }] });
    renderSurface();

    expect(screen.getByRole('button', { name: 'Iniciar tarefa' })).toBeDisabled();
  });

  it('encerra a indicação de andamento ao chegar ao horário final sem concluir a tarefa', () => {
    vi.setSystemTime(new Date(2026, 9, 3, 11, 0));
    useFlowStore.setState({
      logs: {
        [`${date}_${task.id}`]: makeLog({
          inProgress: true,
          startedAt: new Date(2026, 9, 3, 10, 0).toISOString(),
        }),
      },
    });
    renderSurface();

    expect(screen.queryByText('Em andamento')).not.toBeInTheDocument();
    expect(screen.queryByText('Concluída')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Iniciar tarefa' })).toBeDisabled();
    expect(useFlowStore.getState().logs[`${date}_${task.id}`].completed).toBe(false);
  });

  it('exibe conclusão em vez de andamento e não oferece novo início', () => {
    useFlowStore.setState({
      logs: { [`${date}_${task.id}`]: makeLog({ completed: true, inProgress: true }) },
    });
    renderSurface();

    expect(screen.getByText('Concluída')).toBeInTheDocument();
    expect(screen.queryByText('Em andamento')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Iniciar tarefa' })).not.toBeInTheDocument();
  });

  it('revalida o horário ao clicar mesmo antes da próxima atualização visual', () => {
    renderSurface();
    const button = screen.getByRole('button', { name: 'Iniciar tarefa' });
    expect(button).toBeEnabled();
    vi.setSystemTime(new Date(2026, 9, 3, 11, 0));

    fireEvent.click(button);

    expect(useFlowStore.getState().logs).toEqual({});
  });

  it('atualiza o andamento na tela aberta quando chega o horário final', () => {
    renderSurface();
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar tarefa' }));
    expect(screen.getByText('Em andamento')).toBeInTheDocument();
    vi.setSystemTime(new Date(2026, 9, 3, 11, 0));
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.queryByText('Em andamento')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Iniciar tarefa' })).toBeDisabled();
  });
});
