import { StateCreator } from 'zustand';
import { FlowStore, Task, TaskLog, TaskAttachment, TaskChecklistItem } from '../../types/routine';
import {
  DEFAULT_ROUTINE_TYPES,
  DEFAULT_CATEGORIES,
  DEFAULT_TASKS,
} from '../../data/initialRoutine';

export interface TaskSliceState {
  tasks: Task[];
  logs: Record<string, TaskLog>;
}

export interface TaskSliceActions {
  toggleTaskCompletion: (taskId: string, targetDate?: string) => void;
  saveTask: (task: Omit<Task, 'id'> & { id?: string }) => void;
  deleteTask: (taskId: string) => void;
  resetToTemplate: () => void;
  updateTaskSpecifications: (
    taskId: string,
    updates: {
      richContent?: string;
      attachments?: TaskAttachment[];
      checklist?: TaskChecklistItem[];
    }
  ) => void;
  toggleChecklistItem: (taskId: string, itemId: string) => void;
}

export type TaskSlice = TaskSliceState & TaskSliceActions;

export const createTaskSlice: StateCreator<FlowStore, [], [], TaskSlice> = (set, get) => ({
  tasks: DEFAULT_TASKS,
  logs: {},

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
    const state = get();
    const taskToDelete = state.tasks.find((t) => t.id === taskId);

    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== taskId),
      selectedTaskIdForDetail:
        state.selectedTaskIdForDetail === taskId ? null : state.selectedTaskIdForDetail,
      pomodoro:
        state.pomodoro.linkedTaskId === taskId
          ? { ...state.pomodoro, linkedTaskId: null }
          : state.pomodoro,
    }));

    if (taskToDelete) {
      state.showSnackbar('Atividade excluída', () => {
        set((s) => ({ tasks: [...s.tasks, taskToDelete] }));
      });
    }
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

  updateTaskSpecifications: (taskId, updates) => {
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t)),
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
});
