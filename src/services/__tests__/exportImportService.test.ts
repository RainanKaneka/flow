import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  escapeCsvField,
  formatCsvRow,
  parseCsv,
  generateTasksCsv,
  generateCompletionsCsv,
  generateNotesCsv,
  generateBacklogCsv,
  parseTasksFromCsv,
  generateJsonExport,
  validateJsonImport,
  applyImport,
  executeImport,
  downloadFile,
  downloadJsonExport,
  downloadCsv,
  downloadAllCsvs,
  downloadSqlExport,
  CSV_BOM,
} from '../exportImportService';
import { Task, RoutineType, Category, TaskLog, BacklogItem, Note, FlowState } from '../../types/routine';
import { useFlowStore } from '../../store/useFlowStore';
import * as dbService from '../dbService';

describe('exportImportService', () => {
  const mockRoutineTypes: RoutineType[] = [
    { id: 'rt_work', name: 'Trabalho Focado', description: 'Rotina de alta produção', color: '#6366F1' },
    { id: 'rt_health', name: 'Saúde & Treino', description: 'Rotina física', color: '#10B981' },
  ];

  const mockCategories: Category[] = [
    { id: 'cat_code', name: 'Desenvolvimento', color: '#3B82F6' },
    { id: 'cat_exercise', name: 'Exercício', color: '#EF4444' },
  ];

  const mockTasks: Task[] = [
    {
      id: 'task_1',
      title: 'Desenvolver Feature',
      description: 'Implementar export/import em JSON e CSV, com suporte a "aspas" e quebras.',
      startTime: '09:00',
      endTime: '11:00',
      routineTypeId: 'rt_work',
      categoryId: 'cat_code',
      isGoldenRule: true,
      daysOfWeek: [1, 2, 3, 4, 5],
      targetMinutes: 120,
      tags: ['feature', 'foco'],
      notes: 'Notas de teste',
      isCustom: true,
    },
    {
      id: 'task_2',
      title: 'Treino de Cardio',
      description: 'Corrida matinal',
      startTime: '07:00',
      endTime: '07:45',
      routineTypeId: 'rt_health',
      categoryId: 'cat_exercise',
      isGoldenRule: false,
      daysOfWeek: [1, 3, 5],
      targetMinutes: 45,
      tags: ['saúde'],
    },
  ];

  const mockLogs: Record<string, TaskLog> = {
    '2026-09-24_task_1': {
      id: '2026-09-24_task_1',
      taskId: 'task_1',
      date: '2026-09-24',
      completed: true,
      completedAt: '10:45:00',
      timeSpentMinutes: 105,
    },
  };

  const mockBacklog: BacklogItem[] = [
    {
      id: 'backlog_1',
      title: 'Refatorar CSS Modules',
      description: 'Limpar styles inline residuais',
      categoryId: 'cat_code',
      targetMinutes: 60,
      tags: ['refactor'],
      createdAt: '2026-09-24T10:00:00.000Z',
    },
  ];

  const mockNotes: Note[] = [
    {
      id: 'note_1',
      title: 'Ideias de Produto',
      content: 'Roadmap da Fase 2 e Fase 3',
      tags: ['ideias', 'roadmap'],
      color: '#F59E0B',
      createdAt: '2026-09-24T09:00:00.000Z',
      updatedAt: '2026-09-24T09:30:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CSV Utilities', () => {
    it('deve escapar campos simples sem alteração', () => {
      expect(escapeCsvField('Texto simples')).toBe('Texto simples');
      expect(escapeCsvField(123)).toBe('123');
      expect(escapeCsvField(null)).toBe('');
      expect(escapeCsvField(undefined)).toBe('');
    });

    it('deve escapar campos com vírgulas, ponto e vírgula ou quebras de linha', () => {
      expect(escapeCsvField('Item, com vírgula')).toBe('"Item, com vírgula"');
      expect(escapeCsvField('Item; com ponto e vírgula')).toBe('"Item; com ponto e vírgula"');
      expect(escapeCsvField('Item com\nlinha')).toBe('"Item com\nlinha"');
    });

    it('deve duplicar aspas internas e envolver em aspas', () => {
      expect(escapeCsvField('Texto com "aspas"')).toBe('"Texto com ""aspas"""');
    });

    it('deve formatar linha completa de CSV', () => {
      const row = formatCsvRow(['ID1', 'Tarefa "A"', '09:00', 30]);
      expect(row).toBe('ID1,"Tarefa ""A""",09:00,30');
    });

    it('deve fazer parsing correto de texto CSV respeitando aspas e quebras', () => {
      const csv = `ID,Título,Descrição\n1,"Atividade, com vírgula","Linha 1\nLinha 2"\n2,"Com ""aspas""",Nota`;
      const parsed = parseCsv(csv);

      expect(parsed).toHaveLength(3);
      expect(parsed[0]).toEqual(['ID', 'Título', 'Descrição']);
      expect(parsed[1]).toEqual(['1', 'Atividade, com vírgula', 'Linha 1\nLinha 2']);
      expect(parsed[2]).toEqual(['2', 'Com "aspas"', 'Nota']);
    });
  });

  describe('CSV Generators', () => {
    it('deve gerar CSV de tarefas com cabeçalhos e mapeamento correto de tipos e categorias', () => {
      const csv = generateTasksCsv(mockTasks, mockRoutineTypes, mockCategories);

      expect(csv.startsWith(CSV_BOM)).toBe(true);
      expect(csv).toContain('ID,Título,Descrição,Horário Início,Horário Fim');
      expect(csv).toContain('Desenvolver Feature');
      expect(csv).toContain('Trabalho Focado');
      expect(csv).toContain('Desenvolvimento');
      expect(csv).toContain('Sim'); // isGoldenRule
      expect(csv).toContain('Seg; Ter; Qua; Qui; Sex');
    });

    it('deve gerar CSV de conclusões com título da tarefa mapeado', () => {
      const csv = generateCompletionsCsv(mockLogs, mockTasks, mockCategories);

      expect(csv.startsWith(CSV_BOM)).toBe(true);
      expect(csv).toContain('ID,Data,ID da Tarefa,Título da Tarefa,Categoria,Concluído');
      expect(csv).toContain('2026-09-24');
      expect(csv).toContain('Desenvolver Feature');
      expect(csv).toContain('105');
    });

    it('deve gerar CSV de notas com tags e conteúdo', () => {
      const csv = generateNotesCsv(mockNotes);

      expect(csv.startsWith(CSV_BOM)).toBe(true);
      expect(csv).toContain('ID,Título,Conteúdo,Tags,Cor,Criado Em,Atualizado Em');
      expect(csv).toContain('Ideias de Produto');
      expect(csv).toContain('Roadmap da Fase 2 e Fase 3');
      expect(csv).toContain('ideias; roadmap');
    });

    it('deve gerar CSV de backlog com categoria mapeada', () => {
      const csv = generateBacklogCsv(mockBacklog, mockCategories);

      expect(csv.startsWith(CSV_BOM)).toBe(true);
      expect(csv).toContain('ID,Título,Descrição,Categoria,Minutos Alvo');
      expect(csv).toContain('Refatorar CSS Modules');
      expect(csv).toContain('Desenvolvimento');
    });
  });

  describe('parseTasksFromCsv', () => {
    it('deve retornar erro se CSV estiver vazio', () => {
      const res = parseTasksFromCsv('', mockRoutineTypes, mockCategories);
      expect(res.errors.length).toBeGreaterThan(0);
      expect(res.tasks).toHaveLength(0);
    });

    it('deve retornar erro se cabeçalho não tiver coluna de título', () => {
      const csv = `Data,Horário\n2026-09-24,09:00`;
      const res = parseTasksFromCsv(csv, mockRoutineTypes, mockCategories);
      expect(res.errors[0]).toContain('Não foi encontrada uma coluna de "Título"');
    });

    it('deve importar tarefas de CSV com cabeçalhos em português', () => {
      const csv = `Título,Descrição,Início,Fim,Rotina,Categoria,Minutos\nNova Tarefa,Descrição teste,10:00,11:00,Trabalho Focado,Desenvolvimento,60`;
      const res = parseTasksFromCsv(csv, mockRoutineTypes, mockCategories);

      expect(res.errors).toHaveLength(0);
      expect(res.tasks).toHaveLength(1);
      expect(res.tasks[0].title).toBe('Nova Tarefa');
      expect(res.tasks[0].startTime).toBe('10:00');
      expect(res.tasks[0].endTime).toBe('11:00');
      expect(res.tasks[0].routineTypeId).toBe('rt_work');
      expect(res.tasks[0].categoryId).toBe('cat_code');
      expect(res.tasks[0].targetMinutes).toBe(60);
    });

    it('deve importar tarefas de CSV com cabeçalhos em inglês', () => {
      const csv = `Title,Description,Start,End\nEnglish Task,Import from English columns,08:30,09:15`;
      const res = parseTasksFromCsv(csv, mockRoutineTypes, mockCategories);

      expect(res.errors).toHaveLength(0);
      expect(res.tasks).toHaveLength(1);
      expect(res.tasks[0].title).toBe('English Task');
      expect(res.tasks[0].startTime).toBe('08:30');
      expect(res.tasks[0].endTime).toBe('09:15');
    });
  });

  describe('JSON Export and Validation', () => {
    it('deve gerar payload de exportação com estatísticas e dados completos', () => {
      const payload = generateJsonExport({
        routineTypes: mockRoutineTypes,
        categories: mockCategories,
        tasks: mockTasks,
        logs: mockLogs,
        backlog: mockBacklog,
        notes: mockNotes,
      });

      expect(payload.appName).toBe('Flow');
      expect(payload.version).toBe('1.0');
      expect(payload.stats.tasksCount).toBe(2);
      expect(payload.stats.completionsCount).toBe(1);
      expect(payload.stats.backlogCount).toBe(1);
      expect(payload.stats.notesCount).toBe(1);
      expect(payload.data.tasks).toHaveLength(2);
    });

    it('deve validar JSON exportado com sucesso', () => {
      const payload = generateJsonExport({
        routineTypes: mockRoutineTypes,
        categories: mockCategories,
        tasks: mockTasks,
        logs: mockLogs,
        backlog: mockBacklog,
        notes: mockNotes,
      });

      const validation = validateJsonImport(JSON.stringify(payload));
      expect(validation.isValid).toBe(true);
      expect(validation.summary?.tasksCount).toBe(2);
      expect(validation.sanitizedData?.tasks).toHaveLength(2);
    });

    it('deve aceitar JSON de dump plano legado', () => {
      const directDump = {
        tasks: mockTasks,
        categories: mockCategories,
        routineTypes: mockRoutineTypes,
      };

      const validation = validateJsonImport(JSON.stringify(directDump));
      expect(validation.isValid).toBe(true);
      expect(validation.summary?.tasksCount).toBe(2);
    });

    it('deve rejeitar string JSON inválida', () => {
      const validation = validateJsonImport('{ json invalido');
      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('JSON válido');
    });

    it('deve rejeitar JSON sem estruturas reconhecidas', () => {
      const validation = validateJsonImport(JSON.stringify({ irrelevantField: true }));
      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('Nenhuma estrutura de dados reconhecida');
    });
  });

  describe('applyImport & executeImport', () => {
    const currentState: FlowState = {
      activeView: 'routine',
      selectedDate: '2026-09-24',
      theme: 'dark',
      routineTypes: mockRoutineTypes,
      selectedRoutineTypeId: 'rt_work',
      categories: mockCategories,
      activeCategoryIdFilter: 'all',
      tasks: [mockTasks[0]],
      logs: {},
      backlog: [],
      notes: [],
      pomodoro: {
        isActive: false,
        timeLeftSeconds: 1500,
        totalDurationSeconds: 1500,
        mode: 'focus',
        linkedTaskId: null,
        completedSessions: 0,
      },
      reminderSettings: { enabled: true, advanceMinutes: 5, soundEnabled: true },
      isNotificationModalOpen: false,
      backupSettings: {
        enabled: true,
        folderPath: 'C:/Backups',
        lastBackupDate: null,
        lastBackupTime: null,
        lastBackupStatus: null,
        lastBackupFileName: null,
        lastBackupError: null,
        autoRetentionCount: 30,
      },
      isBackupModalOpen: false,
      backupModalTab: 'backup',
      availableUpdate: null,
      isUpdateModalOpen: false,
      googleUser: null,
      geminiConfig: { apiKey: '', model: 'gemini-2.5-flash', isConnected: false },
      aiMessages: [],
      isGoogleAuthModalOpen: false,
      isTaskModalOpen: false,
      editingTask: null,
      promoteBacklogModalItem: null,
      isManageRoutinesModalOpen: false,
      isManageCategoriesModalOpen: false,
      selectedTaskIdForDetail: null,
    };

    it('deve aplicar import no modo "replace"', () => {
      const importedData = {
        routineTypes: mockRoutineTypes,
        categories: mockCategories,
        tasks: [mockTasks[1]],
        logs: mockLogs,
        backlog: mockBacklog,
        notes: mockNotes,
      };

      const result = applyImport(importedData, 'replace', currentState);
      expect(result.nextState.tasks).toHaveLength(1);
      expect(result.nextState.tasks?.[0].id).toBe('task_2');
      expect(result.nextState.notes).toHaveLength(1);
      expect(result.stats.tasks).toBe(1);
    });

    it('deve aplicar import no modo "merge" combinando itens por ID', () => {
      const importedData = {
        routineTypes: mockRoutineTypes,
        categories: mockCategories,
        tasks: [
          // Atualiza task_1 com novo título
          { ...mockTasks[0], title: 'Tarefa 1 Atualizada' },
          // Adiciona task_2
          mockTasks[1],
        ],
        logs: mockLogs,
        backlog: mockBacklog,
        notes: mockNotes,
      };

      const result = applyImport(importedData, 'merge', currentState);
      expect(result.nextState.tasks).toHaveLength(2);
      const updatedTask1 = result.nextState.tasks?.find((t) => t.id === 'task_1');
      expect(updatedTask1?.title).toBe('Tarefa 1 Atualizada');
    });

    it('deve persistir no SQLite e atualizar a store ao chamar executeImport', async () => {
      const syncSpy = vi.spyOn(dbService, 'syncStateToDb').mockResolvedValue(undefined);

      const importedData = {
        routineTypes: mockRoutineTypes,
        categories: mockCategories,
        tasks: mockTasks,
        logs: mockLogs,
        backlog: mockBacklog,
        notes: mockNotes,
      };

      const execResult = await executeImport({
        data: importedData,
        mode: 'merge',
        currentState,
      });

      expect(execResult.success).toBe(true);
      expect(syncSpy).toHaveBeenCalledTimes(1);
      expect(useFlowStore.getState().tasks).toEqual(mockTasks);
    });
  });

  describe('Download Helpers', () => {
    it('deve criar link temporário e disparar download', () => {
      const appendSpy = vi.spyOn(document.body, 'appendChild');
      const removeSpy = vi.spyOn(document.body, 'removeChild');

      downloadFile('test content', 'test.txt', 'text/plain');

      expect(appendSpy).toHaveBeenCalled();
      expect(removeSpy).toHaveBeenCalled();
      expect(window.URL.createObjectURL).toHaveBeenCalled();
      expect(window.URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('deve chamar download com JSON formatado em downloadJsonExport', () => {
      const appendSpy = vi.spyOn(document.body, 'appendChild');

      const payload = generateJsonExport({
        routineTypes: mockRoutineTypes,
        categories: mockCategories,
        tasks: mockTasks,
        logs: mockLogs,
        backlog: mockBacklog,
        notes: mockNotes,
      });

      downloadJsonExport(payload);
      expect(appendSpy).toHaveBeenCalled();
    });

    it('deve disparar download individual de CSV em downloadCsv', () => {
      const appendSpy = vi.spyOn(document.body, 'appendChild');
      downloadCsv('header1,header2\nval1,val2', 'teste.csv');
      expect(appendSpy).toHaveBeenCalled();
    });

    it('deve disparar downloads de todas as planilhas CSV em downloadAllCsvs', () => {
      const appendSpy = vi.spyOn(document.body, 'appendChild');

      downloadAllCsvs({
        tasks: mockTasks,
        logs: mockLogs,
        notes: mockNotes,
        backlog: mockBacklog,
        routineTypes: mockRoutineTypes,
        categories: mockCategories,
      });

      // 4 chamadas para as 4 planilhas: tarefas, historico, notas, backlog
      expect(appendSpy).toHaveBeenCalledTimes(4);
    });

    it('deve disparar download SQL em downloadSqlExport', () => {
      const appendSpy = vi.spyOn(document.body, 'appendChild');

      downloadSqlExport(mockRoutineTypes, mockCategories, mockTasks, mockLogs, mockBacklog, mockNotes);

      expect(appendSpy).toHaveBeenCalledTimes(1);
    });
  });
});
