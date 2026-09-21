import { Task, TaskLog, BacklogItem } from '../types/routine';

export interface SqliteExport {
  schema: string;
  data: {
    tasks: Task[];
    taskCompletions: TaskLog[];
    backlog: BacklogItem[];
  };
  sqlDump: string;
}

export const SQLITE_SCHEMA = `
-- ============================================
-- FLOW ROUTINE DATABASE SCHEMA (SQLite v3)
-- ============================================

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    level TEXT CHECK(level IN ('easy', 'medium', 'hard')),
    category TEXT NOT NULL,
    is_golden_rule INTEGER DEFAULT 0,
    days_of_week TEXT NOT NULL, -- JSON array string ex: "[1,2,3,4,5]"
    target_minutes INTEGER NOT NULL,
    tags TEXT, -- JSON array string ex: "['tag1', 'tag2']"
    notes TEXT,
    is_custom INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS task_completions (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    date TEXT NOT NULL, -- YYYY-MM-DD
    completed INTEGER DEFAULT 1,
    completed_at TEXT, -- HH:mm:ss
    time_spent_minutes INTEGER,
    FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS backlog (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    target_minutes INTEGER NOT NULL,
    tags TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    original_task_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_completions_date ON task_completions(date);
CREATE INDEX IF NOT EXISTS idx_completions_task ON task_completions(task_id);
`;

/**
 * Gera um SQL dump completo com todas as tabelas e dados relacionais
 */
export function generateSqlDump(
  tasks: Task[],
  logs: Record<string, TaskLog>,
  backlog: BacklogItem[]
): string {
  let dump = `${SQLITE_SCHEMA}\n\n-- SEED / SYNC DATA\nBEGIN TRANSACTION;\n`;

  // Tasks
  for (const t of tasks) {
    const daysStr = JSON.stringify(t.daysOfWeek);
    const tagsStr = JSON.stringify(t.tags || []);
    const titleEsc = t.title.replace(/'/g, "''");
    const descEsc = (t.description || '').replace(/'/g, "''");
    const notesEsc = (t.notes || '').replace(/'/g, "''");

    dump += `INSERT OR REPLACE INTO tasks (id, title, description, start_time, end_time, level, category, is_golden_rule, days_of_week, target_minutes, tags, notes, is_custom)
VALUES ('${t.id}', '${titleEsc}', '${descEsc}', '${t.startTime}', '${t.endTime}', '${t.level}', '${t.category}', ${t.isGoldenRule ? 1 : 0}, '${daysStr}', ${t.targetMinutes}, '${tagsStr}', '${notesEsc}', ${t.isCustom ? 1 : 0});\n`;
  }

  // Completions
  for (const log of Object.values(logs)) {
    if (!log.completed) continue;
    dump += `INSERT OR REPLACE INTO task_completions (id, task_id, date, completed, completed_at, time_spent_minutes)
VALUES ('${log.id}', '${log.taskId}', '${log.date}', 1, '${log.completedAt || ''}', ${log.timeSpentMinutes || 0});\n`;
  }

  // Backlog
  for (const b of backlog) {
    const titleEsc = b.title.replace(/'/g, "''");
    const descEsc = (b.description || '').replace(/'/g, "''");
    const notesEsc = (b.notes || '').replace(/'/g, "''");
    const tagsStr = JSON.stringify(b.tags || []);

    dump += `INSERT OR REPLACE INTO backlog (id, title, description, category, target_minutes, tags, notes, created_at, original_task_id)
VALUES ('${b.id}', '${titleEsc}', '${descEsc}', '${b.category}', ${b.targetMinutes}, '${tagsStr}', '${notesEsc}', '${b.createdAt}', '${b.originalTaskId || ''}');\n`;
  }

  dump += `COMMIT;\n`;
  return dump;
}

/**
 * Funções de agregação analítica para o Dashboard
 */
export function calculateStreakAndMetrics(
  tasks: Task[],
  logs: Record<string, TaskLog>,
  selectedLevel: string
) {
  const today = new Date();
  const days: { date: string; displayDate: string; percentage: number; completed: number; total: number; goldenRulesDone: boolean }[] = [];

  // Analisar últimos 14 dias
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dayOfWeek = d.getDay();

    const dayTasks = tasks.filter((t) => t.level === selectedLevel && t.daysOfWeek.includes(dayOfWeek));
    const completedCount = dayTasks.filter((t) => logs[`${dateStr}_${t.id}`]?.completed).length;
    const totalCount = dayTasks.length;
    const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const goldenRules = dayTasks.filter((t) => t.isGoldenRule);
    const goldenRulesDone = goldenRules.length > 0 && goldenRules.every((t) => logs[`${dateStr}_${t.id}`]?.completed);

    days.push({
      date: dateStr,
      displayDate: d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }),
      percentage,
      completed: completedCount,
      total: totalCount,
      goldenRulesDone,
    });
  }

  // Calcular streak de dias consecutivos com progresso ou regras de ouro mantidas
  let currentStreak = 0;
  // Checar a partir de ontem para trás ou hoje se já marcou
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].completed > 0 || days[i].total === 0) {
      if (days[i].completed > 0) currentStreak++;
    } else {
      // Se for hoje e ainda for cedo, não quebra streak
      if (i === days.length - 1) continue;
      break;
    }
  }

  // Agregação por categoria (tempo total focado em minutos)
  const categoryTime: Record<string, { minutes: number; count: number }> = {};
  for (const log of Object.values(logs)) {
    if (!log.completed) continue;
    const task = tasks.find((t) => t.id === log.taskId);
    if (!task) continue;

    if (!categoryTime[task.category]) {
      categoryTime[task.category] = { minutes: 0, count: 0 };
    }
    categoryTime[task.category].minutes += task.targetMinutes;
    categoryTime[task.category].count += 1;
  }

  return {
    history14Days: days,
    currentStreak,
    categoryTime,
  };
}
