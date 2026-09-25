import { StateCreator } from 'zustand';
import { FlowStore, Task, TaskLog, TaskAttachment, TaskChecklistItem } from '../../types/routine';
import {
  DEFAULT_ROUTINE_TYPES,
  DEFAULT_CATEGORIES,
  DEFAULT_TASKS,
} from '../../data/initialRoutine';
import { reorderAndRescheduleTasks, shiftTaskTime } from '../../utils/taskReorder';
import { timeToMinutes } from '../../utils/routineReplan';

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
  reorderTasks: (
    sourceTaskId: string,
    targetTaskId: string,
    filteredTaskIds?: string[]
  ) => void;
  shiftTaskTime: (taskId: string, deltaMinutes: number) => void;
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
      const defaultRoutineTypeId =
        state.routineTypes[0]?.id || DEFAULT_ROUTINE_TYPES[0].id;
      const defaultCategoryId =
        state.categories[0]?.id || DEFAULT_CATEGORIES[0].id;

      if (taskData.id) {
        const updatedTasks = state.tasks.map((t) =>
          t.id === taskData.id
            ? ({
                ...t,
                ...taskData,
                routineTypeId: taskData.routineTypeId || t.routineTypeId || defaultRoutineTypeId,
                categoryId: taskData.categoryId || t.categoryId || defaultCategoryId,
              } as Task)
            : t
        );
        return { tasks: updatedTasks, isTaskModalOpen: false, editingTask: null };
      } else {
        const newTask: Task = {
          ...taskData,
          routineTypeId: taskData.routineTypeId || defaultRoutineTypeId,
          categoryId: taskData.categoryId || defaultCategoryId,
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
    if (!taskToDelete) return;

    // Remove todos os logs associados a esta tarefa para evitar erros de FK e registros órfãos
    const removedLogs: Record<string, TaskLog> = {};
    const remainingLogs: Record<string, TaskLog> = {};
    Object.entries(state.logs).forEach(([key, log]) => {
      if (log.taskId === taskId || key.endsWith(`_${taskId}`)) {
        removedLogs[key] = log;
      } else {
        remainingLogs[key] = log;
      }
    });

    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== taskId),
      logs: remainingLogs,
      selectedTaskIdForDetail:
        state.selectedTaskIdForDetail === taskId ? null : state.selectedTaskIdForDetail,
      pomodoro:
        state.pomodoro.linkedTaskId === taskId
          ? { ...state.pomodoro, linkedTaskId: null }
          : state.pomodoro,
    }));

    state.showSnackbar('Atividade excluída', () => {
      set((s) => ({
        tasks: [...s.tasks, taskToDelete],
        logs: { ...s.logs, ...removedLogs },
      }));
    });
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

  reorderTasks: (
    sourceTaskId: string,
    targetTaskId: string,
    filteredTaskIds?: string[]
  ) => {
    const state = get();
    if (sourceTaskId === targetTaskId) return;

    // Snapshot anterior para Undo
    const previousTasks = [...state.tasks];

    // Obter a lista ordenada de tarefas afetadas
    let listToReorder: Task[];
    if (filteredTaskIds && filteredTaskIds.length > 0) {
      listToReorder = filteredTaskIds
        .map((id) => state.tasks.find((t) => t.id === id))
        .filter((t): t is Task => !!t);
    } else {
      listToReorder = [...state.tasks].sort(
        (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
      );
    }

    const { updatedTasks, hasChanges } = reorderAndRescheduleTasks(
      listToReorder,
      sourceTaskId,
      targetTaskId
    );

    if (!hasChanges) return;

    // Mescla tarefas atualizadas de volta na store global
    const updatedMap = new Map(updatedTasks.map((t) => [t.id, t]));
    const nextTasks = state.tasks.map((t) => updatedMap.get(t.id) || t);

    set({ tasks: nextTasks });

    state.showSnackbar('Ordem e horários das atividades atualizados', () => {
      set({ tasks: previousTasks });
    });
  },

  shiftTaskTime: (taskId: string, deltaMinutes: number) => {
    const state = get();
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;

    const previousTasks = [...state.tasks];
    const shifted = shiftTaskTime(task, deltaMinutes);

    set({
      tasks: state.tasks.map((t) => (t.id === taskId ? shifted : t)),
    });

    state.showSnackbar(
      `Horário ajustado (${deltaMinutes > 0 ? `+${deltaMinutes}` : deltaMinutes} min)`,
      () => {
        set({ tasks: previousTasks });
      }
    );
  },
});
