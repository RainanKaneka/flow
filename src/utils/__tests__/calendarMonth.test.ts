import { describe, it, expect } from 'vitest';
import {
  formatYMD,
  buildMonthCalendarDays,
  calculateMonthSummary,
  getPrevMonth,
  getNextMonth,
} from '../calendarMonth';
import { Task, TaskLog, Category } from '../../types/routine';

const mockCategories: Category[] = [
  { id: 'cat_work', name: 'Trabalho', color: '#6366F1' },
  { id: 'cat_health', name: 'Saúde', color: '#10B981' },
];

const mockTasks: Task[] = [
  {
    id: 't1',
    title: 'Trabalho Focado',
    description: '',
    startTime: '09:00',
    endTime: '11:00',
    routineTypeId: 'main',
    categoryId: 'cat_work',
    daysOfWeek: [1, 2, 3, 4, 5], // Seg a Sex
    targetMinutes: 120,
    tags: [],
  },
  {
    id: 't2',
    title: 'Exercício',
    description: '',
    startTime: '18:00',
    endTime: '19:00',
    routineTypeId: 'main',
    categoryId: 'cat_health',
    daysOfWeek: [1, 3, 5], // Seg, Qua, Sex
    targetMinutes: 60,
    tags: [],
  },
];

describe('calendarMonth utility', () => {
  it('formatYMD deve formatar ano, mês e dia com padding correto', () => {
    expect(formatYMD(2026, 8, 5)).toBe('2026-09-05');
    expect(formatYMD(2026, 11, 25)).toBe('2026-12-25');
  });

  it('getPrevMonth e getNextMonth devem navegar meses e transicionar anos', () => {
    expect(getPrevMonth(2026, 0)).toEqual({ year: 2025, month: 11 }); // Jan -> Dez ano anterior
    expect(getPrevMonth(2026, 8)).toEqual({ year: 2026, month: 7 }); // Set -> Ago

    expect(getNextMonth(2026, 11)).toEqual({ year: 2027, month: 0 }); // Dez -> Jan próximo ano
    expect(getNextMonth(2026, 8)).toEqual({ year: 2026, month: 9 }); // Set -> Out
  });

  it('buildMonthCalendarDays deve gerar a matriz completa de semanas para o mês', () => {
    // Setembro de 2026 (monthIndex: 8)
    // 01/09/2026 é Terça-feira (dayOfWeek: 2)
    // Portanto 2 dias do mês anterior (Dom 30/08, Seg 31/08)
    const logs: Record<string, TaskLog> = {
      '2026-09-02_t1': { completed: true },
      '2026-09-02_t2': { completed: true },
    };

    const days = buildMonthCalendarDays(
      2026,
      8,
      '2026-09-02',
      '2026-09-24',
      mockTasks,
      logs,
      mockCategories
    );

    expect(days.length % 7).toBe(0);
    expect(days.length).toBeGreaterThanOrEqual(35);

    // Primeiro dia da grade deve ser domingo do mês anterior (30/08/2026)
    expect(days[0].dateStr).toBe('2026-08-30');
    expect(days[0].isCurrentMonth).toBe(false);

    // Dia 02/09/2026 é Quarta-feira (dayOfWeek: 3)
    const day2 = days.find((d) => d.dateStr === '2026-09-02');
    expect(day2).toBeDefined();
    expect(day2?.isCurrentMonth).toBe(true);
    expect(day2?.isSelected).toBe(true);
    expect(day2?.totalTasks).toBe(2); // t1 e t2
    expect(day2?.completedTasks).toBe(2);
    expect(day2?.completionRate).toBe(100);
    expect(day2?.isPerfectDay).toBe(true);

    // Dia 24/09/2026 é today
    const day24 = days.find((d) => d.dateStr === '2026-09-24');
    expect(day24).toBeDefined();
    expect(day24?.isToday).toBe(true);
  });

  it('calculateMonthSummary deve calcular métricas agregadas do mês atual', () => {
    const logs: Record<string, TaskLog> = {
      '2026-09-01_t1': { completed: true },
      '2026-09-02_t1': { completed: true },
      '2026-09-02_t2': { completed: true },
    };

    const days = buildMonthCalendarDays(
      2026,
      8,
      '2026-09-24',
      '2026-09-24',
      mockTasks,
      logs,
      mockCategories
    );

    const summary = calculateMonthSummary(days, 2026, 8);

    expect(summary.monthName).toBe('Setembro');
    expect(summary.year).toBe(2026);
    expect(summary.month).toBe(8);
    expect(summary.totalScheduledTasks).toBeGreaterThan(0);
    expect(summary.totalCompletedTasks).toBe(3);
    expect(summary.perfectDaysCount).toBeGreaterThanOrEqual(1);
    expect(summary.activeDaysCount).toBeGreaterThanOrEqual(2);
    expect(summary.averageCompletionRate).toBeGreaterThan(0);
  });
});
