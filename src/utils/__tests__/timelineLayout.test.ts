import { describe, it, expect } from 'vitest';
import {
  buildTimelineItems,
  calculateTimelineSummary,
  formatDurationHuman,
} from '../timelineLayout';
import { Task, TaskLog } from '../../types/routine';

const makeTask = (id: string, startTime: string, endTime: string, title = id): Task => ({
  id,
  title,
  description: '',
  startTime,
  endTime,
  routineTypeId: 'main',
  categoryId: 'cat_1',
  daysOfWeek: [1, 2, 3, 4, 5],
  targetMinutes: 30,
  tags: [],
});

describe('timelineLayout utility', () => {
  it('formatDurationHuman deve formatar corretamente minutos', () => {
    expect(formatDurationHuman(0)).toBe('0m');
    expect(formatDurationHuman(45)).toBe('45m');
    expect(formatDurationHuman(60)).toBe('1h');
    expect(formatDurationHuman(90)).toBe('1h 30m');
    expect(formatDurationHuman(150)).toBe('2h 30m');
  });

  it('buildTimelineItems deve retornar vazio para lista vazia', () => {
    expect(buildTimelineItems([], {}, '2026-09-24')).toEqual([]);
  });

  it('buildTimelineItems deve gerar itens contínuos e detectar tarefas concluídas', () => {
    const t1 = makeTask('t1', '08:00', '09:00', 'Café & Planejamento');
    const t2 = makeTask('t2', '09:00', '10:00', 'Reunião de Alinhamento');

    const logs: Record<string, TaskLog> = {
      '2026-09-24_t1': { id: '2026-09-24_t1', taskId: 't1', date: '2026-09-24', completed: true, completedAt: '08:55', timeSpentMinutes: 55 },
    };

    const items = buildTimelineItems([t1, t2], logs, '2026-09-24', new Date(2026, 8, 24, 9, 30));

    expect(items.length).toBe(2);
    expect(items[0].type).toBe('task');
    expect(items[0]).toMatchObject({ status: 'completed' });

    expect(items[1].type).toBe('task');
    expect(items[1]).toMatchObject({ status: 'pending', isCurrent: true });
  });

  it('buildTimelineItems deve intercalar blocos de intervalo livre quando houver gap >= 10m', () => {
    const t1 = makeTask('t1', '09:00', '10:00');
    // Gap de 2 horas (10:00 às 12:00)
    const t2 = makeTask('t2', '12:00', '13:00');

    const items = buildTimelineItems([t1, t2], {}, '2026-09-24', new Date(2026, 8, 24, 11));

    expect(items.length).toBe(3);
    expect(items[0].type).toBe('task');
    expect(items[1].type).toBe('interval');
    expect(items[1].startTime).toBe('10:00');
    expect(items[1].endTime).toBe('12:00');
    expect(items[1].durationMinutes).toBe(120);
    expect(items[1].isCurrent).toBe(true); // 11:00 está no intervalo

    expect(items[2].type).toBe('task');
    expect(items[2]).toMatchObject({ status: 'pending' });
  });

  it('calculateTimelineSummary deve computar métricas consolidadas', () => {
    const t1 = makeTask('t1', '08:00', '09:00'); // 60m
    const t2 = makeTask('t2', '10:00', '11:00'); // 60m (com 60m de gap)

    const logs: Record<string, TaskLog> = {
      '2026-09-24_t1': { id: '2026-09-24_t1', taskId: 't1', date: '2026-09-24', completed: true },
    };

    const items = buildTimelineItems([t1, t2], logs, '2026-09-24');
    const summary = calculateTimelineSummary(items);

    expect(summary.totalTasks).toBe(2);
    expect(summary.completedTasks).toBe(1);
    expect(summary.totalPlannedMinutes).toBe(120);
    expect(summary.completedMinutes).toBe(60);
    expect(summary.freeMinutes).toBe(60);
    expect(summary.completionRate).toBe(50);
  });

  it('separa início manual da janela do cronograma e dá precedência à conclusão', () => {
    const task = makeTask('t1', '10:00', '11:00');
    const log: TaskLog = {
      id: '2026-09-24_t1', taskId: 't1', date: '2026-09-24',
      completed: false, inProgress: true, startedAt: new Date(2026, 8, 24, 9).toISOString(),
    };
    const now = new Date(2026, 8, 24, 9, 30);

    expect(buildTimelineItems([task], { [log.id]: log }, log.date, now)[0]).toMatchObject({
      status: 'in_progress', isCurrent: false,
    });
    expect(buildTimelineItems([task], { [log.id]: { ...log, completed: true } }, log.date, now)[0]).toMatchObject({
      status: 'completed', isCurrent: false,
    });
    expect(buildTimelineItems([task], { [log.id]: log }, log.date, new Date(2026, 8, 24, 11))[0]).toMatchObject({
      status: 'pending', isCurrent: false,
    });
  });

  it('exibe início automático apenas na ocorrência atual, dentro do horário', () => {
    const task = { ...makeTask('t1', '10:00', '11:00'), autoStart: true };
    const now = new Date(2026, 8, 24, 10, 30);
    expect(buildTimelineItems([task], {}, '2026-09-24', now)[0]).toMatchObject({
      status: 'in_progress', isCurrent: true,
    });
    expect(buildTimelineItems([task], {}, '2026-09-25', now)[0]).toMatchObject({
      status: 'pending', isCurrent: false,
    });
  });
});
