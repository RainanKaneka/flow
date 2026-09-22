import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import {
  FlowStore,
  Task,
  RoutineType,
  Category,
  AppView,
  BacklogItem,
  Note,
  PomodoroState,
  PomodoroMode,
  TaskAttachment,
  TaskChecklistItem,
  ReminderSettings,
} from '../types/routine';
import { DEFAULT_ROUTINE_TYPES, DEFAULT_CATEGORIES, DEFAULT_TASKS } from '../data/initialRoutine';
import { sounds } from '../utils/audio';

const getTodayDateString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const useFlowStore = create<FlowStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // State
        activeView: 'routine',
        selectedDate: getTodayDateString(),
        theme: 'dark',

        routineTypes: DEFAULT_ROUTINE_TYPES,
        selectedRoutineTypeId: 'main_routine',

        categories: DEFAULT_CATEGORIES,
        activeCategoryIdFilter: 'all',

        tasks: DEFAULT_TASKS,
        logs: {},
        backlog: [],

        // Bloco de Notas (RF-8, RF-14)
        notes: [
          {
            id: 'welcome_note',
            title: 'Boas-vindas ao seu Bloco de Notas!',
            content:
              'Este é seu espaço livre para rascunhar ideias, projetos, matérias de estudo ou anotações rápidas.\n\n💡 Dica de ouro: quando uma anotação estiver pronta para ser executada, basta clicar no botão "Transformar em Tarefa" para agendá-la diretamente na sua rotina do dia!',
            tags: ['tutorial', 'início'],
            color: '#6366F1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],

        // Pomodoro (RF-7, RF-13)
        pomodoro: {
          isActive: false,
          timeLeftSeconds: 25 * 60,
          totalDurationSeconds: 25 * 60,
          mode: 'focus',
          linkedTaskId: null,
          completedSessions: 0,
        },

        // Lembretes & Notificações Nativas (RF-12)
        reminderSettings: {
          enabled: true,
          advanceMinutes: 5,
          soundEnabled: true,
        },
        isNotificationModalOpen: false,

        // Atualizações do Aplicativo (Releases)
        availableUpdate: null,
        isUpdateModalOpen: false,

        // Integração Google & Agente de IA com Gemini (RF-15, RF-16, RF-18, RF-19)
        googleUser: null,
        geminiConfig: {
          apiKey: '',
          model: 'gemini-2.5-flash',
          isConnected: false,
        },
        aiMessages: [
          {
            id: 'welcome_ai_msg',
            role: 'assistant',
            content: `Olá! Eu sou o **Flow AI**, seu assistente inteligente de gestão de rotina e alta performance.

Aqui estão algumas coisas que podemos fazer:
* ⚡ **Replanejar Atrasos (RF-16)**: Me avise se tiver imprevistos (ex: *"Atrasei 30 min no almoço"*), e eu redistribuo as tarefas restantes.
* 📝 **Criar Atividades (RF-15)**: Diga *"Criar tarefa Leitura às 20:00"* em linguagem natural.
* 📊 **Diagnósticos de Desempenho (RF-18)**: Peça um resumo de produtividade e gargalos.

💡 *Dica: Conecte sua Conta Google ou Chave Gemini no topo para raciocínio avançado com IA generativa!*`,
            timestamp: '08:00',
          },
        ],
        isGoogleAuthModalOpen: false,

        // Modais de Controle
        isTaskModalOpen: false,
        editingTask: null,
        promoteBacklogModalItem: null,
        isManageRoutinesModalOpen: false,
        isManageCategoriesModalOpen: false,

        // Modal de Especificações / Página Interna da Tarefa (RF-6)
        selectedTaskIdForDetail: null,

        // Actions: Navigation & Global
        setActiveView: (view: AppView) => {
          set({ activeView: view });
        },

        setDate: (date: string) => {
          set({ selectedDate: date });
        },

        toggleTheme: () => {
          set((state) => {
            const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
            if (typeof document !== 'undefined') {
              if (nextTheme === 'dark') {
                document.documentElement.classList.add('dark');
              } else {
                document.documentElement.classList.remove('dark');
              }
            }
            return { theme: nextTheme };
          });
        },

        // Actions: Routine Types
        selectRoutineType: (id: string) => {
          set({ selectedRoutineTypeId: id });
        },

        addRoutineType: (typeData) => {
          const newType: RoutineType = {
            ...typeData,
            id: `type_${Date.now()}`,
          };
          set((state) => ({
            routineTypes: [...state.routineTypes, newType],
            selectedRoutineTypeId: newType.id,
          }));
        },

        updateRoutineType: (id: string, updates: Partial<RoutineType>) => {
          set((state) => ({
            routineTypes: state.routineTypes.map((t) =>
              t.id === id ? { ...t, ...updates } : t
            ),
          }));
        },

        deleteRoutineType: (id: string) => {
          set((state) => {
            if (state.routineTypes.length <= 1) return state;
            const remaining = state.routineTypes.filter((t) => t.id !== id);
            return {
              routineTypes: remaining,
              selectedRoutineTypeId:
                state.selectedRoutineTypeId === id ? remaining[0].id : state.selectedRoutineTypeId,
              tasks: state.tasks.filter((t) => t.routineTypeId !== id),
            };
          });
        },

        openManageRoutinesModal: () => {
          set({ isManageRoutinesModalOpen: true });
        },

        closeManageRoutinesModal: () => {
          set({ isManageRoutinesModalOpen: false });
        },

        // Actions: Categories
        setCategoryIdFilter: (categoryId: string | 'all') => {
          set({ activeCategoryIdFilter: categoryId });
        },

        addCategory: (categoryData) => {
          const newCat: Category = {
            ...categoryData,
            id: `cat_${Date.now()}`,
          };
          set((state) => ({
            categories: [...state.categories, newCat],
          }));
        },

        updateCategory: (id: string, updates: Partial<Category>) => {
          set((state) => ({
            categories: state.categories.map((c) =>
              c.id === id ? { ...c, ...updates } : c
            ),
          }));
        },

        deleteCategory: (id: string) => {
          set((state) => {
            if (state.categories.length <= 1) return state;
            const remaining = state.categories.filter((c) => c.id !== id);
            const fallbackId = remaining[0].id;
            return {
              categories: remaining,
              activeCategoryIdFilter:
                state.activeCategoryIdFilter === id ? 'all' : state.activeCategoryIdFilter,
              tasks: state.tasks.map((t) =>
                t.categoryId === id ? { ...t, categoryId: fallbackId } : t
              ),
            };
          });
        },

        openManageCategoriesModal: () => {
          set({ isManageCategoriesModalOpen: true });
        },

        closeManageCategoriesModal: () => {
          set({ isManageCategoriesModalOpen: false });
        },

        // Actions: Tasks
        toggleTaskCompletion: (taskId: string, targetDate?: string) => {
          const date = targetDate || get().selectedDate;
          const key = `${date}_${taskId}`;
          const currentLog = get().logs[key];

          const now = new Date();
          const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(
            now.getMinutes()
          ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

          const isCompleted = currentLog ? !currentLog.completed : true;

          set((state) => ({
            logs: {
              ...state.logs,
              [key]: {
                id: key,
                taskId,
                date,
                completed: isCompleted,
                completedAt: isCompleted ? timeString : undefined,
                timeSpentMinutes: currentLog?.timeSpentMinutes || 0,
              },
            },
          }));
        },

        saveTask: (taskData) => {
          set((state) => {
            if (taskData.id) {
              const updatedTasks = state.tasks.map((t) =>
                t.id === taskData.id ? ({ ...t, ...taskData } as Task) : t
              );
              return { tasks: updatedTasks, isTaskModalOpen: false, editingTask: null };
            } else {
              const newTask: Task = {
                ...taskData,
                id: `task_${Date.now()}`,
                isCustom: true,
              } as Task;
              return {
                tasks: [...state.tasks, newTask],
                isTaskModalOpen: false,
                editingTask: null,
              };
            }
          });
        },

        deleteTask: (taskId: string) => {
          set((state) => ({
            tasks: state.tasks.filter((t) => t.id !== taskId),
            selectedTaskIdForDetail:
              state.selectedTaskIdForDetail === taskId ? null : state.selectedTaskIdForDetail,
            pomodoro:
              state.pomodoro.linkedTaskId === taskId
                ? { ...state.pomodoro, linkedTaskId: null }
                : state.pomodoro,
          }));
        },

        resetToTemplate: () => {
          set({
            routineTypes: DEFAULT_ROUTINE_TYPES,
            categories: DEFAULT_CATEGORIES,
            tasks: DEFAULT_TASKS,
            logs: {},
            backlog: [],
            notes: [],
            selectedTaskIdForDetail: null,
            pomodoro: {
              isActive: false,
              timeLeftSeconds: 25 * 60,
              totalDurationSeconds: 25 * 60,
              mode: 'focus',
              linkedTaskId: null,
              completedSessions: 0,
            },
          });
        },

        openTaskModal: (task: Task | null = null) => {
          set({ isTaskModalOpen: true, editingTask: task });
        },

        closeTaskModal: () => {
          set({ isTaskModalOpen: false, editingTask: null });
        },

        // Task Detail & Specifications (RF-6, RF-17)
        openTaskDetail: (taskId: string) => {
          set({ selectedTaskIdForDetail: taskId });
        },

        closeTaskDetail: () => {
          set({ selectedTaskIdForDetail: null });
        },

        updateTaskSpecifications: (taskId, updates) => {
          set((state) => ({
            tasks: state.tasks.map((t) =>
              t.id === taskId ? { ...t, ...updates } : t
            ),
          }));
        },

        toggleChecklistItem: (taskId: string, itemId: string) => {
          set((state) => ({
            tasks: state.tasks.map((t) => {
              if (t.id !== taskId) return t;
              const checklist = (t.checklist || []).map((item) =>
                item.id === itemId ? { ...item, completed: !item.completed } : item
              );
              return { ...t, checklist };
            }),
          }));
        },

        // Backlog Actions
        moveTaskToBacklog: (taskId: string, targetDate?: string) => {
          const state = get();
          const task = state.tasks.find((t) => t.id === taskId);
          if (!task) return;

          const date = targetDate || state.selectedDate;
          const key = `${date}_${taskId}`;

          const newBacklogItem: BacklogItem = {
            id: `bk_${Date.now()}`,
            title: task.title,
            description: task.description,
            categoryId: task.categoryId,
            targetMinutes: task.targetMinutes,
            tags: task.tags,
            notes: task.notes,
            createdAt: new Date().toISOString(),
            originalTaskId: task.id,
          };

          const updatedLogs = { ...state.logs };
          delete updatedLogs[key];

          set({
            backlog: [newBacklogItem, ...state.backlog],
            logs: updatedLogs,
          });
        },

        addBacklogItem: (itemData) => {
          const newItem: BacklogItem = {
            ...itemData,
            id: `bk_${Date.now()}`,
            createdAt: new Date().toISOString(),
          };
          set((state) => ({
            backlog: [newItem, ...state.backlog],
          }));
        },

        deleteBacklogItem: (id: string) => {
          set((state) => ({
            backlog: state.backlog.filter((b) => b.id !== id),
          }));
        },

        openPromoteBacklogModal: (item: BacklogItem | null) => {
          set({ promoteBacklogModalItem: item });
        },

        promoteBacklogToTask: (backlogId: string, startTime: string, endTime: string, routineTypeId?: string) => {
          const state = get();
          const item = state.backlog.find((b) => b.id === backlogId);
          if (!item) return;

          const targetTypeId = routineTypeId || state.selectedRoutineTypeId;
          const [y, m, d] = state.selectedDate.split('-').map(Number);
          const dayOfWeek = new Date(y, m - 1, d).getDay();

          const newTask: Task = {
            id: `task_${Date.now()}`,
            title: item.title,
            description: item.description,
            startTime,
            endTime,
            routineTypeId: targetTypeId,
            categoryId: item.categoryId,
            daysOfWeek: [dayOfWeek],
            targetMinutes: item.targetMinutes,
            tags: [...item.tags, 'Do Backlog'],
            notes: item.notes,
            isCustom: true,
          };

          set({
            tasks: [...state.tasks, newTask],
            backlog: state.backlog.filter((b) => b.id !== backlogId),
            promoteBacklogModalItem: null,
            activeView: 'routine',
          });
        },

        // Bloco de Notas (RF-8, RF-14)
        addNote: (noteData) => {
          const now = new Date().toISOString();
          const newNote: Note = {
            ...noteData,
            id: `note_${Date.now()}`,
            createdAt: now,
            updatedAt: now,
          };
          set((state) => ({
            notes: [newNote, ...state.notes],
          }));
        },

        updateNote: (id, updates) => {
          set((state) => ({
            notes: state.notes.map((n) =>
              n.id === id
                ? { ...n, ...updates, updatedAt: new Date().toISOString() }
                : n
            ),
          }));
        },

        deleteNote: (id) => {
          set((state) => ({
            notes: state.notes.filter((n) => n.id !== id),
          }));
        },

        convertNoteToTask: (noteId, startTime, endTime, routineTypeId, categoryId) => {
          const state = get();
          const note = state.notes.find((n) => n.id === noteId);
          if (!note) return;

          const targetTypeId = routineTypeId || state.selectedRoutineTypeId;
          const targetCatId = categoryId || state.categories[0]?.id || 'focus';

          const [y, m, d] = state.selectedDate.split('-').map(Number);
          const dayOfWeek = new Date(y, m - 1, d).getDay();

          const [h1, m1] = startTime.split(':').map(Number);
          const [h2, m2] = endTime.split(':').map(Number);
          let targetMins = (h2 * 60 + m2) - (h1 * 60 + m1);
          if (targetMins <= 0) targetMins = 30;

          const newTask: Task = {
            id: `task_${Date.now()}`,
            title: note.title,
            description: note.content.slice(0, 140) + (note.content.length > 140 ? '...' : ''),
            richContent: note.content,
            startTime,
            endTime,
            routineTypeId: targetTypeId,
            categoryId: targetCatId,
            daysOfWeek: [dayOfWeek],
            targetMinutes: targetMins,
            tags: note.tags.length > 0 ? note.tags : ['Do Bloco de Notas'],
            isCustom: true,
          };

          set({
            tasks: [...state.tasks, newTask],
            activeView: 'routine',
          });
        },

        // Pomodoro (RF-7, RF-13)
        startPomodoro: (linkedTaskId?: string) => {
          sounds.playPomodoroStart();
          set((state) => ({
            pomodoro: {
              ...state.pomodoro,
              isActive: true,
              linkedTaskId: linkedTaskId !== undefined ? linkedTaskId : state.pomodoro.linkedTaskId,
            },
          }));
        },

        pausePomodoro: () => {
          sounds.playTick();
          set((state) => ({
            pomodoro: {
              ...state.pomodoro,
              isActive: false,
            },
          }));
        },

        resetPomodoro: (newDurationSeconds?: number) => {
          sounds.playTick();
          set((state) => {
            const dur = newDurationSeconds || state.pomodoro.totalDurationSeconds;
            return {
              pomodoro: {
                ...state.pomodoro,
                isActive: false,
                timeLeftSeconds: dur,
                totalDurationSeconds: dur,
              },
            };
          });
        },

        setPomodoroMode: (mode: PomodoroMode, durationSeconds?: number) => {
          sounds.playTick();
          let defaultSecs = 25 * 60;
          if (mode === 'shortBreak') defaultSecs = 5 * 60;
          if (mode === 'longBreak') defaultSecs = 15 * 60;
          const dur = durationSeconds || defaultSecs;

          set((state) => ({
            pomodoro: {
              ...state.pomodoro,
              mode,
              isActive: false,
              totalDurationSeconds: dur,
              timeLeftSeconds: dur,
            },
          }));
        },

        setPomodoroDuration: (seconds: number) => {
          set((state) => ({
            pomodoro: {
              ...state.pomodoro,
              totalDurationSeconds: seconds,
              timeLeftSeconds: seconds,
              isActive: false,
            },
          }));
        },

        linkTaskToPomodoro: (taskId: string | null) => {
          set((state) => ({
            pomodoro: {
              ...state.pomodoro,
              linkedTaskId: taskId,
            },
          }));
        },

        tickPomodoro: () => {
          const state = get();
          if (!state.pomodoro.isActive) return;

          const nextSecs = state.pomodoro.timeLeftSeconds - 1;
          if (nextSecs <= 0) {
            get().finishPomodoroSession();
          } else {
            set((s) => ({
              pomodoro: {
                ...s.pomodoro,
                timeLeftSeconds: nextSecs,
              },
            }));
          }
        },

        finishPomodoroSession: () => {
          sounds.playPomodoroChime();
          const state = get();
          const isFocus = state.pomodoro.mode === 'focus';
          const sessionMinutes = Math.round(state.pomodoro.totalDurationSeconds / 60);

          // Se vinculado a uma tarefa e modo foco, registrar tempo real focado (RF-13)
          let updatedLogs = { ...state.logs };
          if (isFocus && state.pomodoro.linkedTaskId) {
            const taskId = state.pomodoro.linkedTaskId;
            const date = state.selectedDate;
            const key = `${date}_${taskId}`;
            const existingLog = updatedLogs[key];

            const currentMinutes = existingLog?.timeSpentMinutes || 0;
            updatedLogs[key] = {
              id: key,
              taskId,
              date,
              completed: existingLog?.completed || false,
              completedAt: existingLog?.completedAt,
              timeSpentMinutes: currentMinutes + sessionMinutes,
            };
          }

          const newCompletedSessions = isFocus
            ? state.pomodoro.completedSessions + 1
            : state.pomodoro.completedSessions;

          // Transição automática de modo (foco -> pausa curta ou longa)
          let nextMode: PomodoroMode = 'focus';
          let nextDuration = 25 * 60;
          if (isFocus) {
            if (newCompletedSessions % 4 === 0) {
              nextMode = 'longBreak';
              nextDuration = 15 * 60;
            } else {
              nextMode = 'shortBreak';
              nextDuration = 5 * 60;
            }
          }

          set({
            logs: updatedLogs,
            pomodoro: {
              ...state.pomodoro,
              isActive: false,
              mode: nextMode,
              totalDurationSeconds: nextDuration,
              timeLeftSeconds: nextDuration,
              completedSessions: newCompletedSessions,
            },
          });
        },

        // Lembretes & Notificações (RF-12)
        updateReminderSettings: (updates: Partial<ReminderSettings>) => {
          set((state) => ({
            reminderSettings: {
              ...state.reminderSettings,
              ...updates,
            },
          }));
        },

        openNotificationModal: () => {
          set({ isNotificationModalOpen: true });
        },

        closeNotificationModal: () => {
          set({ isNotificationModalOpen: false });
        },

        // Atualizações do Aplicativo
        setAvailableUpdate: (update) => {
          set({ availableUpdate: update, isUpdateModalOpen: !!update });
        },

        openUpdateModal: () => {
          set({ isUpdateModalOpen: true });
        },

        closeUpdateModal: () => {
          set({ isUpdateModalOpen: false });
        },

        // Agente de IA com Gemini & Conta Google (RF-15, RF-16, RF-18, RF-19)
        setGoogleUser: (user) => {
          set({ googleUser: user });
        },

        setGeminiConfig: (config) => {
          set((state) => {
            const updatedConfig = {
              ...state.geminiConfig,
              ...config,
            };
            if (updatedConfig.model === 'gemini-2.0-flash') {
              updatedConfig.model = 'gemini-2.5-flash';
            }
            return { geminiConfig: updatedConfig };
          });
        },

        addAiMessage: (msg) => {
          const newMsg = {
            ...msg,
            id: msg.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            timestamp: msg.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          set((state) => ({
            aiMessages: [...state.aiMessages, newMsg],
          }));
        },

        clearAiChat: () => {
          set({
            aiMessages: [
              {
                id: `reset_${Date.now()}`,
                role: 'assistant',
                content: 'Histórico limpo. Em que posso te ajudar na sua rotina agora?',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ],
          });
        },

        applyAiActionProposal: (proposalId: string) => {
          set((state) => {
            const msg = state.aiMessages.find((m) => m.actionProposal?.id === proposalId);
            if (!msg || !msg.actionProposal || msg.actionProposal.applied) return state;

            const proposal = msg.actionProposal;
            let updatedTasks = [...state.tasks];

            if (proposal.type === 'create_task') {
              const taskPayload = proposal.payload;
              const newTask = {
                ...taskPayload,
                id: `task_${Date.now()}`,
                daysOfWeek: taskPayload.daysOfWeek || [0, 1, 2, 3, 4, 5, 6],
                tags: taskPayload.tags || ['ia-flow'],
              };
              updatedTasks.push(newTask);
            } else if (proposal.type === 'replan_schedule') {
              const diffs = proposal.payload.diffs || [];
              const diffMap = new Map(diffs.map((d: any) => [d.taskId, d]));
              updatedTasks = updatedTasks.map((t) => {
                const diff: any = diffMap.get(t.id);
                if (diff) {
                  return {
                    ...t,
                    startTime: diff.newStartTime,
                    endTime: diff.newEndTime,
                  };
                }
                return t;
              });
            }

            const updatedMessages = state.aiMessages.map((m) => {
              if (m.actionProposal?.id === proposalId) {
                return {
                  ...m,
                  actionProposal: {
                    ...m.actionProposal,
                    applied: true,
                  },
                };
              }
              return m;
            });

            return {
              tasks: updatedTasks,
              aiMessages: updatedMessages,
            };
          });
        },

        openGoogleAuthModal: () => {
          set({ isGoogleAuthModalOpen: true });
        },

        closeGoogleAuthModal: () => {
          set({ isGoogleAuthModalOpen: false });
        },
      }),
      {
        name: 'flow-app-v1-clean',
      }
    )
  )
);
