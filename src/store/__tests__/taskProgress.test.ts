import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFlowStore } from '../useFlowStore';
import { Task } from '../../types/routine';

const date = '2026-10-03';
const key = `${date}_activity`;
const activity: Task = {
  id: 'activity',
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

describe('Execução diária de tarefas', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 3, 9, 50));
    useFlowStore.setState({
      ...useFlowStore.getInitialState(),
      tasks: [{ ...activity }],
      logs: {},
      selectedDate: date,
    });
  });
  afterEach(() => vi.useRealTimers());

  it('permite antecipar o início e encerra no horário final sem concluir ou perder histórico', () => {
    useFlowStore.setState({
      logs: {
        [key]: { id: key, taskId: activity.id, date, completed: false, timeSpentMinutes: 20 },
      },
    });
    useFlowStore.getState().startTask(activity.id, date);
    const startedAt = useFlowStore.getState().logs[key].startedAt;
    expect(useFlowStore.getState().logs[key]).toMatchObject({
      completed: false,
      inProgress: true,
      timeSpentMinutes: 20,
    });
    vi.setSystemTime(new Date(2026, 9, 3, 11));
    useFlowStore.getState().refreshTaskProgress();
    expect(useFlowStore.getState().logs[key]).toMatchObject({
      completed: false,
      inProgress: false,
      startedAt,
      timeSpentMinutes: 20,
    });
    useFlowStore.getState().startTask(activity.id, date);
    expect(useFlowStore.getState().logs[key].inProgress).toBe(false);
  });

  it('rejeita outras datas, dias não programados e tarefas concluídas', () => {
    useFlowStore.getState().startTask(activity.id, '2026-10-04');
    useFlowStore.getState().startTask(activity.id, '2026-10-02');
    expect(useFlowStore.getState().logs).toEqual({});
    useFlowStore.setState({ tasks: [{ ...activity, daysOfWeek: [1] }] });
    useFlowStore.getState().startTask(activity.id);
    expect(useFlowStore.getState().logs).toEqual({});
    useFlowStore.setState({ tasks: [activity] });
    useFlowStore.getState().toggleTaskCompletion(activity.id);
    useFlowStore.getState().startTask(activity.id);
    expect(useFlowStore.getState().logs[key]).toMatchObject({ completed: true, inProgress: false });
  });

  it('inicia automaticamente somente tarefas optantes no horário real, sem depender da navegação', () => {
    useFlowStore.setState({
      tasks: [
        { ...activity, autoStart: true },
        { ...activity, id: 'manual' },
      ],
      selectedDate: '2026-10-20',
    });
    useFlowStore.getState().refreshTaskProgress();
    expect(useFlowStore.getState().logs).toEqual({});
    vi.setSystemTime(new Date(2026, 9, 3, 10));
    useFlowStore.getState().refreshTaskProgress();
    expect(useFlowStore.getState().logs[key]).toMatchObject({
      inProgress: true,
      completed: false,
      date,
    });
    expect(useFlowStore.getState().logs[`${date}_manual`]).toBeUndefined();
    const logs = useFlowStore.getState().logs;
    useFlowStore.getState().refreshTaskProgress();
    expect(useFlowStore.getState().logs).toBe(logs);
  });

  it('retoma o agendamento ao abrir durante o horário e não reinicia uma conclusão desmarcada', () => {
    useFlowStore.setState({ tasks: [{ ...activity, autoStart: true }] });
    vi.setSystemTime(new Date(2026, 9, 3, 10, 30));
    useFlowStore.getState().refreshTaskProgress();
    useFlowStore.getState().toggleTaskCompletion(activity.id);
    expect(useFlowStore.getState().logs[key]).toMatchObject({ completed: true, inProgress: false });
    useFlowStore.getState().toggleTaskCompletion(activity.id);
    useFlowStore.getState().refreshTaskProgress();
    expect(useFlowStore.getState().logs[key]).toMatchObject({
      completed: false,
      inProgress: false,
    });
  });

  it('mantém ocorrências separadas a cada dia e encerra registros vencidos após reabrir', () => {
    useFlowStore.setState({ tasks: [{ ...activity, autoStart: true }] });
    vi.setSystemTime(new Date(2026, 9, 3, 10, 30));
    useFlowStore.getState().refreshTaskProgress();
    vi.setSystemTime(new Date(2026, 9, 4, 10, 30));
    useFlowStore.getState().refreshTaskProgress();
    expect(useFlowStore.getState().logs[key].inProgress).toBe(false);
    expect(useFlowStore.getState().logs['2026-10-04_activity']).toMatchObject({
      inProgress: true,
      completed: false,
    });
  });

  it('mantém andamento da noite anterior até o término após a meia-noite', () => {
    useFlowStore.setState({
      tasks: [{ ...activity, autoStart: true, startTime: '23:30', endTime: '00:30' }],
    });
    vi.setSystemTime(new Date(2026, 9, 4, 0, 10));
    useFlowStore.getState().refreshTaskProgress();
    expect(useFlowStore.getState().logs[key]).toMatchObject({ inProgress: true, date });
    vi.setSystemTime(new Date(2026, 9, 4, 0, 30));
    useFlowStore.getState().refreshTaskProgress();
    expect(useFlowStore.getState().logs[key].inProgress).toBe(false);
    expect(useFlowStore.getState().logs['2026-10-04_activity']).toBeUndefined();
  });

  it('inicia tarefa ao iniciar foco vinculado e preserva progresso ao registrar os minutos', () => {
    useFlowStore.setState({ selectedDate: '2026-11-01' });
    useFlowStore.getState().startPomodoro(activity.id);
    expect(useFlowStore.getState().logs[key]).toMatchObject({ inProgress: true, completed: false });
    expect(useFlowStore.getState().pomodoro.linkedTaskDate).toBe(date);
    const startedAt = useFlowStore.getState().logs[key].startedAt;
    useFlowStore.getState().pausePomodoro();
    expect(useFlowStore.getState().logs[key].inProgress).toBe(true);
    useFlowStore.getState().finishPomodoroSession();
    expect(useFlowStore.getState().logs[key]).toMatchObject({
      inProgress: true,
      startedAt,
      timeSpentMinutes: 25,
    });
    expect(useFlowStore.getState().logs['2026-11-01_activity']).toBeUndefined();
  });

  it('vincular tarefa durante foco ativo também inicia, mas pausas e tarefas vencidas não iniciam', () => {
    useFlowStore.getState().startPomodoro();
    useFlowStore.getState().linkTaskToPomodoro(activity.id);
    expect(useFlowStore.getState().logs[key].inProgress).toBe(true);
    useFlowStore.setState({ logs: {} });
    useFlowStore.getState().setPomodoroMode('shortBreak');
    useFlowStore.getState().startPomodoro(activity.id);
    expect(useFlowStore.getState().logs).toEqual({});
    vi.setSystemTime(new Date(2026, 9, 3, 11));
    useFlowStore.getState().setPomodoroMode('focus');
    useFlowStore.getState().startPomodoro(activity.id);
    expect(useFlowStore.getState().logs).toEqual({});
  });
});
