import { describe, it, expect, beforeEach } from 'vitest';
import { useFlowStore } from '../useFlowStore';

describe('useFlowStore', () => {
  beforeEach(() => {
    // Reseta o store para o estado padrão limpo antes de cada teste
    useFlowStore.getState().resetToTemplate();
  });

  describe('Routine Types Management', () => {
    it('deve adicionar um novo tipo de rotina e selecioná-lo automaticamente', () => {
      const initialCount = useFlowStore.getState().routineTypes.length;

      useFlowStore.getState().addRoutineType({
        name: 'Rotina de Fim de Semana',
        description: 'Foco em descanso e projetos pessoais',
        color: '#10B981',
        icon: 'Coffee',
        isDefault: false,
      });

      const state = useFlowStore.getState();
      expect(state.routineTypes).toHaveLength(initialCount + 1);
      const added = state.routineTypes.find((r) => r.name === 'Rotina de Fim de Semana');
      expect(added).toBeDefined();
      expect(state.selectedRoutineTypeId).toBe(added?.id);
    });

    it('deve atualizar um tipo de rotina existente', () => {
      const routine = useFlowStore.getState().routineTypes[0];

      useFlowStore.getState().updateRoutineType(routine.id, {
        name: 'Rotina de Foco Extremo',
        color: '#EF4444',
      });

      const updated = useFlowStore.getState().routineTypes.find((r) => r.id === routine.id);
      expect(updated?.name).toBe('Rotina de Foco Extremo');
      expect(updated?.color).toBe('#EF4444');
    });

    it('deve excluir um tipo de rotina e reatribuir o tipo selecionado para o remanescente', () => {
      // Adiciona uma segunda rotina primeiro
      useFlowStore.getState().addRoutineType({
        name: 'Segunda Rotina',
        description: '',
        color: '#6366F1',
        icon: 'Calendar',
        isDefault: false,
      });

      const state = useFlowStore.getState();
      const targetId = state.selectedRoutineTypeId;
      const countBefore = state.routineTypes.length;

      useFlowStore.getState().deleteRoutineType(targetId);

      const stateAfter = useFlowStore.getState();
      expect(stateAfter.routineTypes).toHaveLength(countBefore - 1);
      expect(stateAfter.routineTypes.find((r) => r.id === targetId)).toBeUndefined();
      expect(stateAfter.selectedRoutineTypeId).not.toBe(targetId);
    });

    it('não deve excluir a última rotina existente', () => {
      // Deixa apenas 1 rotina
      while (useFlowStore.getState().routineTypes.length > 1) {
        const id = useFlowStore.getState().routineTypes[0].id;
        useFlowStore.getState().deleteRoutineType(id);
      }

      const onlyOneId = useFlowStore.getState().routineTypes[0].id;
      useFlowStore.getState().deleteRoutineType(onlyOneId);

      expect(useFlowStore.getState().routineTypes).toHaveLength(1);
    });
  });

  describe('Categories Management', () => {
    it('deve adicionar uma nova categoria', () => {
      const countBefore = useFlowStore.getState().categories.length;

      useFlowStore.getState().addCategory({
        name: 'Finanças & Investimentos',
        color: '#059669',
        icon: 'DollarSign',
      });

      const state = useFlowStore.getState();
      expect(state.categories).toHaveLength(countBefore + 1);
      expect(state.categories.some((c) => c.name === 'Finanças & Investimentos')).toBe(true);
    });

    it('deve atualizar categoria existente', () => {
      const cat = useFlowStore.getState().categories[0];
      useFlowStore.getState().updateCategory(cat.id, { name: 'Super Foco' });

      const updated = useFlowStore.getState().categories.find((c) => c.id === cat.id);
      expect(updated?.name).toBe('Super Foco');
    });

    it('deve excluir categoria e atualizar tarefas que a utilizavam para o fallback', () => {
      // Garante pelo menos duas categorias
      useFlowStore.getState().addCategory({
        name: 'Categoria Temporária',
        color: '#F43F5E',
        icon: 'Trash',
      });

      const state = useFlowStore.getState();
      const tempCat = state.categories.find((c) => c.name === 'Categoria Temporária')!;
      const otherCat = state.categories.find((c) => c.id !== tempCat.id)!;

      // Cria tarefa associada à categoria temporária
      useFlowStore.getState().saveTask({
        title: 'Tarefa com Categoria Temp',
        startTime: '10:00',
        endTime: '11:00',
        targetMinutes: 60,
        daysOfWeek: [1, 2, 3],
        categoryId: tempCat.id,
        routineTypeId: state.selectedRoutineTypeId,
      });

      useFlowStore.getState().deleteCategory(tempCat.id);

      const stateAfter = useFlowStore.getState();
      expect(stateAfter.categories.find((c) => c.id === tempCat.id)).toBeUndefined();

      const task = stateAfter.tasks.find((t) => t.title === 'Tarefa com Categoria Temp');
      expect(task?.categoryId).toBe(otherCat.id);
    });
  });

  describe('Tasks Management', () => {
    it('deve criar uma nova tarefa customizada', () => {
      const state = useFlowStore.getState();
      const countBefore = state.tasks.length;

      useFlowStore.getState().saveTask({
        title: 'Estudar Arquitetura de Software',
        startTime: '14:00',
        endTime: '15:30',
        targetMinutes: 90,
        daysOfWeek: [1, 3, 5],
        categoryId: state.categories[0].id,
        routineTypeId: state.selectedRoutineTypeId,
        isGoldenRule: true,
      });

      const stateAfter = useFlowStore.getState();
      expect(stateAfter.tasks).toHaveLength(countBefore + 1);

      const created = stateAfter.tasks.find((t) => t.title === 'Estudar Arquitetura de Software');
      expect(created).toBeDefined();
      expect(created?.id).toMatch(/^task_/);
      expect(created?.isCustom).toBe(true);
      expect(created?.targetMinutes).toBe(90);
    });

    it('deve editar uma tarefa existente preservando seu id', () => {
      const task = useFlowStore.getState().tasks[0];

      useFlowStore.getState().saveTask({
        ...task,
        title: 'Título Editado com Sucesso',
        targetMinutes: 45,
      });

      const updated = useFlowStore.getState().tasks.find((t) => t.id === task.id);
      expect(updated?.title).toBe('Título Editado com Sucesso');
      expect(updated?.targetMinutes).toBe(45);
    });

    it('deve excluir uma tarefa da lista', () => {
      const task = useFlowStore.getState().tasks[0];
      const countBefore = useFlowStore.getState().tasks.length;

      useFlowStore.getState().deleteTask(task.id);

      const stateAfter = useFlowStore.getState();
      expect(stateAfter.tasks).toHaveLength(countBefore - 1);
      expect(stateAfter.tasks.find((t) => t.id === task.id)).toBeUndefined();
    });

    it('deve alternar a conclusão de uma tarefa (toggleTaskCompletion) registrando log', () => {
      const task = useFlowStore.getState().tasks[0];
      const today = useFlowStore.getState().selectedDate;
      const logKey = `${today}_${task.id}`;

      // 1. Marca como concluída
      useFlowStore.getState().toggleTaskCompletion(task.id, today);

      let log = useFlowStore.getState().logs[logKey];
      expect(log).toBeDefined();
      expect(log.completed).toBe(true);
      expect(log.completedAt).toBeDefined();

      // 2. Desmarca a tarefa
      useFlowStore.getState().toggleTaskCompletion(task.id, today);

      log = useFlowStore.getState().logs[logKey];
      expect(log.completed).toBe(false);
    });

    it('deve atualizar especificações da tarefa e checklist', () => {
      const task = useFlowStore.getState().tasks[0];

      useFlowStore.getState().updateTaskSpecifications(task.id, {
        notes: 'Anotações importantes sobre a tarefa',
        checklist: [
          { id: 'chk-1', title: 'Passo 1', completed: false },
          { id: 'chk-2', title: 'Passo 2', completed: false },
        ],
      });

      let updatedTask = useFlowStore.getState().tasks.find((t) => t.id === task.id);
      expect(updatedTask?.notes).toBe('Anotações importantes sobre a tarefa');
      expect(updatedTask?.checklist).toHaveLength(2);

      // Alterna o checklist
      useFlowStore.getState().toggleChecklistItem(task.id, 'chk-1');

      updatedTask = useFlowStore.getState().tasks.find((t) => t.id === task.id);
      expect(updatedTask?.checklist?.find((i) => i.id === 'chk-1')?.completed).toBe(true);
    });
  });

  describe('Backlog Management', () => {
    it('deve adicionar item ao backlog', () => {
      useFlowStore.getState().addBacklogItem({
        title: 'Comprar teclado mecânico',
        description: 'Switches silenciosos',
        targetMinutes: 30,
        categoryId: 'trabalho',
        tags: ['hardware'],
        priority: 'high',
      });

      const backlog = useFlowStore.getState().backlog;
      expect(backlog).toHaveLength(1);
      expect(backlog[0].title).toBe('Comprar teclado mecânico');
      expect(backlog[0].id).toMatch(/^bk_/);
    });

    it('deve mover uma tarefa do dia para o backlog', () => {
      const task = useFlowStore.getState().tasks[0];

      useFlowStore.getState().moveTaskToBacklog(task.id);

      const backlog = useFlowStore.getState().backlog;
      expect(backlog.some((b) => b.title === task.title)).toBe(true);
    });

    it('deve promover um item do backlog para tarefa agendada', () => {
      useFlowStore.getState().addBacklogItem({
        title: 'Revisar PR pendente',
        description: 'Módulo de testes',
        targetMinutes: 45,
        categoryId: 'trabalho',
        tags: ['code-review'],
      });

      const backlogItem = useFlowStore.getState().backlog[0];

      useFlowStore
        .getState()
        .promoteBacklogToTask(
          backlogItem.id,
          '16:00',
          '16:45',
          useFlowStore.getState().selectedRoutineTypeId
        );

      const stateAfter = useFlowStore.getState();
      expect(stateAfter.backlog.find((b) => b.id === backlogItem.id)).toBeUndefined();

      const promotedTask = stateAfter.tasks.find((t) => t.title === 'Revisar PR pendente');
      expect(promotedTask).toBeDefined();
      expect(promotedTask?.startTime).toBe('16:00');
      expect(promotedTask?.endTime).toBe('16:45');
      expect(promotedTask?.tags).toContain('Do Backlog');
    });
  });

  describe('Notes (Bloco de Notas)', () => {
    it('deve adicionar, editar e excluir notas', () => {
      // 1. Add Note
      useFlowStore.getState().addNote({
        title: 'Anotação de Reunião',
        content: 'Decisões da sprint v0.2.0',
        tags: ['sprint', 'flow'],
        color: '#3B82F6',
      });

      let notes = useFlowStore.getState().notes;
      const created = notes.find((n) => n.title === 'Anotação de Reunião')!;
      expect(created).toBeDefined();

      // 2. Update Note
      useFlowStore.getState().updateNote(created.id, {
        content: 'Conteúdo atualizado com novos itens',
      });

      const updated = useFlowStore.getState().notes.find((n) => n.id === created.id);
      expect(updated?.content).toBe('Conteúdo atualizado com novos itens');

      // 3. Delete Note
      useFlowStore.getState().deleteNote(created.id);
      notes = useFlowStore.getState().notes;
      expect(notes.find((n) => n.id === created.id)).toBeUndefined();
    });

    it('deve converter uma nota em tarefa agendada na rotina', () => {
      useFlowStore.getState().addNote({
        title: 'Estudar TypeScript 5.8',
        content: 'Explorar novos recursos de tipo e compilação rápida.',
        tags: ['estudos'],
        color: '#8B5CF6',
      });

      const note = useFlowStore.getState().notes.find((n) => n.title === 'Estudar TypeScript 5.8')!;

      useFlowStore
        .getState()
        .convertNoteToTask(
          note.id,
          '10:00',
          '11:00',
          useFlowStore.getState().selectedRoutineTypeId,
          useFlowStore.getState().categories[0].id
        );

      const task = useFlowStore.getState().tasks.find((t) => t.title === 'Estudar TypeScript 5.8');
      expect(task).toBeDefined();
      expect(task?.startTime).toBe('10:00');
      expect(task?.endTime).toBe('11:00');
      expect(task?.targetMinutes).toBe(60);
      expect(task?.tags).toContain('estudos');
    });
  });

  describe('Pomodoro Timer Lifecycle', () => {
    it('deve iniciar, pausar e resetar o temporizador Pomodoro', () => {
      const task = useFlowStore.getState().tasks[0];

      // Inicia
      useFlowStore.getState().startPomodoro(task.id);
      let pomo = useFlowStore.getState().pomodoro;
      expect(pomo.isActive).toBe(true);
      expect(pomo.linkedTaskId).toBe(task.id);

      // Pausa
      useFlowStore.getState().pausePomodoro();
      pomo = useFlowStore.getState().pomodoro;
      expect(pomo.isActive).toBe(false);

      // Reseta
      useFlowStore.getState().resetPomodoro(30 * 60);
      pomo = useFlowStore.getState().pomodoro;
      expect(pomo.timeLeftSeconds).toBe(1800);
      expect(pomo.totalDurationSeconds).toBe(1800);
      expect(pomo.isActive).toBe(false);
    });

    it('deve decrementar o tempo a cada tickPomodoro', () => {
      useFlowStore.getState().startPomodoro();
      const initialSeconds = useFlowStore.getState().pomodoro.timeLeftSeconds;

      useFlowStore.getState().tickPomodoro();

      const currentSeconds = useFlowStore.getState().pomodoro.timeLeftSeconds;
      expect(currentSeconds).toBe(initialSeconds - 1);
    });

    it('deve concluir a sessão e alternar modo quando o timer zerar', () => {
      const task = useFlowStore.getState().tasks[0];
      useFlowStore.getState().startPomodoro(task.id);

      // Simula timer no último segundo
      useFlowStore.getState().resetPomodoro(1);
      useFlowStore.getState().startPomodoro(task.id);

      useFlowStore.getState().tickPomodoro();

      const pomo = useFlowStore.getState().pomodoro;
      expect(pomo.completedSessions).toBe(1);
      // Após modo focus, deve transicionar para pausa curta
      expect(pomo.mode).toBe('shortBreak');
      expect(pomo.isActive).toBe(false);
    });

    it('deve alternar modo Pomodoro manualmente', () => {
      useFlowStore.getState().setPomodoroMode('longBreak');
      const pomo = useFlowStore.getState().pomodoro;
      expect(pomo.mode).toBe('longBreak');
      expect(pomo.totalDurationSeconds).toBe(15 * 60);
    });
  });

  describe('AI Chat & Action Proposals', () => {
    it('deve adicionar mensagens de IA e limpar o chat', () => {
      useFlowStore.getState().addAiMessage({
        role: 'user',
        content: 'Como posso melhorar minha produtividade?',
      });

      useFlowStore.getState().addAiMessage({
        role: 'assistant',
        content: 'Divida seu dia em blocos de Deep Work e pausas Pomodoro.',
      });

      let messages = useFlowStore.getState().aiMessages;
      expect(messages.length).toBeGreaterThanOrEqual(2);

      useFlowStore.getState().clearAiChat();
      messages = useFlowStore.getState().aiMessages;
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toContain('Histórico limpo');
    });

    it('deve aplicar proposta de ação da IA para criar tarefa com data específica', () => {
      const proposalId = 'prop_create_task_123';

      useFlowStore.getState().addAiMessage({
        role: 'assistant',
        content: 'Criei uma proposta para você.',
        actionProposal: {
          id: proposalId,
          type: 'create_task',
          description: 'Criar tarefa limpar filtro no dia 25/09',
          payload: {
            title: 'Limpar filtro de ar',
            startTime: '10:00',
            endTime: '10:45',
            targetMinutes: 45,
            specificDate: '2026-09-25',
            categoryId: useFlowStore.getState().categories[0].id,
            routineTypeId: useFlowStore.getState().selectedRoutineTypeId,
          },
          applied: false,
        },
      });

      useFlowStore.getState().applyAiActionProposal(proposalId);

      const state = useFlowStore.getState();
      const createdTask = state.tasks.find((t) => t.title === 'Limpar filtro de ar');
      expect(createdTask).toBeDefined();
      expect(createdTask?.specificDate).toBe('2026-09-25');
      expect(state.selectedDate).toBe('2026-09-25');

      // Verifica que a proposta foi marcada como aplicada
      const msg = state.aiMessages.find((m) => m.actionProposal?.id === proposalId);
      expect(msg?.actionProposal?.applied).toBe(true);
    });

    it('deve aplicar proposta de ação da IA para replanejamento de horários', () => {
      const task = useFlowStore.getState().tasks[0];
      const proposalId = 'prop_replan_456';

      useFlowStore.getState().addAiMessage({
        role: 'assistant',
        content: 'Proposta de replanejamento com +30 minutos.',
        actionProposal: {
          id: proposalId,
          type: 'replan_schedule',
          description: 'Deslocar atividades',
          payload: {
            delayMinutes: 30,
            diffs: [
              {
                taskId: task.id,
                originalStartTime: task.startTime,
                originalEndTime: task.endTime,
                newStartTime: '11:30',
                newEndTime: '12:30',
              },
            ],
          },
          applied: false,
        },
      });

      useFlowStore.getState().applyAiActionProposal(proposalId);

      const updatedTask = useFlowStore.getState().tasks.find((t) => t.id === task.id);
      expect(updatedTask?.startTime).toBe('11:30');
      expect(updatedTask?.endTime).toBe('12:30');
    });

    it('deve atualizar configurações do Gemini e normalizar modelos descontinuados', () => {
      useFlowStore.getState().setGeminiConfig({
        apiKey: 'nova-chave-mock',
        model: 'gemini-2.0-flash', // modelo antigo
      });

      const config = useFlowStore.getState().geminiConfig;
      expect(config.apiKey).toBe('nova-chave-mock');
      expect(config.model).toBe('gemini-2.5-flash'); // Auto-normalizado
    });
  });

  describe('UI & Global Settings', () => {
    it('deve atualizar activeView, selectedDate e theme', () => {
      useFlowStore.getState().setActiveView('dashboard');
      expect(useFlowStore.getState().activeView).toBe('dashboard');

      useFlowStore.getState().setDate('2026-10-01');
      expect(useFlowStore.getState().selectedDate).toBe('2026-10-01');

      const initialTheme = useFlowStore.getState().theme;
      useFlowStore.getState().toggleTheme();
      expect(useFlowStore.getState().theme).not.toBe(initialTheme);
    });

    it('deve gerenciar estado de update disponível e modais', () => {
      const updateData = {
        hasUpdate: true,
        currentVersion: '0.1.6',
        latestVersion: '0.1.7',
        releaseName: 'Flow v0.1.7',
        releaseNotes: 'Correções',
        publishedAt: '2026-09-22',
        downloadUrl: 'https://download.url',
        releaseUrl: 'https://release.url',
      };

      useFlowStore.getState().setAvailableUpdate(updateData);

      expect(useFlowStore.getState().availableUpdate).toEqual(updateData);
      expect(useFlowStore.getState().isUpdateModalOpen).toBe(true);

      useFlowStore.getState().closeUpdateModal();
      expect(useFlowStore.getState().isUpdateModalOpen).toBe(false);
    });
  });
});
