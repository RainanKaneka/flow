import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { FlowStore, Task, RoutineType, Category, AppView, BacklogItem } from '../types/routine';
import { DEFAULT_ROUTINE_TYPES, DEFAULT_CATEGORIES, DEFAULT_TASKS } from '../data/initialRoutine';

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
        selectedRoutineTypeId: 'easy',
        
        categories: DEFAULT_CATEGORIES,
        activeCategoryIdFilter: 'all',
        
        tasks: DEFAULT_TASKS,
        logs: {},
        backlog: [],
        
        isTaskModalOpen: false,
        editingTask: null,
        promoteBacklogModalItem: null,
        isManageRoutinesModalOpen: false,
        isManageCategoriesModalOpen: false,

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
            if (state.routineTypes.length <= 1) return state; // Manter pelo menos 1
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
          }));
        },

        resetToTemplate: () => {
          set({
            routineTypes: DEFAULT_ROUTINE_TYPES,
            categories: DEFAULT_CATEGORIES,
            tasks: DEFAULT_TASKS,
            logs: {},
            backlog: [],
          });
        },

        openTaskModal: (task: Task | null = null) => {
          set({ isTaskModalOpen: true, editingTask: task });
        },

        closeTaskModal: () => {
          set({ isTaskModalOpen: false, editingTask: null });
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
      }),
      {
        name: 'flow-routine-universal-v3',
      }
    )
  )
);
