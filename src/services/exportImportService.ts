/**
 * Serviço de Exportação e Importação de Dados do Flow (JSON, CSV e SQL)
 * Fase 2, Parte 4 do Roadmap: Portabilidade total de rotinas, histórico, notas e configurações
 */

import {
  Task,
  TaskLog,
  BacklogItem,
  RoutineType,
  Category,
  Note,
  ReminderSettings,
  BackupSettings,
  FlowState,
  FlowExportPayload,
  ImportMode,
  ImportValidationResult,
  ImportExecutionResult,
} from '../types/routine';
import { CURRENT_APP_VERSION } from './updateService';
import { generateSqlDump } from '../lib/sqliteService';
import { DEFAULT_ROUTINE_TYPES, DEFAULT_CATEGORIES } from '../data/initialRoutine';
import { syncStateToDb } from './dbService';
import { useFlowStore } from '../store/useFlowStore';

// ==========================================
// 1. UTILITÁRIOS DE CSV (RFC 4180 + UTF-8 BOM)
// ==========================================

export const CSV_BOM = '\uFEFF';

/**
 * Escapa um valor para uso seguro em arquivo CSV
 */
export function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) {
    return '';
  }
  const str = String(val);
  // Se contiver vírgula, ponto-e-vírgula, quebra de linha ou aspas duplas, envolve em aspas e duplica aspas internas
  if (str.includes('"') || str.includes(',') || str.includes(';') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Formata uma linha completa de CSV
 */
export function formatCsvRow(fields: unknown[], delimiter = ','): string {
  return fields.map((f) => escapeCsvField(f)).join(delimiter);
}

/**
 * Parser de CSV compatível com RFC 4180 (lida com aspas, quebras de linha e vírgulas internas)
 */
export function parseCsv(csvText: string, delimiter = ','): string[][] {
  const cleanText = csvText.startsWith(CSV_BOM) ? csvText.slice(CSV_BOM.length) : csvText;
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Aspas escapadas ("")
          currentField += '"';
          i++;
        } else {
          // Fim do bloco de aspas
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentField);
        currentField = '';
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i++;
        }
        currentRow.push(currentField);
        currentField = '';
        if (currentRow.some((f) => f.trim().length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
      } else if (char === '\n') {
        currentRow.push(currentField);
        currentField = '';
        if (currentRow.some((f) => f.trim().length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some((f) => f.trim().length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

// ==========================================
// 2. GERADORES DE CSV
// ==========================================

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/**
 * Gera CSV de Tarefas
 */
export function generateTasksCsv(
  tasks: Task[],
  routineTypes: RoutineType[] = [],
  categories: Category[] = []
): string {
  const rtMap = new Map(routineTypes.map((r) => [r.id, r.name]));
  const catMap = new Map(categories.map((c) => [c.id, c.name]));

  const headers = [
    'ID',
    'Título',
    'Descrição',
    'Horário Início',
    'Horário Fim',
    'Tipo de Rotina',
    'Categoria',
    'Hábito Âncora',
    'Dias da Semana',
    'Minutos Alvo',
    'Tags',
    'Notas',
    'Conteúdo Rico',
    'Data Específica',
  ];

  const rows = tasks.map((t) => {
    const routineName = rtMap.get(t.routineTypeId) || t.routineTypeId;
    const categoryName = catMap.get(t.categoryId) || t.categoryId;
    const daysStr = (t.daysOfWeek || []).map((d) => DAY_NAMES[d] ?? d).join('; ');
    const tagsStr = (t.tags || []).join('; ');

    return formatCsvRow([
      t.id,
      t.title,
      t.description || '',
      t.startTime,
      t.endTime,
      routineName,
      categoryName,
      t.isGoldenRule ? 'Sim' : 'Não',
      daysStr,
      t.targetMinutes,
      tagsStr,
      t.notes || '',
      t.richContent || '',
      t.specificDate || '',
    ]);
  });

  return `${CSV_BOM}${headers.join(',')}\n${rows.join('\n')}`;
}

/**
 * Gera CSV do Histórico de Conclusões (Logs)
 */
export function generateCompletionsCsv(
  logs: Record<string, TaskLog>,
  tasks: Task[] = [],
  categories: Category[] = []
): string {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const catMap = new Map(categories.map((c) => [c.id, c.name]));

  const headers = [
    'ID',
    'Data',
    'ID da Tarefa',
    'Título da Tarefa',
    'Categoria',
    'Concluído',
    'Horário da Conclusão',
    'Tempo Focado (min)',
  ];

  const sortedLogs = Object.values(logs).sort((a, b) => b.date.localeCompare(a.date));

  const rows = sortedLogs.map((l) => {
    const task = taskMap.get(l.taskId);
    const categoryName = task ? catMap.get(task.categoryId) || task.categoryId : '';

    return formatCsvRow([
      l.id,
      l.date,
      l.taskId,
      task?.title || 'Tarefa Removida',
      categoryName,
      l.completed ? 'Sim' : 'Não',
      l.completedAt || '',
      l.timeSpentMinutes || 0,
    ]);
  });

  return `${CSV_BOM}${headers.join(',')}\n${rows.join('\n')}`;
}

/**
 * Gera CSV do Bloco de Notas
 */
export function generateNotesCsv(notes: Note[]): string {
  const headers = ['ID', 'Título', 'Conteúdo', 'Tags', 'Cor', 'Criado Em', 'Atualizado Em'];

  const rows = notes.map((n) => {
    return formatCsvRow([
      n.id,
      n.title,
      n.content,
      (n.tags || []).join('; '),
      n.color || '',
      n.createdAt,
      n.updatedAt,
    ]);
  });

  return `${CSV_BOM}${headers.join(',')}\n${rows.join('\n')}`;
}

/**
 * Gera CSV do Backlog
 */
export function generateBacklogCsv(backlog: BacklogItem[], categories: Category[] = []): string {
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const headers = ['ID', 'Título', 'Descrição', 'Categoria', 'Minutos Alvo', 'Tags', 'Notas', 'Criado Em'];

  const rows = backlog.map((b) => {
    const categoryName = catMap.get(b.categoryId) || b.categoryId;
    return formatCsvRow([
      b.id,
      b.title,
      b.description || '',
      categoryName,
      b.targetMinutes,
      (b.tags || []).join('; '),
      b.notes || '',
      b.createdAt,
    ]);
  });

  return `${CSV_BOM}${headers.join(',')}\n${rows.join('\n')}`;
}

// ==========================================
// 3. PARSER E IMPORTADOR DE TAREFAS EM CSV
// ==========================================

export function parseTasksFromCsv(
  csvText: string,
  routineTypes: RoutineType[] = [],
  categories: Category[] = []
): { tasks: Task[]; errors: string[]; warnings: string[] } {
  const parsedRows = parseCsv(csvText);
  if (parsedRows.length < 2) {
    return { tasks: [], errors: ['O arquivo CSV está vazio ou contém apenas o cabeçalho.'], warnings: [] };
  }

  const rawHeaders = parsedRows[0].map((h) => h.trim().toLowerCase());
  const findHeaderIdx = (...aliases: string[]) => {
    return rawHeaders.findIndex((h) => aliases.some((a) => h.includes(a.toLowerCase())));
  };

  const titleIdx = findHeaderIdx('título', 'titulo', 'title', 'nome', 'atividade', 'task');
  const descIdx = findHeaderIdx('descrição', 'descricao', 'description', 'desc');
  const startIdx = findHeaderIdx('início', 'inicio', 'start', 'começo', 'comeco', 'horário');
  const endIdx = findHeaderIdx('fim', 'termino', 'término', 'end');
  const routineIdx = findHeaderIdx('tipo de rotina', 'rotina', 'routine');
  const catIdx = findHeaderIdx('categoria', 'category');
  const goldenIdx = findHeaderIdx('hábito âncora', 'habito ancora', 'âncora', 'ancora', 'golden');
  const daysIdx = findHeaderIdx('dias da semana', 'dias', 'days');
  const targetIdx = findHeaderIdx('minutos', 'tempo', 'target');
  const tagsIdx = findHeaderIdx('tags', 'etiquetas');
  const notesIdx = findHeaderIdx('notas', 'observações', 'observacoes', 'notes');

  if (titleIdx === -1) {
    return {
      tasks: [],
      errors: ['Não foi encontrada uma coluna de "Título" ou "Atividade" no cabeçalho do CSV.'],
      warnings: [],
    };
  }

  const defaultRoutineId = routineTypes[0]?.id || DEFAULT_ROUTINE_TYPES[0].id;
  const defaultCategoryId = categories[0]?.id || DEFAULT_CATEGORIES[0].id;
  const tasks: Task[] = [];
  const warnings: string[] = [];

  for (let i = 1; i < parsedRows.length; i++) {
    const row = parsedRows[i];
    const title = (row[titleIdx] || '').trim();
    if (!title) continue;

    const startTime = (startIdx !== -1 && row[startIdx]?.trim()) || '09:00';
    const endTime = (endIdx !== -1 && row[endIdx]?.trim()) || '09:30';

    // Resolver Tipo de Rotina por nome ou ID
    let routineTypeId = defaultRoutineId;
    if (routineIdx !== -1 && row[routineIdx]?.trim()) {
      const val = row[routineIdx].trim().toLowerCase();
      const matched = routineTypes.find((r) => r.id.toLowerCase() === val || r.name.toLowerCase() === val);
      if (matched) routineTypeId = matched.id;
    }

    // Resolver Categoria por nome ou ID
    let categoryId = defaultCategoryId;
    if (catIdx !== -1 && row[catIdx]?.trim()) {
      const val = row[catIdx].trim().toLowerCase();
      const matched = categories.find((c) => c.id.toLowerCase() === val || c.name.toLowerCase() === val);
      if (matched) categoryId = matched.id;
    }

    // Regra de Ouro / Golden Rule
    let isGoldenRule = false;
    if (goldenIdx !== -1 && row[goldenIdx]) {
      const val = row[goldenIdx].trim().toLowerCase();
      isGoldenRule = val === 'sim' || val === 'true' || val === '1' || val === 'yes';
    }

    // Dias da Semana (0-6 ou nomes)
    let daysOfWeek = [1, 2, 3, 4, 5]; // Padrão Seg-Sex
    if (daysIdx !== -1 && row[daysIdx]) {
      const rawDays = row[daysIdx].split(/[,;]/).map((d) => d.trim().toLowerCase());
      const parsedDays: number[] = [];
      for (const d of rawDays) {
        if (/^[0-6]$/.test(d)) {
          parsedDays.push(parseInt(d, 10));
        } else if (d.startsWith('dom')) parsedDays.push(0);
        else if (d.startsWith('seg')) parsedDays.push(1);
        else if (d.startsWith('ter')) parsedDays.push(2);
        else if (d.startsWith('qua')) parsedDays.push(3);
        else if (d.startsWith('qui')) parsedDays.push(4);
        else if (d.startsWith('sex')) parsedDays.push(5);
        else if (d.startsWith('s') && d.includes('b')) parsedDays.push(6);
      }
      if (parsedDays.length > 0) {
        daysOfWeek = Array.from(new Set(parsedDays)).sort();
      }
    }

    // Minutos Alvo
    let targetMinutes = 30;
    if (targetIdx !== -1 && row[targetIdx]) {
      const num = parseInt(row[targetIdx].replace(/\D/g, ''), 10);
      if (!isNaN(num) && num > 0) targetMinutes = num;
    }

    // Tags
    const tags = tagsIdx !== -1 && row[tagsIdx] ? row[tagsIdx].split(/[,;]/).map((t) => t.trim()).filter(Boolean) : [];

    tasks.push({
      id: `task_csv_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`,
      title,
      description: descIdx !== -1 ? row[descIdx] || '' : '',
      startTime,
      endTime,
      routineTypeId,
      categoryId,
      isGoldenRule,
      daysOfWeek,
      targetMinutes,
      tags,
      notes: notesIdx !== -1 ? row[notesIdx] || '' : '',
      isCustom: true,
    });
  }

  return { tasks, errors: [], warnings };
}

// ==========================================
// 4. EXPORTAÇÃO E IMPORTAÇÃO EM JSON
// ==========================================

export function generateJsonExport(
  state: {
    routineTypes: RoutineType[];
    categories: Category[];
    tasks: Task[];
    logs: Record<string, TaskLog>;
    backlog: BacklogItem[];
    notes: Note[];
    reminderSettings?: ReminderSettings;
    backupSettings?: BackupSettings;
  },
  appVersion = CURRENT_APP_VERSION
): FlowExportPayload {
  return {
    version: '1.0',
    appName: 'Flow',
    appVersion,
    exportedAt: new Date().toISOString(),
    stats: {
      tasksCount: state.tasks?.length || 0,
      completionsCount: Object.keys(state.logs || {}).length,
      backlogCount: state.backlog?.length || 0,
      notesCount: state.notes?.length || 0,
      routineTypesCount: state.routineTypes?.length || 0,
      categoriesCount: state.categories?.length || 0,
    },
    data: {
      routineTypes: state.routineTypes || [],
      categories: state.categories || [],
      tasks: state.tasks || [],
      logs: state.logs || {},
      backlog: state.backlog || [],
      notes: state.notes || [],
      reminderSettings: state.reminderSettings,
      backupSettings: state.backupSettings,
    },
  };
}

/**
 * Valida o conteúdo bruto de um arquivo JSON para importação
 */
export function validateJsonImport(raw: string | unknown): ImportValidationResult {
  let parsed: any;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { isValid: false, error: 'O arquivo não é um JSON válido. Verifique a sintaxe.' };
    }
  } else {
    parsed = raw;
  }

  if (!parsed || typeof parsed !== 'object') {
    return { isValid: false, error: 'O conteúdo importado deve ser um objeto JSON.' };
  }

  // Suporte a formato com envelope { data: { ... } } ou formato plano direto
  const data = parsed.data && typeof parsed.data === 'object' ? parsed.data : parsed;

  const warnings: string[] = [];

  // Checagem de compatibilidade de campos
  const hasTasks = Array.isArray(data.tasks);
  const hasCategories = Array.isArray(data.categories);
  const hasRoutineTypes = Array.isArray(data.routineTypes);
  const hasLogs = data.logs && typeof data.logs === 'object' && !Array.isArray(data.logs);
  const hasBacklog = Array.isArray(data.backlog);
  const hasNotes = Array.isArray(data.notes);

  if (!hasTasks && !hasCategories && !hasRoutineTypes && !hasLogs && !hasBacklog && !hasNotes) {
    return {
      isValid: false,
      error: 'Nenhuma estrutura de dados reconhecida do Flow foi encontrada (tasks, categories, logs, etc.).',
    };
  }

  if (!hasTasks) warnings.push('Nenhuma lista de tarefas (tasks) encontrada.');
  if (!hasCategories) warnings.push('Nenhuma categoria (categories) encontrada.');
  if (!hasRoutineTypes) warnings.push('Nenhum tipo de rotina (routineTypes) encontrado.');

  const sanitizedData: FlowExportPayload['data'] = {
    routineTypes: hasRoutineTypes ? data.routineTypes : [],
    categories: hasCategories ? data.categories : [],
    tasks: hasTasks ? data.tasks : [],
    logs: hasLogs ? data.logs : {},
    backlog: hasBacklog ? data.backlog : [],
    notes: hasNotes ? data.notes : [],
    reminderSettings: data.reminderSettings,
    backupSettings: data.backupSettings,
  };

  const summary = {
    tasksCount: sanitizedData.tasks.length,
    completionsCount: Object.keys(sanitizedData.logs).length,
    backlogCount: sanitizedData.backlog.length,
    notesCount: sanitizedData.notes.length,
    routineTypesCount: sanitizedData.routineTypes.length,
    categoriesCount: sanitizedData.categories.length,
  };

  return {
    isValid: true,
    warnings,
    summary,
    sanitizedData,
  };
}

/**
 * Mescla ou substitui os dados importados no estado do Flow
 */
export function applyImport(
  imported: FlowExportPayload['data'],
  mode: ImportMode,
  current: FlowState
): {
  nextState: Partial<FlowState>;
  stats: ImportExecutionResult['stats'];
} {
  if (mode === 'replace') {
    const nextRoutineTypes =
      imported.routineTypes && imported.routineTypes.length > 0 ? imported.routineTypes : DEFAULT_ROUTINE_TYPES;

    const nextCategories =
      imported.categories && imported.categories.length > 0 ? imported.categories : DEFAULT_CATEGORIES;

    const nextTasks = imported.tasks || [];
    const nextLogs = imported.logs || {};
    const nextBacklog = imported.backlog || [];
    const nextNotes = imported.notes || [];

    const stats = {
      tasks: nextTasks.length,
      completions: Object.keys(nextLogs).length,
      backlog: nextBacklog.length,
      notes: nextNotes.length,
      routineTypes: nextRoutineTypes.length,
      categories: nextCategories.length,
    };

    return {
      nextState: {
        routineTypes: nextRoutineTypes,
        categories: nextCategories,
        tasks: nextTasks,
        logs: nextLogs,
        backlog: nextBacklog,
        notes: nextNotes,
      },
      stats,
    };
  }

  // Modo 'merge': combina com os dados atuais evitando duplicação por ID
  const mergeById = <T extends { id: string }>(currentList: T[] = [], incomingList: T[] = []): T[] => {
    const map = new Map<string, T>();
    for (const item of currentList) {
      map.set(item.id, item);
    }
    for (const item of incomingList) {
      map.set(item.id, item);
    }
    return Array.from(map.values());
  };

  const mergedRoutineTypes = mergeById(current.routineTypes, imported.routineTypes);
  const mergedCategories = mergeById(current.categories, imported.categories);
  const mergedTasks = mergeById(current.tasks, imported.tasks);
  const mergedBacklog = mergeById(current.backlog, imported.backlog);
  const mergedNotes = mergeById(current.notes, imported.notes);
  const mergedLogs = { ...(current.logs || {}), ...(imported.logs || {}) };

  const stats = {
    tasks: imported.tasks?.length || 0,
    completions: Object.keys(imported.logs || {}).length,
    backlog: imported.backlog?.length || 0,
    notes: imported.notes?.length || 0,
    routineTypes: imported.routineTypes?.length || 0,
    categories: imported.categories?.length || 0,
  };

  return {
    nextState: {
      routineTypes: mergedRoutineTypes,
      categories: mergedCategories,
      tasks: mergedTasks,
      logs: mergedLogs,
      backlog: mergedBacklog,
      notes: mergedNotes,
    },
    stats,
  };
}

/**
 * Executa a importação completa: atualiza Zustand e persiste no SQLite
 */
export async function executeImport({
  data,
  mode,
  currentState,
}: {
  data: FlowExportPayload['data'];
  mode: ImportMode;
  currentState?: FlowState;
}): Promise<ImportExecutionResult> {
  try {
    const current = currentState || useFlowStore.getState();
    const { nextState, stats } = applyImport(data, mode, current);

    // 1. Atualiza estado em memória do Zustand
    useFlowStore.setState(nextState);

    // 2. Persiste imediatamente no banco SQLite nativo
    await syncStateToDb(nextState);

    return {
      success: true,
      mode,
      stats,
    };
  } catch (err: any) {
    return {
      success: false,
      mode,
      stats: { tasks: 0, completions: 0, backlog: 0, notes: 0, routineTypes: 0, categories: 0 },
      error: err?.message || 'Falha ao sincronizar dados importados.',
    };
  }
}

// ==========================================
// 5. DOWNLOADERS (BROWSER / TAURI COMPATIBLE)
// ==========================================

/**
 * Dispara o download de um arquivo com segurança no ambiente web / Tauri
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  if (typeof document === 'undefined') return;

  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.warn('Falha ao disparar download de arquivo:', e);
  }
}

/**
 * Helper para gerar timestamp formatado em nomes de arquivos (YYYY-MM-DD_HHmmss)
 */
export function getFileTimestamp(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}_${hh}${min}${ss}`;
}

export function downloadJsonExport(payload: FlowExportPayload, filename?: string): void {
  const ts = getFileTimestamp();
  const name = filename || `flow_export_${ts}.json`;
  const jsonStr = JSON.stringify(payload, null, 2);
  downloadFile(jsonStr, name, 'application/json;charset=utf-8');
}

export function downloadCsv(csvContent: string, filename: string): void {
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
}

export function downloadAllCsvs(
  state: {
    tasks: Task[];
    logs: Record<string, TaskLog>;
    notes: Note[];
    backlog: BacklogItem[];
    routineTypes: RoutineType[];
    categories: Category[];
  },
  prefix = 'flow'
): void {
  const ts = getFileTimestamp();
  const tasksCsv = generateTasksCsv(state.tasks, state.routineTypes, state.categories);
  const logsCsv = generateCompletionsCsv(state.logs, state.tasks, state.categories);
  const notesCsv = generateNotesCsv(state.notes);
  const backlogCsv = generateBacklogCsv(state.backlog, state.categories);

  downloadCsv(tasksCsv, `${prefix}_tarefas_${ts}.csv`);
  downloadCsv(logsCsv, `${prefix}_historico_${ts}.csv`);
  downloadCsv(notesCsv, `${prefix}_notas_${ts}.csv`);
  downloadCsv(backlogCsv, `${prefix}_backlog_${ts}.csv`);
}

export function downloadSqlExport(
  routineTypes: RoutineType[],
  categories: Category[],
  tasks: Task[],
  logs: Record<string, TaskLog>,
  backlog: BacklogItem[],
  notes: Note[] = [],
  filename?: string
): void {
  const ts = getFileTimestamp();
  const name = filename || `flow_database_dump_${ts}.sql`;
  const dump = generateSqlDump(routineTypes, categories, tasks, logs, backlog, notes);
  downloadFile(dump, name, 'text/plain;charset=utf-8');
}
