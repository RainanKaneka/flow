import { StateCreator } from 'zustand';
import { FlowStore, BacklogItem, Task } from '../../types/routine';

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
});
