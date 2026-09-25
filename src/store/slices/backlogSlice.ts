import { StateCreator } from 'zustand';
import { FlowStore, BacklogItem, Task, TaskLog } from '../../types/routine';

export interface BacklogSliceState {
  backlog: BacklogItem[];
}

export interface BacklogSliceActions {
  moveTaskToBacklog: (taskId: string, targetDate?: string) => void;
  addBacklogItem: (item: Omit<BacklogItem, 'id' | 'createdAt'>) => void;
  deleteBacklogItem: (id: string) => void;
  promoteBacklogToTask: (
    backlogId: string,
    startTime: string,
    endTime: string,
    routineTypeId?: string
  ) => void;
}

export type BacklogSlice = BacklogSliceState & BacklogSliceActions;

export const createBacklogSlice: StateCreator<FlowStore, [], [], BacklogSlice> = (set, get) => ({
  backlog: [],

  moveTaskToBacklog: (taskId: string, _targetDate?: string) => {
    const state = get();
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;

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

    // Remove todos os logs associados a esta tarefa para prevenir erros de FK no SQLite
    const removedLogs: Record<string, TaskLog> = {};
    const remainingLogs: Record<string, TaskLog> = {};
    Object.entries(state.logs).forEach(([key, log]) => {
      if (log.taskId === taskId || key.endsWith(`_${taskId}`)) {
        removedLogs[key] = log;
      } else {
        remainingLogs[key] = log;
      }
    });

    set({
      tasks: state.tasks.filter((t) => t.id !== taskId),
      backlog: [newBacklogItem, ...state.backlog],
      logs: remainingLogs,
      selectedTaskIdForDetail:
        state.selectedTaskIdForDetail === taskId ? null : state.selectedTaskIdForDetail,
      pomodoro:
        state.pomodoro.linkedTaskId === taskId
          ? { ...state.pomodoro, linkedTaskId: null }
          : state.pomodoro,
    });

    state.showSnackbar('Atividade movida para o Backlog', () => {
      set((s) => ({
        tasks: [...s.tasks, task],
        backlog: s.backlog.filter((b) => b.id !== newBacklogItem.id),
        logs: { ...s.logs, ...removedLogs },
      }));
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
    const state = get();
    const itemToDelete = state.backlog.find((b) => b.id === id);

    set((state) => ({
      backlog: state.backlog.filter((b) => b.id !== id),
    }));

    if (itemToDelete) {
      state.showSnackbar('Item do backlog excluído', () => {
        set((s) => ({ backlog: [itemToDelete, ...s.backlog] }));
      });
    }
  },

  promoteBacklogToTask: (
    backlogId: string,
    startTime: string,
    endTime: string,
    routineTypeId?: string
  ) => {
    const state = get();
    const item = state.backlog.find((b) => b.id === backlogId);
    if (!item) return;

    const targetTypeId =
      (routineTypeId && state.routineTypes.some((r) => r.id === routineTypeId) ? routineTypeId : null) ||
      (state.selectedRoutineTypeId && state.routineTypes.some((r) => r.id === state.selectedRoutineTypeId) ? state.selectedRoutineTypeId : null) ||
      state.routineTypes[0]?.id ||
      'main_routine';

    const targetCategoryId =
      (item.categoryId && state.categories.some((c) => c.id === item.categoryId) ? item.categoryId : null) ||
      state.categories[0]?.id ||
      'geral';

    const [y, m, d] = state.selectedDate.split('-').map(Number);
    const dayOfWeek = new Date(y, m - 1, d).getDay();

    const newTask: Task = {
      id: `task_${Date.now()}`,
      title: item.title,
      description: item.description,
      startTime,
      endTime,
      routineTypeId: targetTypeId,
      categoryId: targetCategoryId,
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
});
