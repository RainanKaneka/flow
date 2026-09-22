import { StateCreator } from 'zustand';
import { FlowStore, PomodoroState, PomodoroMode } from '../../types/routine';
import { sounds } from '../../utils/audio';

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
  },

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
    const updatedLogs = { ...state.logs };
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
});
