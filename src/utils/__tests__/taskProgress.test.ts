import { describe, expect, it } from 'vitest';
import { Task, TaskLog } from '../../types/routine';
import {
  canStartTask,
  getCurrentTaskDate,
  getTaskProgressStatus,
  getTaskTimeWindow,
} from '../taskProgress';

const task: Task = {
  id: 'a',
  title: 'Trabalho',
  description: '',
  startTime: '10:00',
  endTime: '11:00',
  routineTypeId: 'main',
  categoryId: 'general',
  daysOfWeek: [6],
  targetMinutes: 60,
  tags: [],
};
const date = '2026-10-03';
const log: TaskLog = { id: `${date}_a`, taskId: 'a', date, completed: false, inProgress: true };

describe('Status e horário da ocorrência', () => {
  it('valida data, recorrência e horários sem normalizar valores inválidos', () => {
    expect(getTaskTimeWindow(task, '2026-02-30')).toBeNull();
    expect(getTaskTimeWindow(task, '2026-10-04')).toBeNull();
    expect(getTaskTimeWindow({ ...task, startTime: '25:00' }, date)).toBeNull();
    expect(getTaskTimeWindow({ ...task, endTime: '10:00' }, date)).toBeNull();
    expect(getTaskTimeWindow({ ...task, specificDate: date, daysOfWeek: [] }, date)).not.toBeNull();
  });

  it('diferencia janela de horário de andamento e expira exatamente no término', () => {
    const now = new Date(2026, 9, 3, 10, 30);
    expect(getTaskProgressStatus(task, undefined, date, now)).toBe('pending');
    expect(getTaskProgressStatus(task, log, date, now)).toBe('in_progress');
    expect(getTaskProgressStatus(task, { ...log, completed: true }, date, now)).toBe('completed');
    expect(getTaskProgressStatus(task, log, date, new Date(2026, 9, 3, 11))).toBe('pending');
    expect(getTaskProgressStatus(task, log, date, new Date(2026, 9, 4, 10, 30))).toBe('pending');
  });

  it('só inicia automaticamente dentro do intervalo e respeita ocorrências já iniciadas', () => {
    const automatic = { ...task, autoStart: true };
    expect(getTaskProgressStatus(automatic, undefined, date, new Date(2026, 9, 3, 9, 59))).toBe(
      'pending'
    );
    expect(getTaskProgressStatus(automatic, undefined, date, new Date(2026, 9, 3, 10))).toBe(
      'in_progress'
    );
    expect(getTaskProgressStatus(automatic, undefined, date, new Date(2026, 9, 3, 11))).toBe(
      'pending'
    );
    expect(
      getTaskProgressStatus(
        automatic,
        { ...log, inProgress: false, startedAt: '2026-10-03T13:00:00Z' },
        date,
        new Date(2026, 9, 3, 10, 30)
      )
    ).toBe('pending');
  });

  it('resolve a data original de tarefas que atravessam a meia-noite', () => {
    const overnight = { ...task, startTime: '23:00', endTime: '01:00' };
    const now = new Date(2026, 9, 4, 0, 30);
    expect(getCurrentTaskDate(overnight, now)).toBe(date);
    expect(canStartTask(overnight, date, now)).toBe(true);
    expect(getTaskProgressStatus(overnight, log, date, now)).toBe('in_progress');
    expect(canStartTask(overnight, date, new Date(2026, 9, 4, 1))).toBe(false);
    expect(canStartTask(task, '2026-10-10', now)).toBe(false);
  });
});
