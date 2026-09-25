import { describe, it, expect } from 'vitest';
import { generateSqlDump, calculateStreakAndMetrics, SQLITE_SCHEMA } from '../sqliteService';
import { RoutineType, Category, Task, TaskLog, Note, BacklogItem } from '../../types/routine';

describe('sqliteService', () => {
  const mockRoutineTypes: RoutineType[] = [
    {
      id: 'routine-1',
      name: 'Rotina Principal',
      description: 'Dia a dia padrão',
      color: '#6366F1',
      icon: 'Calendar',
      isDefault: true,
    },
  ];

  const mockCategories: Category[] = [
    {
      id: 'cat-1',
      name: 'Trabalho & Código',
      color: '#3B82F6',
      icon: 'Briefcase',
    },
    {
      id: 'cat-2',
      name: 'Saúde & Treino',
      color: '#10B981',
      icon: 'Heart',
    },
  ];

  const mockTasks: Task[] = [
    {
      id: 'task-1',
      routineTypeId: 'routine-1',
      title: 'Desenvolver Flow App',
      description: 'Codar features com testes "vitest"',
      startTime: '09:00',
      endTime: '11:00',
      targetMinutes: 120,
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      categoryId: 'cat-1',
      isGoldenRule: true,
      tags: ['dev', 'frontend'],
      checklist: [
        { id: 'sub-1', title: 'Configurar vitest', completed: true },
        { id: 'sub-2', title: 'Cobrir store', completed: false },
      ],
    },
  ];

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const mockLogs: Record<string, TaskLog> = {
    [`${todayStr}_task-1`]: {
      id: `${todayStr}_task-1`,
      taskId: 'task-1',
      date: todayStr,
      completed: true,
      timeSpentMinutes: 120,
      completedAt: '11:00:00',
    },
  };

  const mockNotes: Note[] = [
    {
      id: 'note-1',
      title: 'Ideias de Produto',
      content: 'Refatorar store em slices e adicionar SQLite nativo',
      tags: ['planejamento'],
      color: '#F59E0B',
      createdAt: '2026-09-22T08:00:00Z',
      updatedAt: '2026-09-22T08:30:00Z',
    },
  ];

  const mockBacklog: BacklogItem[] = [
    {
      id: 'backlog-1',
      title: 'Comprar suporte articulado',
      description: 'Para o monitor ultrawide',
      targetMinutes: 30,
      categoryId: 'cat-1',
      tags: ['setup'],
      createdAt: '2026-09-22T09:00:00Z',
    },
  ];

  describe('generateSqlDump', () => {
    it('deve incluir o schema DDL completo', () => {
      const dump = generateSqlDump([], [], [], {}, [], []);
      expect(dump).toContain(SQLITE_SCHEMA);
      expect(dump).toContain('CREATE TABLE IF NOT EXISTS routine_types');
      expect(dump).toContain('CREATE TABLE IF NOT EXISTS tasks');
      expect(dump).toContain('CREATE TABLE IF NOT EXISTS task_completions');
      expect(dump).toContain('CREATE TABLE IF NOT EXISTS notes');
      expect(dump).toContain('CREATE TABLE IF NOT EXISTS backlog');
    });

    it('deve gerar comandos INSERT com sanitização de aspas para todas as entidades', () => {
      const dump = generateSqlDump(
        mockRoutineTypes,
        mockCategories,
        mockTasks,
        mockLogs,
        mockBacklog,
        mockNotes
      );

      // Routine types
      expect(dump).toContain('INSERT OR REPLACE INTO routine_types');
      expect(dump).toContain("'routine-1'");
      expect(dump).toContain("'Rotina Principal'");

      // Categories
      expect(dump).toContain('INSERT OR REPLACE INTO categories');
      expect(dump).toContain("'cat-1'");
      expect(dump).toContain("'Trabalho & Código'");

      // Tasks
      expect(dump).toContain('INSERT OR REPLACE INTO tasks');
      expect(dump).toContain("'Desenvolver Flow App'");
      expect(dump).toContain('dev');
      expect(dump).toContain('Configurar vitest');

      // Task completions
      expect(dump).toContain('INSERT OR REPLACE INTO task_completions');
      expect(dump).toContain("'task-1'");

      // Notes
      expect(dump).toContain('INSERT OR REPLACE INTO notes');
      expect(dump).toContain("'Ideias de Produto'");

      // Backlog
      expect(dump).toContain('INSERT OR REPLACE INTO backlog');
      expect(dump).toContain("'Comprar suporte articulado'");
    });

    it('deve lidar corretamente com entidades vazias sem falhar', () => {
      const dump = generateSqlDump([], [], [], {}, [], []);
      expect(dump).toContain('FLOW ROUTINE DATABASE SCHEMA');
      expect(dump).toContain('COMMIT;');
    });
  });

  describe('calculateStreakAndMetrics', () => {
    it('deve calcular métricas de conclusão e minutos acumulados para o período', () => {
      const metrics = calculateStreakAndMetrics(mockTasks, mockLogs, 'routine-1', mockCategories, {
        daysCount: 7,
      });

      expect(metrics.totalPeriodCompletedCount).toBe(1);
      expect(metrics.totalPeriodMinutes).toBe(120);
      expect(metrics.historyDays).toHaveLength(7);
      expect(metrics.categoryDistribution).toHaveLength(1);
      expect(metrics.categoryDistribution[0].name).toBe('Trabalho & Código');
      expect(metrics.categoryDistribution[0].minutes).toBe(120);
    });

    it('deve retornar métricas zeradas quando não houver logs de conclusão', () => {
      const metrics = calculateStreakAndMetrics(mockTasks, {}, 'routine-1', mockCategories, {
        daysCount: 14,
      });

      expect(metrics.totalPeriodCompletedCount).toBe(0);
      expect(metrics.totalPeriodMinutes).toBe(0);
      expect(metrics.categoryDistribution).toHaveLength(0);
      expect(metrics.currentStreak).toBe(0);
    });

    it('deve suportar intervalo customizado com startDate e endDate', () => {
      const metrics = calculateStreakAndMetrics(mockTasks, mockLogs, 'routine-1', mockCategories, {
        startDate: todayStr,
        endDate: todayStr,
      });

      expect(metrics.historyDays).toHaveLength(1);
      expect(metrics.historyDays[0].date).toBe(todayStr);
      expect(metrics.historyDays[0].completed).toBe(1);
    });
  });
});
