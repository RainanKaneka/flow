import { describe, it, expect } from 'vitest';
import {
  DEFAULT_ROUTINE_TYPES,
  DEFAULT_CATEGORIES,
  DEFAULT_TASKS,
  createWelcomeTask,
} from '../initialRoutine';

describe('initialRoutine specification', () => {
  it('deve conter tipos de rotina e categorias padrão válidos', () => {
    expect(DEFAULT_ROUTINE_TYPES.length).toBeGreaterThan(0);
    expect(DEFAULT_CATEGORIES.length).toBeGreaterThan(0);
    expect(DEFAULT_ROUTINE_TYPES[0].id).toBe('main_routine');
    expect(DEFAULT_CATEGORIES[0].id).toBe('geral');
  });

  it('deve garantir que a tarefa de boas-vindas não repete todos os dias (apenas no primeiro dia)', () => {
    const welcomeTask = DEFAULT_TASKS.find((t) => t.id === 'welcome_task');
    expect(welcomeTask).toBeDefined();

    // Requisito 0.4.5: daysOfWeek deve ser vazio para não poluir todos os dias
    expect(welcomeTask!.daysOfWeek).toEqual([]);

    // Deve ter data específica correspondente ao dia de entrada
    expect(welcomeTask!.specificDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('createWelcomeTask deve permitir definir uma data específica personalizada', () => {
    const customTask = createWelcomeTask('2026-10-02');
    expect(customTask.id).toBe('welcome_task');
    expect(customTask.specificDate).toBe('2026-10-02');
    expect(customTask.daysOfWeek).toEqual([]);
  });
});
