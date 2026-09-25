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
import { initDb, loadStateFromDb, syncStateToDb, runLocalStorageMigration } from '../services/dbService';

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
          selectedRoutineTypeId: state.selectedRoutineTypeId,
          activeCategoryIdFilter: state.activeCategoryIdFilter,
          pomodoro: state.pomodoro,
          reminderSettings: state.reminderSettings,
          googleUser: state.googleUser,
          geminiConfig: state.geminiConfig,
          aiMessages: state.aiMessages,
          backupSettings: state.backupSettings,
          hasCompletedOnboarding: state.hasCompletedOnboarding,
          userProfile: state.userProfile,
        }),
      }
    )
  )
);

// DB Sync Subscription
let syncTimeout: ReturnType<typeof setTimeout> | null = null;
let lastRelationalState: any = {};

useFlowStore.subscribe(
  (state) => state,
  (state) => {
    const next = {
      routineTypes: state.routineTypes,
      categories: state.categories,
      tasks: state.tasks,
      logs: state.logs,
      backlog: state.backlog,
      notes: state.notes,
    };
    
    // Simple reference check (Zustand updates references on changes)
    if (
      next.routineTypes !== lastRelationalState.routineTypes ||
      next.categories !== lastRelationalState.categories ||
      next.tasks !== lastRelationalState.tasks ||
      next.logs !== lastRelationalState.logs ||
      next.backlog !== lastRelationalState.backlog ||
      next.notes !== lastRelationalState.notes
    ) {
      lastRelationalState = next;
      if (syncTimeout) clearTimeout(syncTimeout);
      syncTimeout = setTimeout(() => {
        syncStateToDb(next).catch((err) => {
          console.warn('[useFlowStore] Falha no sync com SQLite:', err);
        });
      }, 1000);
    }
  }
);

export async function initializeDbStore() {
  try {
    await initDb();
    await runLocalStorageMigration();
    
    const dbState = await loadStateFromDb();
    
    if (Object.keys(dbState).length === 0) {
      // O banco de dados é novo e retornou vazio.
      // Sincroniza o estado inicial do Zustand (dados padrão) para o SQLite.
      await syncStateToDb(useFlowStore.getState());
    } else {
      useFlowStore.setState(dbState);
    }
  } catch (error) {
    console.error('Failed to initialize SQLite DB:', error);
  }
}

