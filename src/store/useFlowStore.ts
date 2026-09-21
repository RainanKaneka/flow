import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { FlowStore, Task, TaskCategory, RoutineLevel, AppView, BacklogItem } from '../types/routine';
import { INITIAL_TASKS } from '../data/initialRoutine';

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
        selectedLevel: 'easy',
        selectedDate: getTodayDateString(),
        theme: 'dark',
        tasks: INITIAL_TASKS,
        logs: {},
        backlog: [
          {
            id: 'bk_sample_1',
            title: 'Configurar extensão do VS Code para Rust',
            description: 'Instalar rust-analyzer e configurar formatação automática para projetos desktop.',
            category: 'coding',
            targetMinutes: 30,
            tags: ['dev', 'rust'],
            createdAt: new Date().toISOString(),
          },
          {
            id: 'bk_sample_2',
            title: 'Escrever introdução da facção dos Magos do RPG',
            description: 'Definir história de origem e 3 magias principais do grimório antigo.',
            category: 'creative',
            targetMinutes: 45,
            tags: ['rpg', 'lore'],
            createdAt: new Date().toISOString(),
          },
        ],
        activeCategoryFilter: 'all',
        isTaskModalOpen: false,
        editingTask: null,
        promoteBacklogModalItem: null,

        // Actions
        setActiveView: (view: AppView) => {
          set({ activeView: view });
        },

        setLevel: (level: RoutineLevel) => {
          set({ selectedLevel: level });
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
                id: `custom_${Date.now()}`,
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
          }));
        },

        resetToInitialRoutine: () => {
          set({ tasks: INITIAL_TASKS });
        },

        setCategoryFilter: (category: TaskCategory | 'all') => {
          set({ activeCategoryFilter: category });
        },

        openTaskModal: (task: Task | null = null) => {
          set({ isTaskModalOpen: true, editingTask: task });
        },

        closeTaskModal: () => {
          set({ isTaskModalOpen: false, editingTask: null });
        },

        // Backlog Actions (RF-11)
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
            category: task.category,
            targetMinutes: task.targetMinutes,
            tags: task.tags,
            notes: task.notes,
            createdAt: new Date().toISOString(),
            originalTaskId: task.id,
          };

          // Desmarcar dos logs daquele dia
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

        promoteBacklogToTask: (backlogId: string, startTime: string, endTime: string, level?: RoutineLevel) => {
          const state = get();
          const item = state.backlog.find((b) => b.id === backlogId);
          if (!item) return;

          const targetLevel = level || state.selectedLevel;

          const [y, m, d] = state.selectedDate.split('-').map(Number);
          const dayOfWeek = new Date(y, m - 1, d).getDay();

          const newTask: Task = {
            id: `promoted_${Date.now()}`,
            title: item.title,
            description: item.description,
            startTime,
            endTime,
            level: targetLevel,
            category: item.category,
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
      }),
      {
        name: 'flow-routine-storage-v2',
      }
    )
  )
);
