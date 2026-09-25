import Database from '@tauri-apps/plugin-sql';
import { SQLITE_SCHEMA } from '../lib/sqliteService';
import { Task, TaskLog, BacklogItem, RoutineType, Category, Note, FlowState } from '../types/routine';

let dbInstance: Database | null = null;

/**
 * Retorna a instância única do banco de dados (Singleton)
 */
export async function getDb(): Promise<Database> {
  if (!dbInstance) {
    dbInstance = await Database.load('sqlite:flow.db');
  }
  return dbInstance;
}

export function resetDbInstanceForTesting(): void {
  dbInstance = null;
}

/**
 * Inicializa o banco de dados executando o schema
 */
export async function initDb(): Promise<void> {
  const db = await getDb();
  
  // Habilita a verificação de integridade referencial no SQLite
  await db.execute('PRAGMA foreign_keys = ON;');

  // O SQLite via tauri-plugin pode ter problemas com múltiplas instruções
  // em uma única chamada execute(), então dividimos pelo ';'
  const statements = SQLITE_SCHEMA.split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    await db.execute(statement);
  }

  // Garante que a coluna specific_date existe na tabela tasks
  try {
    await db.execute('ALTER TABLE tasks ADD COLUMN specific_date TEXT;');
  } catch (_) {
    // Coluna já existe
  }

  // Auto-recuperação preventiva: remove registros órfãos que possam ter sobrado no banco
  try {
    await db.execute('DELETE FROM task_completions WHERE task_id NOT IN (SELECT id FROM tasks);');
    await db.execute('DELETE FROM backlog WHERE category_id NOT IN (SELECT id FROM categories);');
  } catch (e) {
    console.warn('[dbService] Limpeza preventiva inicial ignorada:', e);
  }
}

/**
 * Carrega todos os dados relacionais do banco SQLite e os mapeia
 * de volta para o formato de estado em memória (Zustand).
 */
export async function loadStateFromDb(): Promise<Partial<FlowState>> {
  const db = await getDb();

  // 1. Routine Types
  const routineTypesRaw = await db.select<any[]>('SELECT * FROM routine_types');
  const routineTypes: RoutineType[] = routineTypesRaw.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description || '',
    philosophy: r.philosophy || '',
    color: r.color,
  }));

  // 2. Categories
  const categoriesRaw = await db.select<any[]>('SELECT * FROM categories');
  const categories: Category[] = categoriesRaw.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    icon: c.icon,
  }));

  // 3. Tasks
  const tasksRaw = await db.select<any[]>('SELECT * FROM tasks');
  const tasks: Task[] = tasksRaw.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description || '',
    startTime: t.start_time,
    endTime: t.end_time,
    routineTypeId: t.routine_type_id,
    categoryId: t.category_id,
    isGoldenRule: Boolean(t.is_golden_rule),
    daysOfWeek: JSON.parse(t.days_of_week || '[]'),
    targetMinutes: t.target_minutes,
    tags: JSON.parse(t.tags || '[]'),
    notes: t.notes || '',
    isCustom: Boolean(t.is_custom),
    richContent: t.rich_content,
    attachments: JSON.parse(t.attachments || '[]'),
    checklist: JSON.parse(t.checklist || '[]'),
    specificDate: t.specific_date || undefined,
  }));

  // 4. Completions (Logs) - Filtra apenas logs pertencentes a tarefas válidas
  const validTaskIds = new Set(tasks.map((t) => t.id));
  const logsRaw = await db.select<any[]>('SELECT * FROM task_completions');
  const logs: Record<string, TaskLog> = {};
  logsRaw.forEach((l) => {
    if (validTaskIds.has(l.task_id)) {
      logs[l.id] = {
        id: l.id,
        taskId: l.task_id,
        date: l.date,
        completed: Boolean(l.completed),
        completedAt: l.completed_at,
        timeSpentMinutes: l.time_spent_minutes || 0,
      };
    }
  });

  // 5. Backlog
  const backlogRaw = await db.select<any[]>('SELECT * FROM backlog');
  const backlog: BacklogItem[] = backlogRaw.map((b) => ({
    id: b.id,
    title: b.title,
    description: b.description || '',
    categoryId: b.category_id,
    targetMinutes: b.target_minutes,
    tags: JSON.parse(b.tags || '[]'),
    notes: b.notes || '',
    createdAt: b.created_at,
    originalTaskId: b.original_task_id,
  }));

  // 6. Notes
  const notesRaw = await db.select<any[]>('SELECT * FROM notes');
  const notes: Note[] = notesRaw.map((n) => ({
    id: n.id,
    title: n.title,
    content: n.content || '',
    tags: JSON.parse(n.tags || '[]'),
    color: n.color,
    createdAt: n.created_at,
    updatedAt: n.updated_at,
  }));

  // Se o banco estiver completamente vazio, retornamos um objeto vazio
  // para que o Zustand mantenha seus valores padrão iniciais.
  if (routineTypes.length === 0 && categories.length === 0) {
    return {};
  }

  return {
    routineTypes,
    categories,
    tasks,
    logs,
    backlog,
    notes,
  };
}

/**
 * Sincroniza o estado em memória para o SQLite nativo.
 * Garante a ordem correta de inserção (Pais -> Filhos) e
 * deleção (Filhos -> Pais) para que a integridade referencial
 * (FOREIGN KEY constraint - erro 787) nunca seja violada.
 */
export async function syncStateToDb(state: Partial<FlowState>): Promise<void> {
  const db = await getDb();

  // Função auxiliar para gerar lista de placeholders '$1, $2, $3'
  const placeholders = (count: number) =>
    Array(count)
      .fill('$1')
      .map((_, i) => '$' + (i + 1))
      .join(', ');

  try {
    // ----------------------------------------------------
    // ETAPA 1: UPSERT DE TABELAS PAI (routine_types, categories)
    // ----------------------------------------------------
    if (state.routineTypes) {
      for (const rt of state.routineTypes) {
        await db.execute(
          `INSERT OR REPLACE INTO routine_types (id, name, description, philosophy, color) VALUES ($1, $2, $3, $4, $5)`,
          [rt.id, rt.name, rt.description || null, rt.philosophy || null, rt.color || null]
        );
      }
    }

    if (state.categories) {
      for (const c of state.categories) {
        await db.execute(
          `INSERT OR REPLACE INTO categories (id, name, color, icon) VALUES ($1, $2, $3, $4)`,
          [c.id, c.name, c.color, c.icon || null]
        );
      }
    }

    const validRoutineTypeIds = new Set(
      (state.routineTypes && state.routineTypes.length > 0 ? state.routineTypes : []).map((r) => r.id)
    );
    const validCategoryIds = new Set(
      (state.categories && state.categories.length > 0 ? state.categories : []).map((c) => c.id)
    );
    const fallbackRoutineTypeId = state.routineTypes?.[0]?.id || 'main_routine';
    const fallbackCategoryId = state.categories?.[0]?.id || 'geral';

    // ----------------------------------------------------
    // ETAPA 2: UPSERT DE TAREFAS (tasks)
    // ----------------------------------------------------
    const validTaskIds = new Set((state.tasks || []).map((t) => t.id));

    if (state.tasks) {
      for (const t of state.tasks) {
        const routineTypeId =
          validRoutineTypeIds.size > 0 && !validRoutineTypeIds.has(t.routineTypeId)
            ? fallbackRoutineTypeId
            : t.routineTypeId;
        const categoryId =
          validCategoryIds.size > 0 && !validCategoryIds.has(t.categoryId)
            ? fallbackCategoryId
            : t.categoryId;

        await db.execute(
          `INSERT OR REPLACE INTO tasks (id, title, description, start_time, end_time, routine_type_id, category_id, is_golden_rule, days_of_week, target_minutes, tags, notes, is_custom, rich_content, attachments, checklist, specific_date) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
          [
            t.id,
            t.title,
            t.description || null,
            t.startTime,
            t.endTime,
            routineTypeId,
            categoryId,
            t.isGoldenRule ? 1 : 0,
            JSON.stringify(t.daysOfWeek),
            t.targetMinutes,
            JSON.stringify(t.tags || []),
            t.notes || null,
            t.isCustom ? 1 : 0,
            t.richContent || null,
            JSON.stringify(t.attachments || []),
            JSON.stringify(t.checklist || []),
            t.specificDate || null,
          ]
        );
      }
    }

    // ----------------------------------------------------
    // ETAPA 3: UPSERT DE ITENS DO BACKLOG
    // ----------------------------------------------------
    if (state.backlog) {
      for (const b of state.backlog) {
        const categoryId =
          validCategoryIds.size > 0 && !validCategoryIds.has(b.categoryId)
            ? fallbackCategoryId
            : b.categoryId;

        await db.execute(
          `INSERT OR REPLACE INTO backlog (id, title, description, category_id, target_minutes, tags, notes, created_at, original_task_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            b.id,
            b.title,
            b.description || null,
            categoryId,
            b.targetMinutes,
            JSON.stringify(b.tags || []),
            b.notes || null,
            b.createdAt,
            b.originalTaskId || null,
          ]
        );
      }
    }

    // ----------------------------------------------------
    // ETAPA 4: UPSERT DE NOTAS (notes)
    // ----------------------------------------------------
    if (state.notes) {
      for (const n of state.notes) {
        await db.execute(
          `INSERT OR REPLACE INTO notes (id, title, content, tags, color, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            n.id,
            n.title,
            n.content || '',
            JSON.stringify(n.tags || []),
            n.color || null,
            n.createdAt,
            n.updatedAt,
          ]
        );
      }
    }

    // ----------------------------------------------------
    // ETAPA 5: UPSERT DE COMPLETIONS (task_completions)
    // Insere APENAS logs cujas tarefas existem em tasks!
    // ----------------------------------------------------
    if (state.logs) {
      const logsArr = Object.values(state.logs);
      for (const log of logsArr) {
        // Se a tarefa não existe no estado ativo, não insere na tabela para evitar erro 787
        if (state.tasks && !validTaskIds.has(log.taskId)) {
          continue;
        }
        if (!log.completed && (!log.timeSpentMinutes || log.timeSpentMinutes <= 0)) {
          continue;
        }
        await db.execute(
          `INSERT OR REPLACE INTO task_completions (id, task_id, date, completed, completed_at, time_spent_minutes) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            log.id,
            log.taskId,
            log.date,
            log.completed ? 1 : 0,
            log.completedAt || null,
            log.timeSpentMinutes || 0,
          ]
        );
      }
    }

    // ========================================================
    // DELEÇÕES ORDENADAS (FILHO -> PAI):
    // ========================================================

    // ETAPA 6: Limpeza de task_completions (FILHO DE tasks)
    // Remove qualquer completion que aponte para uma tarefa que não existe mais
    if (state.tasks) {
      if (validTaskIds.size > 0) {
        const ids = Array.from(validTaskIds);
        await db.execute(
          `DELETE FROM task_completions WHERE task_id NOT IN (${placeholders(ids.length)})`,
          ids
        );
      } else {
        await db.execute(`DELETE FROM task_completions`);
      }
    }

    // Remove logs desmarcados ou removidos da store
    if (state.logs) {
      const activeLogs = Object.values(state.logs).filter(
        (l) => (!state.tasks || validTaskIds.has(l.taskId)) && (l.completed || (l.timeSpentMinutes && l.timeSpentMinutes > 0))
      );
      if (activeLogs.length > 0) {
        const ids = activeLogs.map((l) => l.id);
        await db.execute(
          `DELETE FROM task_completions WHERE id NOT IN (${placeholders(ids.length)})`,
          ids
        );
      } else {
        await db.execute(`DELETE FROM task_completions`);
      }
    }

    // ETAPA 7: Limpeza de tasks (PAI de task_completions, FILHO de routine_types e categories)
    // Como os task_completions filhos já foram apagados na Etapa 6, esta deleção nunca falhará com erro 787!
    if (state.tasks) {
      if (state.tasks.length > 0) {
        const ids = state.tasks.map((t) => t.id);
        await db.execute(
          `DELETE FROM tasks WHERE id NOT IN (${placeholders(ids.length)})`,
          ids
        );
      } else {
        await db.execute(`DELETE FROM tasks`);
      }
    }

    // ETAPA 8: Limpeza de backlog (FILHO de categories)
    if (state.backlog) {
      if (state.backlog.length > 0) {
        const ids = state.backlog.map((b) => b.id);
        await db.execute(
          `DELETE FROM backlog WHERE id NOT IN (${placeholders(ids.length)})`,
          ids
        );
      } else {
        await db.execute(`DELETE FROM backlog`);
      }
    }

    // ETAPA 9: Limpeza de categories e routine_types (PAIS de tasks e backlog)
    if (state.categories) {
      if (state.categories.length > 0) {
        const ids = state.categories.map((c) => c.id);
        await db.execute(
          `DELETE FROM categories WHERE id NOT IN (${placeholders(ids.length)})`,
          ids
        );
      } else {
        await db.execute(`DELETE FROM categories`);
      }
    }

    if (state.routineTypes) {
      if (state.routineTypes.length > 0) {
        const ids = state.routineTypes.map((r) => r.id);
        await db.execute(
          `DELETE FROM routine_types WHERE id NOT IN (${placeholders(ids.length)})`,
          ids
        );
      } else {
        await db.execute(`DELETE FROM routine_types`);
      }
    }

    // ETAPA 10: Limpeza de notes
    if (state.notes) {
      if (state.notes.length > 0) {
        const ids = state.notes.map((n) => n.id);
        await db.execute(
          `DELETE FROM notes WHERE id NOT IN (${placeholders(ids.length)})`,
          ids
        );
      } else {
        await db.execute(`DELETE FROM notes`);
      }
    }
  } catch (error) {
    console.warn('[dbService] Erro ao sincronizar estado com o SQLite (tratado com recuperação):', error);
    try {
      // Auto-reparação: purga quaisquer registros órfãos que possam ter causado conflito
      await db.execute('DELETE FROM task_completions WHERE task_id NOT IN (SELECT id FROM tasks);');
      await db.execute('DELETE FROM backlog WHERE category_id NOT IN (SELECT id FROM categories);');
    } catch (_) {}
  }
}

/**
 * Migra os dados antigos do localStorage para o SQLite uma única vez.
 */
export async function runLocalStorageMigration(): Promise<void> {
  if (typeof window === 'undefined') return;
  
  const MIGRATION_FLAG = 'flow-db-migrated';
  if (localStorage.getItem(MIGRATION_FLAG) === 'true') {
    return; // Já migrado
  }

  try {
    const legacyDataStr = localStorage.getItem('flow-app-v1-clean');
    if (legacyDataStr) {
      const legacyData = JSON.parse(legacyDataStr);
      const state = legacyData.state;
      if (state) {
        const payloadToSync: Partial<FlowState> = {};
        if (state.routineTypes && state.routineTypes.length > 0) payloadToSync.routineTypes = state.routineTypes;
        if (state.categories && state.categories.length > 0) payloadToSync.categories = state.categories;
        if (state.tasks && state.tasks.length > 0) payloadToSync.tasks = state.tasks;
        if (state.logs) payloadToSync.logs = state.logs;
        if (state.backlog && state.backlog.length > 0) payloadToSync.backlog = state.backlog;
        if (state.notes && state.notes.length > 0) payloadToSync.notes = state.notes;

        if (Object.keys(payloadToSync).length > 0) {
          console.warn('[dbService] Migrando dados legados do localStorage para o SQLite...');
          await syncStateToDb(payloadToSync);
        }
      }
    }
  } catch (error) {
    console.error('Falha ao migrar dados do localStorage para SQLite:', error);
  } finally {
    localStorage.setItem(MIGRATION_FLAG, 'true');
  }
}
