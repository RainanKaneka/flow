import { describe, it, expect } from 'vitest';
import { reorderAndRescheduleTasks, shiftTaskTime } from '../taskReorder';
import { Task } from '../../types/routine';

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

describe('taskReorder - reorderAndRescheduleTasks', () => {
  it('deve retornar inalterado se houver menos de 2 tarefas ou se source for igual a target', () => {
    const t1 = makeTask('t1', '08:00', '09:00');
    expect(reorderAndRescheduleTasks([t1], 't1', 't1').hasChanges).toBe(false);

    const t2 = makeTask('t2', '09:00', '10:00');
    expect(reorderAndRescheduleTasks([t1, t2], 't1', 't1').hasChanges).toBe(false);
  });

  it('deve retornar inalterado se IDs não existirem na lista', () => {
    const t1 = makeTask('t1', '08:00', '09:00');
    const t2 = makeTask('t2', '09:00', '10:00');
    expect(reorderAndRescheduleTasks([t1, t2], 't1', 't_inexistente').hasChanges).toBe(false);
  });

  it('deve reordenar uma tarefa para o topo e reajustar os horários subsequentes', () => {
    // T1: 08:30 - 09:00 (30m)
    // T2: 09:00 - 11:30 (150m)
    // T3: 11:30 - 12:00 (30m)
    const t1 = makeTask('t1', '08:30', '09:00', 'Planejamento');
    const t2 = makeTask('t2', '09:00', '11:30', 'Deep Work');
    const t3 = makeTask('t3', '11:30', '12:00', 'Comunicação');

    // Move T3 para o topo (posição de T1)
    const result = reorderAndRescheduleTasks([t1, t2, t3], 't3', 't1');

    expect(result.hasChanges).toBe(true);
    expect(result.updatedTasks.map((t) => t.id)).toEqual(['t3', 't1', 't2']);

    // T3 deve começar em 08:30 e durar 30m -> 09:00
    expect(result.updatedTasks[0].startTime).toBe('08:30');
    expect(result.updatedTasks[0].endTime).toBe('09:00');

    // T1 deve começar em 09:00 e durar 30m -> 09:30
    expect(result.updatedTasks[1].startTime).toBe('09:00');
    expect(result.updatedTasks[1].endTime).toBe('09:30');

    // T2 deve começar em 09:30 e durar 150m -> 12:00
    expect(result.updatedTasks[2].startTime).toBe('09:30');
    expect(result.updatedTasks[2].endTime).toBe('12:00');
  });

  it('deve reordenar uma tarefa para o final e reajustar a ordem cronológica', () => {
    const t1 = makeTask('t1', '08:00', '09:00'); // 60m
    const t2 = makeTask('t2', '09:00', '10:00'); // 60m
    const t3 = makeTask('t3', '10:00', '11:00'); // 60m

    // Move T1 para o final (posição de T3)
    const result = reorderAndRescheduleTasks([t1, t2, t3], 't1', 't3');

    expect(result.hasChanges).toBe(true);
    expect(result.updatedTasks.map((t) => t.id)).toEqual(['t2', 't3', 't1']);

    // T2 começa em 08:00 -> 09:00
    expect(result.updatedTasks[0].startTime).toBe('08:00');
    expect(result.updatedTasks[0].endTime).toBe('09:00');

    // T3 começa em 09:00 -> 10:00
    expect(result.updatedTasks[1].startTime).toBe('09:00');
    expect(result.updatedTasks[1].endTime).toBe('10:00');

    // T1 começa em 10:00 -> 11:00
    expect(result.updatedTasks[2].startTime).toBe('10:00');
    expect(result.updatedTasks[2].endTime).toBe('11:00');
  });

  it('deve preservar intervalos naturais (gaps) que não colidem', () => {
    const t1 = makeTask('t1', '09:00', '10:00');
    const t2 = makeTask('t2', '10:00', '11:00');
    // Almoço das 11:00 às 13:00
    const t3 = makeTask('t3', '13:00', '14:00');

    // Move T2 para a posição de T1
    const result = reorderAndRescheduleTasks([t1, t2, t3], 't2', 't1');

    expect(result.updatedTasks.map((t) => t.id)).toEqual(['t2', 't1', 't3']);

    // T2: 09:00 -> 10:00
    expect(result.updatedTasks[0].startTime).toBe('09:00');
    expect(result.updatedTasks[0].endTime).toBe('10:00');

    // T1: 10:00 -> 11:00
    expect(result.updatedTasks[1].startTime).toBe('10:00');
    expect(result.updatedTasks[1].endTime).toBe('11:00');

    // T3: continua às 13:00 -> 14:00 porque não colide com 11:00
    expect(result.updatedTasks[2].startTime).toBe('13:00');
    expect(result.updatedTasks[2].endTime).toBe('14:00');
  });

  it('deve deslocar tarefa com shiftTaskTime', () => {
    const t1 = makeTask('t1', '10:00', '11:00'); // 60 min

    const shiftedPlus = shiftTaskTime(t1, 15);
    expect(shiftedPlus.startTime).toBe('10:15');
    expect(shiftedPlus.endTime).toBe('11:15');

    const shiftedMinus = shiftTaskTime(t1, -30);
    expect(shiftedMinus.startTime).toBe('09:30');
    expect(shiftedMinus.endTime).toBe('10:30');
  });
});
