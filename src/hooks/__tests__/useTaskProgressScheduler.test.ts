import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useTaskProgressScheduler } from '../useTaskProgressScheduler';
import { useFlowStore } from '../../store/useFlowStore';
import { Task } from '../../types/routine';

const task: Task = {
  id: 'scheduled',
  title: 'Revisar',
  description: '',
  startTime: '10:00',
  endTime: '11:00',
  routineTypeId: 'main_routine',
  categoryId: 'geral',
  targetMinutes: 60,
  daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
  tags: [],
  autoStart: true,
};
const key = '2026-10-03_scheduled';

describe('Agendamento do andamento', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 3, 9, 59, 59));
    useFlowStore.setState({ ...useFlowStore.getInitialState(), tasks: [task], logs: {} });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('aguarda banco pronto, inicia no horário e encerra no final sem interação', () => {
    const { rerender } = renderHook(({ ready }) => useTaskProgressScheduler(ready), {
      initialProps: { ready: false },
    });
    act(() => vi.advanceTimersByTime(1000));
    expect(useFlowStore.getState().logs).toEqual({});
    rerender({ ready: true });
    expect(useFlowStore.getState().logs[key].inProgress).toBe(true);
    vi.setSystemTime(new Date(2026, 9, 3, 10, 59, 59));
    act(() => vi.advanceTimersByTime(1000));
    expect(useFlowStore.getState().logs[key]).toMatchObject({
      inProgress: false,
      completed: false,
    });
  });

  it('recupera o estado após suspensão e limpa os listeners ao desmontar', () => {
    const { unmount } = renderHook(() => useTaskProgressScheduler(true));
    vi.setSystemTime(new Date(2026, 9, 3, 10, 30));
    act(() => window.dispatchEvent(new Event('focus')));
    expect(useFlowStore.getState().logs[key].inProgress).toBe(true);
    vi.setSystemTime(new Date(2026, 9, 3, 11, 30));
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(useFlowStore.getState().logs[key].inProgress).toBe(false);
    unmount();
    const logs = useFlowStore.getState().logs;
    act(() => window.dispatchEvent(new Event('focus')));
    expect(useFlowStore.getState().logs).toBe(logs);
  });
});
