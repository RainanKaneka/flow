import { describe, it, expect, beforeEach } from 'vitest';
import { useFlowStore } from '../useFlowStore';

describe('Store Slices (Modularized Architecture)', () => {
  beforeEach(() => {
    useFlowStore.getState().resetToTemplate();
  });

  describe('uiSlice', () => {
    it('deve gerenciar navegação de abas e data selecionada', () => {
      expect(useFlowStore.getState().activeView).toBe('routine');

      useFlowStore.getState().setActiveView('dashboard');
      expect(useFlowStore.getState().activeView).toBe('dashboard');

      useFlowStore.getState().setDate('2026-10-15');
      expect(useFlowStore.getState().selectedDate).toBe('2026-10-15');
    });

    it('deve alternar tema claro e escuro', () => {
      const initialTheme = useFlowStore.getState().theme;
      useFlowStore.getState().toggleTheme();

      const nextTheme = useFlowStore.getState().theme;
      expect(nextTheme).not.toBe(initialTheme);
      expect(['light', 'dark']).toContain(nextTheme);
    });

    it('deve gerenciar abertura e fechamento de modais de controle de UI', () => {
      // Modal de Rotinas
      useFlowStore.getState().openManageRoutinesModal();
      expect(useFlowStore.getState().isManageRoutinesModalOpen).toBe(true);
      useFlowStore.getState().closeManageRoutinesModal();
      expect(useFlowStore.getState().isManageRoutinesModalOpen).toBe(false);

      // Modal de Categorias
      useFlowStore.getState().openManageCategoriesModal();
      expect(useFlowStore.getState().isManageCategoriesModalOpen).toBe(true);
      useFlowStore.getState().closeManageCategoriesModal();
      expect(useFlowStore.getState().isManageCategoriesModalOpen).toBe(false);

      // Modal de Tarefa
      useFlowStore.getState().openTaskModal();
      expect(useFlowStore.getState().isTaskModalOpen).toBe(true);
      useFlowStore.getState().closeTaskModal();
      expect(useFlowStore.getState().isTaskModalOpen).toBe(false);

      // Modal de Detalhes da Tarefa
      useFlowStore.getState().openTaskDetail('task_xyz');
      expect(useFlowStore.getState().selectedTaskIdForDetail).toBe('task_xyz');
      useFlowStore.getState().closeTaskDetail();
      expect(useFlowStore.getState().selectedTaskIdForDetail).toBeNull();
    });

    it('deve atualizar configurações de lembrete e modal de notificações', () => {
      useFlowStore.getState().updateReminderSettings({ advanceMinutes: 15, soundEnabled: false });
      const settings = useFlowStore.getState().reminderSettings;
      expect(settings.advanceMinutes).toBe(15);
      expect(settings.soundEnabled).toBe(false);

      useFlowStore.getState().openNotificationModal();
      expect(useFlowStore.getState().isNotificationModalOpen).toBe(true);
      useFlowStore.getState().closeNotificationModal();
      expect(useFlowStore.getState().isNotificationModalOpen).toBe(false);
    });

    it('deve gerenciar estado de updates do aplicativo', () => {
      const updateData = {
        hasUpdate: true,
        currentVersion: '0.1.6',
        latestVersion: '0.1.7',
        releaseName: 'v0.1.7',
        releaseNotes: 'Melhorias de estabilidade',
        downloadUrl: 'https://example.com/download.exe',
        releaseUrl: 'https://github.com/flow/releases/v0.1.7',
      };

      useFlowStore.getState().setAvailableUpdate(updateData);
      expect(useFlowStore.getState().availableUpdate?.latestVersion).toBe('0.1.7');
      expect(useFlowStore.getState().isUpdateModalOpen).toBe(true);

      useFlowStore.getState().closeUpdateModal();
      expect(useFlowStore.getState().isUpdateModalOpen).toBe(false);
    });
  });

  describe('routineSlice', () => {
    it('deve gerenciar tipos de rotina', () => {
      const initialCount = useFlowStore.getState().routineTypes.length;

      useFlowStore.getState().addRoutineType({
        name: 'Rotina de Estudos Noturnos',
        description: 'Foco acadêmico',
        color: '#8B5CF6',
        isDefault: false,
      });

      const types = useFlowStore.getState().routineTypes;
      expect(types).toHaveLength(initialCount + 1);

      const created = types.find((r) => r.name === 'Rotina de Estudos Noturnos');
      expect(created).toBeDefined();

      if (created) {
        useFlowStore.getState().updateRoutineType(created.id, { name: 'Estudos Noturnos V2' });
        const updated = useFlowStore.getState().routineTypes.find((r) => r.id === created.id);
        expect(updated?.name).toBe('Estudos Noturnos V2');
      }
    });

    it('deve gerenciar categorias e filtro ativo', () => {
      useFlowStore.getState().setCategoryIdFilter('saude');
      expect(useFlowStore.getState().activeCategoryIdFilter).toBe('saude');

      useFlowStore.getState().addCategory({
        name: 'Idiomas',
        color: '#EC4899',
        icon: 'Book',
      });

      const categories = useFlowStore.getState().categories;
      const found = categories.find((c) => c.name === 'Idiomas');
      expect(found).toBeDefined();

      if (found) {
        useFlowStore.getState().updateCategory(found.id, { color: '#F43F5E' });
        const updated = useFlowStore.getState().categories.find((c) => c.id === found.id);
        expect(updated?.color).toBe('#F43F5E');
      }
    });
  });

  describe('taskSlice', () => {
    it('deve criar e editar tarefas preservando dados', () => {
      useFlowStore.getState().saveTask({
        title: 'Nova Tarefa de Teste',
        description: 'Descrição de teste',
        startTime: '14:00',
        endTime: '15:00',
        routineTypeId: 'main_routine',
        categoryId: 'work',
        daysOfWeek: [1, 2, 3],
        targetMinutes: 60,
        tags: ['teste'],
      });

      const tasks = useFlowStore.getState().tasks;
      const created = tasks.find((t) => t.title === 'Nova Tarefa de Teste');
      expect(created).toBeDefined();
      expect(created?.isCustom).toBe(true);

      // Editar
      if (created) {
        useFlowStore.getState().saveTask({
          id: created.id,
          title: 'Nova Tarefa Editada',
          startTime: '14:30',
          endTime: '15:30',
          routineTypeId: created.routineTypeId,
          categoryId: created.categoryId,
          daysOfWeek: created.daysOfWeek,
          targetMinutes: 60,
          tags: created.tags,
        });

        const updated = useFlowStore.getState().tasks.find((t) => t.id === created.id);
        expect(updated?.title).toBe('Nova Tarefa Editada');
        expect(updated?.startTime).toBe('14:30');
      }
    });

    it('deve gerenciar checklist de tarefas', () => {
      useFlowStore.getState().saveTask({
        title: 'Tarefa com Checklist',
        startTime: '10:00',
        endTime: '11:00',
        routineTypeId: 'main_routine',
        categoryId: 'work',
        daysOfWeek: [1],
        targetMinutes: 60,
        tags: [],
      });

      const task = useFlowStore.getState().tasks.find((t) => t.title === 'Tarefa com Checklist')!;

      useFlowStore.getState().updateTaskSpecifications(task.id, {
        checklist: [
          { id: 'item_1', title: 'Passo 1', completed: false },
          { id: 'item_2', title: 'Passo 2', completed: false },
        ],
      });

      let updatedTask = useFlowStore.getState().tasks.find((t) => t.id === task.id)!;
      expect(updatedTask.checklist).toHaveLength(2);

      useFlowStore.getState().toggleChecklistItem(task.id, 'item_1');
      updatedTask = useFlowStore.getState().tasks.find((t) => t.id === task.id)!;
      expect(updatedTask.checklist?.[0].completed).toBe(true);
      expect(updatedTask.checklist?.[1].completed).toBe(false);
    });
  });

  describe('backlogSlice & Cross-Slice Interactions', () => {
    it('deve mover tarefa para o backlog e remover log da data', () => {
      const task = useFlowStore.getState().tasks[0];
      const selectedDate = useFlowStore.getState().selectedDate;

      // Completa primeiro para gerar log
      useFlowStore.getState().toggleTaskCompletion(task.id, selectedDate);
      const key = `${selectedDate}_${task.id}`;
      expect(useFlowStore.getState().logs[key]?.completed).toBe(true);

      // Move para backlog
      useFlowStore.getState().moveTaskToBacklog(task.id, selectedDate);

      expect(useFlowStore.getState().logs[key]).toBeUndefined();
      const inBacklog = useFlowStore.getState().backlog.find((b) => b.originalTaskId === task.id);
      expect(inBacklog).toBeDefined();
      expect(inBacklog?.title).toBe(task.title);
    });

    it('deve promover item do backlog para tarefa agendada', () => {
      useFlowStore.getState().addBacklogItem({
        title: 'Estudar Rust',
        description: 'Capítulo de Ownership',
        categoryId: 'study',
        targetMinutes: 45,
        tags: ['tech'],
      });

      const backlogItem = useFlowStore.getState().backlog.find((b) => b.title === 'Estudar Rust')!;
      expect(backlogItem).toBeDefined();

      useFlowStore.getState().promoteBacklogToTask(backlogItem.id, '16:00', '16:45');

      expect(useFlowStore.getState().backlog.find((b) => b.id === backlogItem.id)).toBeUndefined();
      const promotedTask = useFlowStore.getState().tasks.find((t) => t.title === 'Estudar Rust');
      expect(promotedTask).toBeDefined();
      expect(promotedTask?.startTime).toBe('16:00');
      expect(promotedTask?.endTime).toBe('16:45');
      expect(useFlowStore.getState().activeView).toBe('routine');
    });
  });

  describe('notesSlice', () => {
    it('deve criar, editar e excluir notas', () => {
      const initialCount = useFlowStore.getState().notes.length;

      useFlowStore.getState().addNote({
        title: 'Minhas Metas Semanais',
        content: '1. Concluir roadmap fase 1\n2. Treinar 4x',
        tags: ['planejamento'],
        color: '#6366F1',
      });

      const notes = useFlowStore.getState().notes;
      expect(notes).toHaveLength(initialCount + 1);

      const added = notes.find((n) => n.title === 'Minhas Metas Semanais')!;
      expect(added).toBeDefined();

      useFlowStore.getState().updateNote(added.id, { title: 'Metas Atualizadas' });
      expect(useFlowStore.getState().notes.find((n) => n.id === added.id)?.title).toBe(
        'Metas Atualizadas'
      );

      useFlowStore.getState().deleteNote(added.id);
      expect(useFlowStore.getState().notes.find((n) => n.id === added.id)).toBeUndefined();
    });

    it('deve converter anotação em tarefa da rotina', () => {
      useFlowStore.getState().addNote({
        title: 'Planejar Sprint de Release',
        content: 'Definir datas de corte e changelog.',
        tags: ['dev'],
        color: '#3B82F6',
      });

      const note = useFlowStore
        .getState()
        .notes.find((n) => n.title === 'Planejar Sprint de Release')!;

      useFlowStore.getState().convertNoteToTask(note.id, '09:00', '10:00');

      const convertedTask = useFlowStore
        .getState()
        .tasks.find((t) => t.title === 'Planejar Sprint de Release');
      expect(convertedTask).toBeDefined();
      expect(convertedTask?.startTime).toBe('09:00');
      expect(convertedTask?.endTime).toBe('10:00');
      expect(convertedTask?.targetMinutes).toBe(60);
      expect(useFlowStore.getState().activeView).toBe('routine');
    });
  });

  describe('pomodoroSlice', () => {
    it('deve controlar o timer de pomodoro e transição de modos', () => {
      useFlowStore.getState().setPomodoroMode('focus', 25 * 60);
      expect(useFlowStore.getState().pomodoro.mode).toBe('focus');
      expect(useFlowStore.getState().pomodoro.timeLeftSeconds).toBe(1500);

      useFlowStore.getState().startPomodoro();
      expect(useFlowStore.getState().pomodoro.isActive).toBe(true);

      useFlowStore.getState().tickPomodoro();
      expect(useFlowStore.getState().pomodoro.timeLeftSeconds).toBe(1499);

      useFlowStore.getState().pausePomodoro();
      expect(useFlowStore.getState().pomodoro.isActive).toBe(false);

      useFlowStore.getState().resetPomodoro();
      expect(useFlowStore.getState().pomodoro.timeLeftSeconds).toBe(1500);
    });

    it('deve registrar tempo focado na tarefa vinculada ao finalizar sessão', () => {
      const task = useFlowStore.getState().tasks[0];
      const selectedDate = useFlowStore.getState().selectedDate;
      const key = `${selectedDate}_${task.id}`;

      useFlowStore.getState().setPomodoroDuration(30 * 60); // 30 minutos
      useFlowStore.getState().linkTaskToPomodoro(task.id);
      useFlowStore.getState().startPomodoro();

      useFlowStore.getState().finishPomodoroSession();

      const log = useFlowStore.getState().logs[key];
      expect(log).toBeDefined();
      expect(log.timeSpentMinutes).toBe(30);

      // Transição automática para shortBreak
      expect(useFlowStore.getState().pomodoro.mode).toBe('shortBreak');
      expect(useFlowStore.getState().pomodoro.completedSessions).toBe(1);
    });
  });

  describe('aiSlice', () => {
    it('deve gerenciar credenciais Google e Gemini', () => {
      useFlowStore.getState().setGoogleUser({
        id: 'usr_abc',
        name: 'Rainan Dev',
        email: 'rainan@example.com',
        connectedAt: '22/09/2026',
      });
      expect(useFlowStore.getState().googleUser?.name).toBe('Rainan Dev');

      useFlowStore
        .getState()
        .setGeminiConfig({ apiKey: 'AIzaFakeTestKey', model: 'gemini-2.5-pro' });
      expect(useFlowStore.getState().geminiConfig.apiKey).toBe('AIzaFakeTestKey');
      expect(useFlowStore.getState().geminiConfig.model).toBe('gemini-2.5-pro');

      // Migração automática de gemini-2.0-flash para 2.5
      useFlowStore.getState().setGeminiConfig({ model: 'gemini-2.0-flash' });
      expect(useFlowStore.getState().geminiConfig.model).toBe('gemini-2.5-flash');
    });

    it('deve gerenciar histórico de mensagens de chat da IA', () => {
      useFlowStore.getState().addAiMessage({
        role: 'user',
        content: 'Como posso melhorar minha produtividade matinal?',
      });

      const msgs = useFlowStore.getState().aiMessages;
      expect(msgs.some((m) => m.content.includes('produtividade matinal'))).toBe(true);

      useFlowStore.getState().clearAiChat();
      const cleared = useFlowStore.getState().aiMessages;
      expect(cleared).toHaveLength(1);
      expect(cleared[0].content).toContain('Histórico limpo');
    });

    it('deve aplicar proposta de ação da IA para criar tarefa', () => {
      useFlowStore.getState().addAiMessage({
        role: 'assistant',
        content: 'Proponho criar a tarefa "Meditação Matinal"',
        actionProposal: {
          id: 'prop_create_1',
          type: 'create_task',
          description: 'Criar meditação',
          payload: {
            title: 'Meditação Mindfulness',
            startTime: '07:30',
            endTime: '07:50',
            routineTypeId: 'main_routine',
            categoryId: 'saude',
            targetMinutes: 20,
          },
        },
      });

      useFlowStore.getState().applyAiActionProposal('prop_create_1');

      const created = useFlowStore
        .getState()
        .tasks.find((t) => t.title === 'Meditação Mindfulness');
      expect(created).toBeDefined();
      expect(created?.targetMinutes).toBe(20);

      const msg = useFlowStore
        .getState()
        .aiMessages.find((m) => m.actionProposal?.id === 'prop_create_1');
      expect(msg?.actionProposal?.applied).toBe(true);
    });
  });
});
