import { Task, TaskLog, BacklogItem, RoutineType, Category, Note } from '../types/routine';

export const SQLITE_SCHEMA = `
-- ============================================
-- FLOW ROUTINE DATABASE SCHEMA (SQLite v3 - Universal)
-- ============================================

CREATE TABLE IF NOT EXISTS routine_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    philosophy TEXT,
    color TEXT
);

CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    icon TEXT
);

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    routine_type_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    is_golden_rule INTEGER DEFAULT 0,
    days_of_week TEXT NOT NULL, -- JSON array string ex: "[1,2,3,4,5]"
    target_minutes INTEGER NOT NULL,
    tags TEXT, -- JSON array string
    notes TEXT,
    is_custom INTEGER DEFAULT 0,
    rich_content TEXT, -- RF-6 especificações internas
    attachments TEXT, -- JSON array de links/arquivos
    checklist TEXT, -- JSON array de sub-tarefas
    specific_date TEXT, -- YYYY-MM-DD para tarefas pontuais
    FOREIGN KEY(routine_type_id) REFERENCES routine_types(id) ON DELETE CASCADE,
    FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS task_completions (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    date TEXT NOT NULL, -- YYYY-MM-DD
    completed INTEGER DEFAULT 1,
    completed_at TEXT, -- HH:mm:ss
    time_spent_minutes INTEGER DEFAULT 0,
    FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS backlog (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    category_id TEXT NOT NULL,
    target_minutes INTEGER NOT NULL,
    tags TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    original_task_id TEXT,
    FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT, -- JSON array
    color TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_completions_date ON task_completions(date);
CREATE INDEX IF NOT EXISTS idx_completions_task ON task_completions(task_id);
`;

/**
 * Gera um SQL dump completo com todas as tabelas e dados relacionais dinâmicos
 */
export function generateSqlDump(
  routineTypes: RoutineType[],
  categories: Category[],
  tasks: Task[],
  logs: Record<string, TaskLog>,
  backlog: BacklogItem[],
  notes: Note[] = []
): string {
  let dump = `${SQLITE_SCHEMA}\n\n-- SEED / SYNC DATA\nBEGIN TRANSACTION;\n`;

  // Routine Types
  for (const rt of routineTypes) {
    const nameEsc = rt.name.replace(/'/g, "''");
    const descEsc = (rt.description || '').replace(/'/g, "''");
    const philEsc = (rt.philosophy || '').replace(/'/g, "''");
    dump += `INSERT OR REPLACE INTO routine_types (id, name, description, philosophy, color)
VALUES ('${rt.id}', '${nameEsc}', '${descEsc}', '${philEsc}', '${rt.color || '#6366F1'}');\n`;
  }

  // Categories
  for (const c of categories) {
    const nameEsc = c.name.replace(/'/g, "''");
    dump += `INSERT OR REPLACE INTO categories (id, name, color, icon)
VALUES ('${c.id}', '${nameEsc}', '${c.color}', '${c.icon || ''}');\n`;
  }

  // Tasks
  for (const t of tasks) {
    const daysStr = JSON.stringify(t.daysOfWeek);
    const tagsStr = JSON.stringify(t.tags || []);
    const titleEsc = t.title.replace(/'/g, "''");
    const descEsc = (t.description || '').replace(/'/g, "''");
    const notesEsc = (t.notes || '').replace(/'/g, "''");
    const richEsc = (t.richContent || '').replace(/'/g, "''");
    const attachStr = JSON.stringify(t.attachments || []);
    const checkStr = JSON.stringify(t.checklist || []);

    dump += `INSERT OR REPLACE INTO tasks (id, title, description, start_time, end_time, routine_type_id, category_id, is_golden_rule, days_of_week, target_minutes, tags, notes, is_custom, rich_content, attachments, checklist, specific_date)
VALUES ('${t.id}', '${titleEsc}', '${descEsc}', '${t.startTime}', '${t.endTime}', '${t.routineTypeId}', '${t.categoryId}', ${t.isGoldenRule ? 1 : 0}, '${daysStr}', ${t.targetMinutes}, '${tagsStr}', '${notesEsc}', ${t.isCustom ? 1 : 0}, '${richEsc}', '${attachStr}', '${checkStr}', '${t.specificDate || ''}');\n`;
  }

  // Completions
  for (const log of Object.values(logs)) {
    if (!log.completed && (!log.timeSpentMinutes || log.timeSpentMinutes <= 0)) continue;
    dump += `INSERT OR REPLACE INTO task_completions (id, task_id, date, completed, completed_at, time_spent_minutes)
VALUES ('${log.id}', '${log.taskId}', '${log.date}', ${log.completed ? 1 : 0}, '${log.completedAt || ''}', ${log.timeSpentMinutes || 0});\n`;
  }

  // Backlog
  for (const b of backlog) {
    const titleEsc = b.title.replace(/'/g, "''");
    const descEsc = (b.description || '').replace(/'/g, "''");
    const notesEsc = (b.notes || '').replace(/'/g, "''");
    const tagsStr = JSON.stringify(b.tags || []);

    dump += `INSERT OR REPLACE INTO backlog (id, title, description, category_id, target_minutes, tags, notes, created_at, original_task_id)
VALUES ('${b.id}', '${titleEsc}', '${descEsc}', '${b.categoryId}', ${b.targetMinutes}, '${tagsStr}', '${notesEsc}', '${b.createdAt}', '${b.originalTaskId || ''}');\n`;
  }

  // Notes
  for (const n of notes) {
    const titleEsc = n.title.replace(/'/g, "''");
    const contentEsc = n.content.replace(/'/g, "''");
    const tagsStr = JSON.stringify(n.tags || []);

    dump += `INSERT OR REPLACE INTO notes (id, title, content, tags, color, created_at, updated_at)
VALUES ('${n.id}', '${titleEsc}', '${contentEsc}', '${tagsStr}', '${n.color || '#6366F1'}', '${n.createdAt}', '${n.updatedAt}');\n`;
  }

  dump += `COMMIT;\n`;
  return dump;
}

/**
 * Funções de agregação analítica dinâmicas para o Dashboard
 */
export interface DateRangeOption {
  daysCount?: number;
  startDate?: string;
  endDate?: string;
}

export interface CategoryMetricItem {
  id: string;
  name: string;
  color: string;
  minutes: number;
  hours: number;
  count: number;
  percentage: number;
}

/**
 * Funções de agregação analítica dinâmicas para o Dashboard
 */
export function calculateStreakAndMetrics(
  tasks: Task[],
  logs: Record<string, TaskLog>,
  selectedRoutineTypeId: string,
  categories: Category[],
  rangeOption?: DateRangeOption
) {
  const days: {
    date: string;
    displayDate: string;
    percentage: number;
    completed: number;
    total: number;
    goldenRulesDone: boolean;
  }[] = [];

  const today = new Date();

  if (rangeOption?.startDate && rangeOption?.endDate) {
    // Intervalo personalizado
    const [startYear, startMonth, startDay] = rangeOption.startDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = rangeOption.endDate.split('-').map(Number);
    const current = new Date(startYear, startMonth - 1, startDay);
    const end = new Date(endYear, endMonth - 1, endDay);

    // Limitar no máximo 180 dias para evitar sobrecarga de renderização
    let safetyCounter = 0;
    while (current <= end && safetyCounter < 180) {
      const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
      const dayOfWeek = current.getDay();

      const dayTasks = tasks.filter((t) => {
        if (t.routineTypeId !== selectedRoutineTypeId) return false;
        if (t.specificDate) return t.specificDate === dateStr;
        return t.daysOfWeek.includes(dayOfWeek);
      });
      const completedCount = dayTasks.filter((t) => logs[`${dateStr}_${t.id}`]?.completed).length;
      const totalCount = dayTasks.length;
      const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      const goldenRules = dayTasks.filter((t) => t.isGoldenRule);
      const goldenRulesDone =
        goldenRules.length > 0 && goldenRules.every((t) => logs[`${dateStr}_${t.id}`]?.completed);

      days.push({
        date: dateStr,
        displayDate: current.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        percentage,
        completed: completedCount,
        total: totalCount,
        goldenRulesDone,
      });

      current.setDate(current.getDate() + 1);
      safetyCounter++;
    }
  } else {
    // Intervalo de dias fixos (7, 14, 30, 90 etc.)
    const daysCount = rangeOption?.daysCount || 14;
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dayOfWeek = d.getDay();

      const dayTasks = tasks.filter((t) => {
        if (t.routineTypeId !== selectedRoutineTypeId) return false;
        if (t.specificDate) return t.specificDate === dateStr;
        return t.daysOfWeek.includes(dayOfWeek);
      });
      const completedCount = dayTasks.filter((t) => logs[`${dateStr}_${t.id}`]?.completed).length;
      const totalCount = dayTasks.length;
      const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      const goldenRules = dayTasks.filter((t) => t.isGoldenRule);
      const goldenRulesDone =
        goldenRules.length > 0 && goldenRules.every((t) => logs[`${dateStr}_${t.id}`]?.completed);

      const displayDate =
        daysCount <= 7
          ? d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' })
          : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

      days.push({
        date: dateStr,
        displayDate,
        percentage,
        completed: completedCount,
        total: totalCount,
        goldenRulesDone,
      });
    }
  }

  // Calcular streak de dias consecutivos (a partir do último dia analisado)
  let currentStreak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].completed > 0 || days[i].total === 0) {
      if (days[i].completed > 0) currentStreak++;
    } else {
      if (i === days.length - 1) continue;
      break;
    }
  }

  // Conjunto de datas ativas no intervalo para filtrar métricas de categoria
  const activeDateSet = new Set(days.map((d) => d.date));

  // Agregação por categoria dinâmica
  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const categoryStatsMap: Record<
    string,
    { id: string; name: string; color: string; minutes: number; count: number }
  > = {};
  let totalPeriodCompletedCount = 0;
  let totalPeriodMinutes = 0;

  for (const log of Object.values(logs)) {
    if (!log.completed) continue;
    // Se o log estiver dentro do intervalo de datas selecionado
    if (!activeDateSet.has(log.date)) continue;

    const task = tasks.find((t) => t.id === log.taskId);
    if (!task) continue;

    const catInfo = categoryMap.get(task.categoryId) || {
      id: task.categoryId,
      name: 'Geral',
      color: '#6366F1',
    };

    if (!categoryStatsMap[task.categoryId]) {
      categoryStatsMap[task.categoryId] = {
        id: task.categoryId,
        name: catInfo.name,
        color: catInfo.color,
        minutes: 0,
        count: 0,
      };
    }
    categoryStatsMap[task.categoryId].minutes += task.targetMinutes;
    categoryStatsMap[task.categoryId].count += 1;
    totalPeriodCompletedCount += 1;
    totalPeriodMinutes += task.targetMinutes;
  }

  // Converter para array ordenado para o Recharts PieChart
  const categoryDistribution: CategoryMetricItem[] = Object.values(categoryStatsMap)
    .map((item) => ({
      ...item,
      hours: Number((item.minutes / 60).toFixed(1)),
      percentage:
        totalPeriodCompletedCount > 0
          ? Math.round((item.count / totalPeriodCompletedCount) * 100)
          : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    history14Days: days,
    historyDays: days,
    currentStreak,
    categoryStats: categoryStatsMap,
    categoryDistribution,
    totalPeriodCompletedCount,
    totalPeriodMinutes,
  };
}
