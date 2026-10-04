import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { TimelineView } from '../TimelineView';
import { CalendarMonthView } from '../CalendarMonthView';
import { PomodoroView } from '../PomodoroView';
import { useFlowStore } from '../../store/useFlowStore';
import { Task } from '../../types/routine';

const task: Task = {
  id: 'running',
  title: 'Estudar',
  description: '',
  startTime: '10:00',
  endTime: '11:00',
  routineTypeId: 'main_routine',
  categoryId: 'geral',
  targetMinutes: 60,
  daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
  tags: [],
};
const date = '2026-10-03';
const key = `${date}_${task.id}`;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 3, 10, 15));
  useFlowStore.setState({
    ...useFlowStore.getInitialState(),
    tasks: [task],
    logs: {},
    selectedDate: date,
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe.each(['timeline', 'calendar'] as const)('Andamento em %s', (view) => {
  const renderView = () => render(view === 'timeline' ? <TimelineView /> : <CalendarMonthView />);
  const getTaskRow = () =>
    within(
      screen.getByTestId(
        view === 'timeline' ? `timeline-task-${task.id}` : `calendar-inspector-task-${task.id}`
      )
    );

  it('oferece início explícito e distingue andamento, horário atual e conclusão', () => {
    renderView();
    const row = getTaskRow();
    expect(row.queryByText('Em andamento')).not.toBeInTheDocument();
    fireEvent.click(row.getByRole('button', { name: 'Iniciar tarefa' }));
    expect(row.getByText('Em andamento')).toBeInTheDocument();
    expect(useFlowStore.getState().logs[key]).toMatchObject({ inProgress: true, completed: false });
    fireEvent.click(row.getByTitle('Marcar como concluída'));
    expect(row.queryByText('Em andamento')).not.toBeInTheDocument();
    expect(row.getByText('Concluída')).toBeInTheDocument();
  });

  it('não oferece início em datas futuras nem mostra andamento de outro dia', () => {
    useFlowStore.setState({
      selectedDate: '2026-10-04',
      logs: { [key]: { id: key, taskId: task.id, date, completed: false, inProgress: true } },
    });
    renderView();
    expect(getTaskRow().queryByText('Em andamento')).not.toBeInTheDocument();
    expect(getTaskRow().getByRole('button', { name: 'Iniciar tarefa' })).toBeDisabled();
  });
});

it('mostra andamento ao iniciar um Pomodoro vinculado à atividade', () => {
  useFlowStore.getState().linkTaskToPomodoro(task.id);
  render(<PomodoroView />);
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar Foco' }));
  expect(screen.getByText('Em andamento')).toBeInTheDocument();
  expect(useFlowStore.getState().logs[key]).toMatchObject({ inProgress: true, completed: false });
});
