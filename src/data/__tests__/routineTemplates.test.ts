import { describe, it, expect } from 'vitest';
import { ROUTINE_TEMPLATES } from '../routineTemplates';

describe('routineTemplates data specification', () => {
  it('deve conter os 4 templates fundamentais de rotina', () => {
    expect(ROUTINE_TEMPLATES).toHaveLength(4);

    const ids = ROUTINE_TEMPLATES.map((t) => t.id);
    expect(ids).toContain('deep_work');
    expect(ids).toContain('study');
    expect(ids).toContain('balance');
    expect(ids).toContain('minimal');
  });

  it('deve garantir que cada template possui título, categorias, rotina e tarefas válidas', () => {
    ROUTINE_TEMPLATES.forEach((tmpl) => {
      expect(tmpl.title).toBeTruthy();
      expect(tmpl.subtitle).toBeTruthy();
      expect(tmpl.badge).toBeTruthy();
      expect(tmpl.recommendedPomodoroMinutes).toBeGreaterThan(0);
      expect(tmpl.routineType).toBeDefined();
      expect(tmpl.routineType.id).toBeTruthy();
      expect(tmpl.categories.length).toBeGreaterThan(0);
      expect(tmpl.tasks.length).toBeGreaterThan(0);

      const categoryIds = tmpl.categories.map((c) => c.id);

      tmpl.tasks.forEach((task) => {
        expect(task.id).toBeTruthy();
        expect(task.title).toBeTruthy();
        expect(task.routineTypeId).toBe(tmpl.routineType.id);
        expect(categoryIds).toContain(task.categoryId);

        // Formato HH:mm
        expect(task.startTime).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
        expect(task.endTime).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);

        // Target minutes válido
        expect(task.targetMinutes).toBeGreaterThan(0);
      });
    });
  });

  it('deve possuir regras de ouro prioritárias configuradas nos templates principais', () => {
    const deepWork = ROUTINE_TEMPLATES.find((t) => t.id === 'deep_work')!;
    const goldenRulesDeepWork = deepWork.tasks.filter((t) => t.isGoldenRule);
    expect(goldenRulesDeepWork.length).toBeGreaterThan(0);

    const study = ROUTINE_TEMPLATES.find((t) => t.id === 'study')!;
    const goldenRulesStudy = study.tasks.filter((t) => t.isGoldenRule);
    expect(goldenRulesStudy.length).toBeGreaterThan(0);

    const balance = ROUTINE_TEMPLATES.find((t) => t.id === 'balance')!;
    const goldenRulesBalance = balance.tasks.filter((t) => t.isGoldenRule);
    expect(goldenRulesBalance.length).toBeGreaterThan(0);
  });
});
