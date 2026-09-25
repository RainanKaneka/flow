import { describe, it, expect, vi, beforeEach } from 'vitest';
import Database from '@tauri-apps/plugin-sql';
import { initDb, loadStateFromDb, syncStateToDb, resetDbInstanceForTesting } from '../dbService';
import { Task, TaskLog, BacklogItem, RoutineType, Category } from '../../types/routine';

describe('dbService - SQLite Relational Integrity and FK Prevention', () => {
  let mockDb: {
    execute: ReturnType<typeof vi.fn>;
    select: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    resetDbInstanceForTesting();
    mockDb = {
      execute: vi.fn().mockResolvedValue({ lastInsertId: 1, rowsAffected: 1 }),
      select: vi.fn().mockResolvedValue([]),
    };
    (Database.load as any).mockResolvedValue(mockDb);
  });

  describe('initDb', () => {
    it('deve habilitar PRAGMA foreign_keys = ON e executar limpeza preventiva', async () => {
      await initDb();

      expect(mockDb.execute).toHaveBeenCalledWith('PRAGMA foreign_keys = ON;');
      expect(mockDb.execute).toHaveBeenCalledWith(
        'DELETE FROM task_completions WHERE task_id NOT IN (SELECT id FROM tasks);'
      );
      expect(mockDb.execute).toHaveBeenCalledWith(
        'DELETE FROM backlog WHERE category_id NOT IN (SELECT id FROM categories);'
      );
    });
  });

  describe('loadStateFromDb', () => {
    it('deve filtrar completions órfãs que não pertencem a nenhuma tarefa', async () => {
      mockDb.select.mockImplementation(async (query: string) => {
        if (query.includes('FROM routine_types')) {
          return [{ id: 'rt_1', name: 'Rotina', description: '', philosophy: '', color: '#fff' }];
        }
        if (query.includes('FROM categories')) {
          return [{ id: 'cat_1', name: 'Foco', color: '#6366F1', icon: 'zap' }];
        }
        if (query.includes('FROM tasks')) {
          return [
            {
              id: 'task_valid',
              title: 'Tarefa Válida',
              description: '',
              start_time: '09:00',
              end_time: '10:00',
              routine_type_id: 'rt_1',
              category_id: 'cat_1',
              is_golden_rule: 0,
              days_of_week: '[1]',
              target_minutes: 60,
              tags: '[]',
              notes: '',
              is_custom: 0,
              rich_content: null,
              attachments: '[]',
              checklist: '[]',
            },
          ];
        }
        if (query.includes('FROM task_completions')) {
          return [
            {
              id: '2026-09-24_task_valid',
              task_id: 'task_valid',
              date: '2026-09-24',
              completed: 1,
              completed_at: '09:30',
              time_spent_minutes: 30,
            },
            {
              id: '2026-09-24_task_orphaned',
              task_id: 'task_orphaned',
              date: '2026-09-24',
              completed: 1,
              completed_at: '09:30',
              time_spent_minutes: 30,
            },
          ];
        }
        return [];
      });

      const loaded = await loadStateFromDb();

      expect(loaded.tasks).toHaveLength(1);
      expect(loaded.logs).toBeDefined();
      expect(loaded.logs!['2026-09-24_task_valid']).toBeDefined();
      // O log da tarefa órfã não deve ser carregado na store
      expect(loaded.logs!['2026-09-24_task_orphaned']).toBeUndefined();
    });
  });

  describe('syncStateToDb', () => {
    it('deve nunca tentar inserir completions de tarefas inexistentes', async () => {
      const state = {
        routineTypes: [{ id: 'rt_1', name: 'Rotina', description: '', philosophy: '', color: '#fff' }] as RoutineType[],
        categories: [{ id: 'cat_1', name: 'Geral', color: '#fff' }] as Category[],
        tasks: [
          {
            id: 'task_1',
            title: 'Tarefa 1',
            startTime: '08:00',
            endTime: '09:00',
            routineTypeId: 'rt_1',
            categoryId: 'cat_1',
            isGoldenRule: false,
            daysOfWeek: [1],
            targetMinutes: 60,
            tags: [],
          },
        ] as Task[],
        logs: {
          '2026-09-24_task_1': {
            id: '2026-09-24_task_1',
            taskId: 'task_1',
            date: '2026-09-24',
            completed: true,
          } as TaskLog,
          '2026-09-24_task_ghost': {
            id: '2026-09-24_task_ghost',
            taskId: 'task_ghost',
            date: '2026-09-24',
            completed: true,
          } as TaskLog,
        },
      };

      await syncStateToDb(state);

      const executedQueries = mockDb.execute.mock.calls.map((call) => ({
        sql: call[0],
        params: call[1],
      }));

      // Inserção da tarefa 1 deve ocorrer
      const taskInsert = executedQueries.find((q) => q.sql.includes('INSERT OR REPLACE INTO tasks'));
      expect(taskInsert).toBeDefined();

      // Completions: task_1 inserida, task_ghost NÃO inserida
      const completionInserts = executedQueries.filter((q) =>
        q.sql.includes('INSERT OR REPLACE INTO task_completions')
      );
      expect(completionInserts).toHaveLength(1);
      expect(completionInserts[0].params[1]).toBe('task_1');
    });

    it('deve excluir task_completions órfãs antes de deletar de tasks para evitar erro 787', async () => {
      const state = {
        tasks: [
          {
            id: 'task_keep',
            title: 'Tarefa Mantida',
            startTime: '08:00',
            endTime: '09:00',
            routineTypeId: 'rt_1',
            categoryId: 'cat_1',
            daysOfWeek: [1],
            targetMinutes: 60,
            tags: [],
          },
        ] as Task[],
        logs: {
          '2026-09-24_task_keep': {
            id: '2026-09-24_task_keep',
            taskId: 'task_keep',
            date: '2026-09-24',
            completed: true,
          } as TaskLog,
        },
      };

      await syncStateToDb(state);

      const executedQueries = mockDb.execute.mock.calls.map((call) => call[0]);

      // Verifica a ordem de execução das deleções
      const deleteCompletionsIndex = executedQueries.findIndex((sql) =>
        sql.includes('DELETE FROM task_completions WHERE task_id NOT IN')
      );
      const deleteTasksIndex = executedQueries.findIndex((sql) =>
        sql.includes('DELETE FROM tasks WHERE id NOT IN')
      );

      expect(deleteCompletionsIndex).toBeGreaterThan(-1);
      expect(deleteTasksIndex).toBeGreaterThan(-1);
      // task_completions DEVE ser deletado ANTES de tasks
      expect(deleteCompletionsIndex).toBeLessThan(deleteTasksIndex);
    });

    it('deve usar fallback seguro de categoryId e routineTypeId se forem inválidos', async () => {
      const state = {
        routineTypes: [{ id: 'rt_main', name: 'Rotina Principal', description: '', philosophy: '', color: '#fff' }] as RoutineType[],
        categories: [{ id: 'cat_main', name: 'Geral', color: '#fff' }] as Category[],
        tasks: [
          {
            id: 'task_with_invalid_fks',
            title: 'Tarefa FK Invalida',
            startTime: '10:00',
            endTime: '11:00',
            routineTypeId: 'rt_non_existent',
            categoryId: 'cat_non_existent',
            daysOfWeek: [1],
            targetMinutes: 60,
            tags: [],
          },
        ] as Task[],
        backlog: [
          {
            id: 'bk_1',
            title: 'Item com categoria invalida',
            categoryId: 'cat_invalid',
            targetMinutes: 30,
            tags: [],
            createdAt: '2026-09-24T10:00:00Z',
          },
        ] as BacklogItem[],
      };

      await syncStateToDb(state);

      const executedQueries = mockDb.execute.mock.calls.map((call) => ({
        sql: call[0],
        params: call[1],
      }));

      const taskInsert = executedQueries.find(
        (q) => q.sql.includes('INSERT OR REPLACE INTO tasks') && q.params[0] === 'task_with_invalid_fks'
      );
      expect(taskInsert).toBeDefined();
      // O routine_type_id e category_id devem ter sofrido fallback para os válidos existentes
      expect(taskInsert?.params[5]).toBe('rt_main');
      expect(taskInsert?.params[6]).toBe('cat_main');

      const backlogInsert = executedQueries.find(
        (q) => q.sql.includes('INSERT OR REPLACE INTO backlog') && q.params[0] === 'bk_1'
      );
      expect(backlogInsert).toBeDefined();
      expect(backlogInsert?.params[3]).toBe('cat_main');
    });

    it('deve capturar falhas no banco sem crashar a aplicação e disparar auto-recuperação', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockDb.execute.mockRejectedValueOnce(new Error('(code: 787) FOREIGN KEY constraint failed'));

      const state = {
        tasks: [],
      };

      // Não deve lançar erro
      await expect(syncStateToDb(state)).resolves.not.toThrow();

      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });
  });
});
