import { describe, it, expect } from 'vitest';
import { timeToMinutes, minutesToTime, calculateReplanSchedule } from '../routineReplan';
import { Task } from '../../types/routine';

describe('routineReplan utility', () => {
  describe('timeToMinutes', () => {
    it('deve converter strings de horário válidas para minutos', () => {
      expect(timeToMinutes('00:00')).toBe(0);
      expect(timeToMinutes('01:30')).toBe(90);
      expect(timeToMinutes('08:45')).toBe(525);
      expect(timeToMinutes('14:00')).toBe(840);
      expect(timeToMinutes('23:59')).toBe(1439);
    });

    it('deve retornar 0 para entradas inválidas ou vazias', () => {
      expect(timeToMinutes('')).toBe(0);
      expect(timeToMinutes('invalido')).toBe(0);
      expect(timeToMinutes('12')).toBe(0);
    });
  });

  describe('minutesToTime', () => {
    it('deve converter minutos para formato HH:mm formatado com zero à esquerda', () => {
      expect(minutesToTime(0)).toBe('00:00');
      expect(minutesToTime(90)).toBe('01:30');
      expect(minutesToTime(525)).toBe('08:45');
      expect(minutesToTime(840)).toBe('14:00');
      expect(minutesToTime(1439)).toBe('23:59');
    });

    it('deve limitar valores negativos a 00:00 e excessos a 23:59', () => {
      expect(minutesToTime(-50)).toBe('00:00');
      expect(minutesToTime(2000)).toBe('23:59');
    });
  });

  describe('calculateReplanSchedule', () => {
    const mockTasks: Task[] = [
      {
        id: 'task-1',
        routineTypeId: 'main_routine',
        title: 'Café da manhã',
        startTime: '08:00',
        endTime: '08:30',
        targetMinutes: 30,
        daysOfWeek: [1, 2, 3, 4, 5],
        categoryId: 'saude',
        isGoldenRule: true,
      },
      {
        id: 'task-2',
        routineTypeId: 'main_routine',
        title: 'Deep Work - Projeto Flow',
        startTime: '09:00',
        endTime: '11:00',
        targetMinutes: 120,
        daysOfWeek: [1, 2, 3, 4, 5],
        categoryId: 'trabalho',
        isGoldenRule: false,
      },
      {
        id: 'task-3',
        routineTypeId: 'main_routine',
        title: 'Almoço',
        startTime: '12:00',
        endTime: '13:00',
        targetMinutes: 60,
        daysOfWeek: [1, 2, 3, 4, 5],
        categoryId: 'saude',
        isGoldenRule: false,
      },
    ];

    it('deve retornar diffs vazios se lista de tarefas estiver vazia ou delay <= 0', () => {
      const emptyResult = calculateReplanSchedule({
        tasks: [],
        delayMinutes: 30,
      });
      expect(emptyResult.diffs).toHaveLength(0);
      expect(emptyResult.summary).toBe('Nenhuma alteração necessária.');

      const noDelayResult = calculateReplanSchedule({
        tasks: mockTasks,
        delayMinutes: 0,
      });
      expect(noDelayResult.diffs).toHaveLength(0);
      expect(noDelayResult.summary).toBe('Nenhuma alteração necessária.');
    });

    it('deve replanejar tarefas a partir do horário de referência especificado', () => {
      const result = calculateReplanSchedule({
        tasks: mockTasks,
        delayMinutes: 30,
        referenceTime: '09:00',
      });

      // Apenas task-2 e task-3 iniciam >= 09:00
      expect(result.diffs).toHaveLength(2);

      const diffTask2 = result.diffs.find((d) => d.taskId === 'task-2');
      expect(diffTask2).toBeDefined();
      expect(diffTask2?.originalStartTime).toBe('09:00');
      expect(diffTask2?.originalEndTime).toBe('11:00');
      expect(diffTask2?.newStartTime).toBe('09:30');
      expect(diffTask2?.newEndTime).toBe('11:30');

      const diffTask3 = result.diffs.find((d) => d.taskId === 'task-3');
      expect(diffTask3).toBeDefined();
      expect(diffTask3?.newStartTime).toBe('12:30');
      expect(diffTask3?.newEndTime).toBe('13:30');

      expect(result.summary).toContain('2 tarefas ajustadas com deslocamento de +30 min');
      expect(result.overflowDetected).toBe(false);
    });

    it('deve replanejar tarefas a partir do término de uma tarefa específica (afterTaskId)', () => {
      const result = calculateReplanSchedule({
        tasks: mockTasks,
        delayMinutes: 45,
        afterTaskId: 'task-1', // Termina às 08:30
      });

      // Tarefas com início >= 08:30 são task-2 (09:00) e task-3 (12:00)
      expect(result.diffs).toHaveLength(2);
      expect(result.diffs[0].taskId).toBe('task-2');
      expect(result.diffs[0].newStartTime).toBe('09:45');
    });

    it('deve detectar overflow para tarefas que ultrapassem a meia-noite', () => {
      const lateTasks: Task[] = [
        {
          id: 'late-1',
          routineTypeId: 'main_routine',
          title: 'Trabalho Noturno',
          startTime: '22:30',
          endTime: '23:45',
          targetMinutes: 75,
          daysOfWeek: [1, 2, 3, 4, 5],
          categoryId: 'trabalho',
        },
      ];

      const result = calculateReplanSchedule({
        tasks: lateTasks,
        delayMinutes: 60,
        referenceTime: '22:00',
      });

      expect(result.diffs).toHaveLength(1);
      expect(result.overflowDetected).toBe(true);
      expect(result.summary).toContain(
        'Atenção: algumas atividades finais avançarão para perto da meia-noite'
      );
    });

    it('deve informar quando nenhuma tarefa futura for encontrada após o horário de referência', () => {
      const result = calculateReplanSchedule({
        tasks: mockTasks,
        delayMinutes: 30,
        referenceTime: '15:00',
      });

      expect(result.diffs).toHaveLength(0);
      expect(result.summary).toContain('Nenhuma tarefa futura encontrada após as 15:00');
    });
  });
});
