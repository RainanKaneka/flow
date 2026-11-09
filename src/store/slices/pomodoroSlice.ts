import { StateCreator } from 'zustand';
import { FlowStore, PomodoroState, PomodoroMode } from '../../types/routine';
import { sounds } from '../../utils/audio';
import { getCurrentTaskDate, getLocalDateString } from '../../utils/taskProgress';

export interface PomodoroSliceState {
  pomodoro: PomodoroState;
}

export interface PomodoroSliceActions {
  startPomodoro: (linkedTaskId?: string) => void;
  pausePomodoro: () => void;
  resetPomodoro: (newDurationSeconds?: number) => void;
  setPomodoroMode: (mode: PomodoroMode, durationSeconds?: number) => void;
  setPomodoroDuration: (seconds: number) => void;
  linkTaskToPomodoro: (taskId: string | null) => void;
  tickPomodoro: () => void;
  finishPomodoroSession: () => void;
  togglePomodoroAutoAdvance: () => void;
  setPomodoroAutoAdvance: (autoAdvance: boolean) => void;
}

export type PomodoroSlice = PomodoroSliceState & PomodoroSliceActions;

export const createPomodoroSlice: StateCreator<FlowStore, [], [], PomodoroSlice> = (set, get) => ({
  pomodoro: {
    isActive: false,
    timeLeftSeconds: 25 * 60,
    totalDurationSeconds: 25 * 60,
    mode: 'focus',
    linkedTaskId: null,
    completedSessions: 0,
    autoAdvance: true, // Inicializado automaticamente como true (0.4.5)
    preferredFocusDurationSeconds: 25 * 60,
  },

  startPomodoro: (linkedTaskId?: string) => {
    sounds.playPomodoroStart();
    const state = get();
    const taskId = linkedTaskId !== undefined ? linkedTaskId : state.pomodoro.linkedTaskId;
    const task = state.tasks.find((item) => item.id === taskId);
    const now = new Date();
    const date = task ? getCurrentTaskDate(task, now) || getLocalDateString(now) : null;
    set((state) => ({
      pomodoro: {
        ...state.pomodoro,
        isActive: true,
        linkedTaskId: taskId,
        linkedTaskDate: date,
      },
    }));
    if (taskId && date && state.pomodoro.mode === 'focus') get().startTask(taskId, date);
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
    const currentPreferred = get().pomodoro?.preferredFocusDurationSeconds || 25 * 60;
    let defaultSecs = currentPreferred;
    if (mode === 'shortBreak') defaultSecs = 5 * 60;
    if (mode === 'longBreak') defaultSecs = 15 * 60;
    const dur = durationSeconds || (mode === 'focus' ? currentPreferred : defaultSecs);

    set((state) => ({
      pomodoro: {
        ...state.pomodoro,
        mode,
        isActive: false,
        totalDurationSeconds: dur,
        timeLeftSeconds: dur,
        preferredFocusDurationSeconds:
          mode === 'focus' ? dur : state.pomodoro.preferredFocusDurationSeconds || 25 * 60,
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
        preferredFocusDurationSeconds:
          state.pomodoro.mode === 'focus'
            ? seconds
            : state.pomodoro.preferredFocusDurationSeconds || 25 * 60,
      },
    }));
  },

  linkTaskToPomodoro: (taskId: string | null) => {
    const state = get();
    const task = state.tasks.find((item) => item.id === taskId);
    const now = new Date();
    const date = task ? getCurrentTaskDate(task, now) || getLocalDateString(now) : null;
    set((state) => ({
      pomodoro: {
        ...state.pomodoro,
        linkedTaskId: taskId,
        linkedTaskDate: date,
      },
    }));
    if (taskId && date && state.pomodoro.isActive && state.pomodoro.mode === 'focus') {
      get().startTask(taskId, date);
    }
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
    const updatedLogs = { ...state.logs };
    if (isFocus && state.pomodoro.linkedTaskId) {
      const taskId = state.pomodoro.linkedTaskId;
      const date = state.pomodoro.linkedTaskDate || getLocalDateString(new Date());
      const key = `${date}_${taskId}`;
      const existingLog = updatedLogs[key];

      const currentMinutes = existingLog?.timeSpentMinutes || 0;
      updatedLogs[key] = {
        ...existingLog,
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

    // Transição de modo:
    // Se estava em foco -> vai para descanso (longBreak a cada 4 sessões, senão shortBreak)
    // Se estava em descanso -> vai para foco (preservando duração preferida de 25m ou 50m)
    let nextMode: PomodoroMode = 'focus';
    let nextDuration = state.pomodoro.preferredFocusDurationSeconds || 25 * 60;

    if (isFocus) {
      if (newCompletedSessions % 4 === 0) {
        nextMode = 'longBreak';
        nextDuration = 15 * 60;
      } else {
        nextMode = 'shortBreak';
        nextDuration = 5 * 60;
      }
    }

    // Passar automaticamente caso autoAdvance esteja ativo (padrão: true)
    const shouldAutoAdvance = state.pomodoro.autoAdvance ?? true;
    const nextTask = state.tasks.find((task) => task.id === state.pomodoro.linkedTaskId);
    const now = new Date();
    const nextTaskDate = shouldAutoAdvance && nextMode === 'focus' && nextTask
      ? getCurrentTaskDate(nextTask, now) || getLocalDateString(now)
      : state.pomodoro.linkedTaskDate;

    set({
      logs: updatedLogs,
      pomodoro: {
        ...state.pomodoro,
        isActive: shouldAutoAdvance,
        mode: nextMode,
        totalDurationSeconds: nextDuration,
        timeLeftSeconds: nextDuration,
        completedSessions: newCompletedSessions,
        linkedTaskDate: nextTaskDate,
      },
    });
    get().refreshTaskProgress();
    if (shouldAutoAdvance && nextMode === 'focus' && state.pomodoro.linkedTaskId) {
      get().startTask(state.pomodoro.linkedTaskId, nextTaskDate || undefined);
    }
  },

  togglePomodoroAutoAdvance: () => {
    sounds.playTick();
    set((state) => ({
      pomodoro: {
        ...state.pomodoro,
        autoAdvance: !(state.pomodoro.autoAdvance ?? true),
      },
    }));
  },

  setPomodoroAutoAdvance: (autoAdvance: boolean) => {
    set((state) => ({
      pomodoro: {
        ...state.pomodoro,
        autoAdvance,
      },
    }));
  },
});
