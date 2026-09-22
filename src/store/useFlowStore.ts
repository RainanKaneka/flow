import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { FlowStore } from '../types/routine';
import { createUiSlice, getTodayDateString } from './slices/uiSlice';
import { createRoutineSlice } from './slices/routineSlice';
import { createTaskSlice } from './slices/taskSlice';
import { createBacklogSlice } from './slices/backlogSlice';
import { createNotesSlice } from './slices/notesSlice';
import { createPomodoroSlice } from './slices/pomodoroSlice';
import { createAiSlice } from './slices/aiSlice';

export { getTodayDateString };

export const useFlowStore = create<FlowStore>()(
  subscribeWithSelector(
    persist(
      (...a) => ({
        ...createUiSlice(...a),
        ...createRoutineSlice(...a),
        ...createTaskSlice(...a),
        ...createBacklogSlice(...a),
        ...createNotesSlice(...a),
        ...createPomodoroSlice(...a),
        ...createAiSlice(...a),
      }),
      {
        name: 'flow-app-v1-clean',
        partialize: (state) => ({
          theme: state.theme,
          routineTypes: state.routineTypes,
          selectedRoutineTypeId: state.selectedRoutineTypeId,
          categories: state.categories,
          activeCategoryIdFilter: state.activeCategoryIdFilter,
          tasks: state.tasks,
          logs: state.logs,
          backlog: state.backlog,
          notes: state.notes,
          pomodoro: state.pomodoro,
          reminderSettings: state.reminderSettings,
          googleUser: state.googleUser,
          geminiConfig: state.geminiConfig,
          aiMessages: state.aiMessages,
        }),
      }
    )
  )
);
