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

/**
 * Inicializa o banco de dados executando o schema
 */
export async function initDb(): Promise<void> {
  const db = await getDb();
  
  // O SQLite via tauri-plugin pode ter problemas com múltiplas instruções
  // em uma única chamada execute(), então dividimos pelo ';'
  const statements = SQLITE_SCHEMA.split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    await db.execute(statement);
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
  }));

  // 4. Completions (Logs)
  const logsRaw = await db.select<any[]>('SELECT * FROM task_completions');
  const logs: Record<string, TaskLog> = {};
  logsRaw.forEach((l) => {
    logs[l.id] = {
      id: l.id,
      taskId: l.task_id,
      date: l.date,
      completed: Boolean(l.completed),
      completedAt: l.completed_at,
      timeSpentMinutes: l.time_spent_minutes || 0,
    };
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
 * Utiliza INSERT OR REPLACE para upsert e deleções para remover órfãos.
 */
export async function syncStateToDb(state: Partial<FlowState>): Promise<void> {
  const db = await getDb();

  // Função auxiliar para gerar lista de placeholders '?, ?, ?'
  const placeholders = (count: number) => Array(count).fill('$1').map((_, i) => '$' + (i + 1)).join(', ');

  // Routine Types
  if (state.routineTypes) {
    for (const rt of state.routineTypes) {
      await db.execute(
        `INSERT OR REPLACE INTO routine_types (id, name, description, philosophy, color) VALUES ($1, $2, $3, $4, $5)`,
        [rt.id, rt.name, rt.description || null, rt.philosophy || null, rt.color || null]
      );
    }
    if (state.routineTypes.length > 0) {
      const ids = state.routineTypes.map(r => r.id);
      await db.execute(`DELETE FROM routine_types WHERE id NOT IN (${placeholders(ids.length)})`, ids);
    } else {
      await db.execute(`DELETE FROM routine_types`);
    }
  }

  // Categories
  if (state.categories) {
    for (const c of state.categories) {
      await db.execute(
        `INSERT OR REPLACE INTO categories (id, name, color, icon) VALUES ($1, $2, $3, $4)`,
        [c.id, c.name, c.color, c.icon || null]
      );
    }
    if (state.categories.length > 0) {
      const ids = state.categories.map(c => c.id);
      await db.execute(`DELETE FROM categories WHERE id NOT IN (${placeholders(ids.length)})`, ids);
    } else {
      await db.execute(`DELETE FROM categories`);
    }
  }

  // Tasks
  if (state.tasks) {
    for (const t of state.tasks) {
      await db.execute(
        `INSERT OR REPLACE INTO tasks (id, title, description, start_time, end_time, routine_type_id, category_id, is_golden_rule, days_of_week, target_minutes, tags, notes, is_custom, rich_content, attachments, checklist) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          t.id, t.title, t.description || null, t.startTime, t.endTime, t.routineTypeId, t.categoryId,
          t.isGoldenRule ? 1 : 0, JSON.stringify(t.daysOfWeek), t.targetMinutes, JSON.stringify(t.tags || []),
          t.notes || null, t.isCustom ? 1 : 0, t.richContent || null, JSON.stringify(t.attachments || []),
          JSON.stringify(t.checklist || [])
        ]
      );
    }
    if (state.tasks.length > 0) {
      const ids = state.tasks.map(t => t.id);
      await db.execute(`DELETE FROM tasks WHERE id NOT IN (${placeholders(ids.length)})`, ids);
    } else {
      await db.execute(`DELETE FROM tasks`);
    }
  }

  // Completions (Logs)
  if (state.logs) {
    const logsArr = Object.values(state.logs);
    for (const log of logsArr) {
      if (!log.completed && (!log.timeSpentMinutes || log.timeSpentMinutes <= 0)) {
        continue;
      }
      await db.execute(
        `INSERT OR REPLACE INTO task_completions (id, task_id, date, completed, completed_at, time_spent_minutes) VALUES ($1, $2, $3, $4, $5, $6)`,
        [log.id, log.taskId, log.date, log.completed ? 1 : 0, log.completedAt || null, log.timeSpentMinutes || 0]
      );
    }
    const validLogs = logsArr.filter(l => l.completed || (l.timeSpentMinutes && l.timeSpentMinutes > 0));
    if (validLogs.length > 0) {
      const ids = validLogs.map(l => l.id);
      await db.execute(`DELETE FROM task_completions WHERE id NOT IN (${placeholders(ids.length)})`, ids);
    } else {
      await db.execute(`DELETE FROM task_completions`);
    }
  }

  // Backlog
  if (state.backlog) {
    for (const b of state.backlog) {
      await db.execute(
        `INSERT OR REPLACE INTO backlog (id, title, description, category_id, target_minutes, tags, notes, created_at, original_task_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [b.id, b.title, b.description || null, b.categoryId, b.targetMinutes, JSON.stringify(b.tags || []), b.notes || null, b.createdAt, b.originalTaskId || null]
      );
    }
    if (state.backlog.length > 0) {
      const ids = state.backlog.map(b => b.id);
      await db.execute(`DELETE FROM backlog WHERE id NOT IN (${placeholders(ids.length)})`, ids);
    } else {
      await db.execute(`DELETE FROM backlog`);
    }
  }

  // Notes
  if (state.notes) {
    for (const n of state.notes) {
      await db.execute(
        `INSERT OR REPLACE INTO notes (id, title, content, tags, color, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [n.id, n.title, n.content || '', JSON.stringify(n.tags || []), n.color || null, n.createdAt, n.updatedAt]
      );
    }
    if (state.notes.length > 0) {
      const ids = state.notes.map(n => n.id);
      await db.execute(`DELETE FROM notes WHERE id NOT IN (${placeholders(ids.length)})`, ids);
    } else {
      await db.execute(`DELETE FROM notes`);
    }
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
          console.log('Migrando dados legados do localStorage para o SQLite...');
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
