import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { FlowStore, Task, TaskCategory, RoutineLevel } from '../types/routine';
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
        selectedLevel: 'easy',
        selectedDate: getTodayDateString(),
        theme: 'dark',
        tasks: INITIAL_TASKS,
        logs: {},
        activeCategoryFilter: 'all',
        isTaskModalOpen: false,
        editingTask: null,

        // Actions
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
              // Edit existing
              const updatedTasks = state.tasks.map((t) =>
                t.id === taskData.id ? ({ ...t, ...taskData } as Task) : t
              );
              return { tasks: updatedTasks, isTaskModalOpen: false, editingTask: null };
            } else {
              // Create new
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
      }),
      {
        name: 'flow-routine-storage-v1',
      }
    )
  )
);
