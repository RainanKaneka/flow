import { StateCreator } from 'zustand';
import {
  FlowStore,
  AppView,
  Task,
  BacklogItem,
  ReminderSettings,
  BackupSettings,
  BackupModalTab,
  FlowState,
  UserProfile,
  OnboardingData,
} from '../../types/routine';
import { ROUTINE_TEMPLATES } from '../../data/routineTemplates';

export const getTodayDateString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export interface UiSliceState {
  activeView: AppView;
  routineViewMode: 'stream' | 'timeline';
  selectedDate: string;
  theme: 'dark' | 'light';
  isTaskModalOpen: boolean;
  editingTask: Task | null;
  promoteBacklogModalItem: BacklogItem | null;
  isManageRoutinesModalOpen: boolean;
  isManageCategoriesModalOpen: boolean;
  selectedTaskIdForDetail: string | null;
  reminderSettings: ReminderSettings;
  isNotificationModalOpen: boolean;
  backupSettings: BackupSettings;
  isBackupModalOpen: boolean;
  backupModalTab: BackupModalTab;
  availableUpdate: FlowState['availableUpdate'];
  isUpdateModalOpen: boolean;
  snackbar: {
    isOpen: boolean;
    message: string;
    onUndo?: () => void;
  };
  hasCompletedOnboarding: boolean;
  userProfile: UserProfile | null;
  isOnboardingModalOpen: boolean;
  isGlobalSearchOpen: boolean;
}

export interface UiSliceActions {
  setActiveView: (view: AppView) => void;
  setRoutineViewMode: (mode: 'stream' | 'timeline') => void;
  setDate: (date: string) => void;
  toggleTheme: () => void;
  openGlobalSearch: () => void;
  closeGlobalSearch: () => void;
  toggleGlobalSearch: () => void;
  openTaskModal: (task?: Task | null) => void;
  closeTaskModal: () => void;
  openManageRoutinesModal: () => void;
  closeManageRoutinesModal: () => void;
  openManageCategoriesModal: () => void;
  closeManageCategoriesModal: () => void;
  openTaskDetail: (taskId: string) => void;
  closeTaskDetail: () => void;
  openPromoteBacklogModal: (item: BacklogItem | null) => void;
  updateReminderSettings: (updates: Partial<ReminderSettings>) => void;
  openNotificationModal: () => void;
  closeNotificationModal: () => void;
  updateBackupSettings: (updates: Partial<BackupSettings>) => void;
  openBackupModal: (tab?: BackupModalTab | any) => void;
  setBackupModalTab: (tab: BackupModalTab) => void;
  closeBackupModal: () => void;
  setAvailableUpdate: (update: FlowState['availableUpdate']) => void;
  openUpdateModal: () => void;
  closeUpdateModal: () => void;
  showSnackbar: (message: string, onUndo?: () => void) => void;
  hideSnackbar: () => void;
  completeOnboarding: (data: OnboardingData) => void;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  openOnboardingModal: () => void;
  closeOnboardingModal: () => void;
}

export type UiSlice = UiSliceState & UiSliceActions;

export const createUiSlice: StateCreator<FlowStore, [], [], UiSlice> = (set, get) => ({
  activeView: 'routine',
  routineViewMode: 'stream',
  selectedDate: getTodayDateString(),
  theme: 'dark',

  hasCompletedOnboarding: false,
  userProfile: null,
  isOnboardingModalOpen: false,

  reminderSettings: {
    enabled: true,
    advanceMinutes: 5,
    soundEnabled: true,
  },
  isNotificationModalOpen: false,

  backupSettings: {
    enabled: true,
    folderPath: '',
    lastBackupDate: null,
    lastBackupTime: null,
    lastBackupStatus: null,
    lastBackupFileName: null,
    lastBackupError: null,
    autoRetentionCount: 30,
  },
  isBackupModalOpen: false,
  backupModalTab: 'backup',

  availableUpdate: null,
  isUpdateModalOpen: false,

  snackbar: {
    isOpen: false,
    message: '',
  },

  isTaskModalOpen: false,
  editingTask: null,
  promoteBacklogModalItem: null,
  isManageRoutinesModalOpen: false,
  isManageCategoriesModalOpen: false,
  selectedTaskIdForDetail: null,
  isGlobalSearchOpen: false,

  openGlobalSearch: () => {
    set({ isGlobalSearchOpen: true });
  },

  closeGlobalSearch: () => {
    set({ isGlobalSearchOpen: false });
  },

  toggleGlobalSearch: () => {
    set((state) => ({ isGlobalSearchOpen: !state.isGlobalSearchOpen }));
  },

  setActiveView: (view: AppView) => {
    set({ activeView: view });
  },

  setRoutineViewMode: (mode: 'stream' | 'timeline') => {
    set({ routineViewMode: mode });
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

  openTaskModal: (task: Task | null = null) => {
    set({ isTaskModalOpen: true, editingTask: task });
  },

  closeTaskModal: () => {
    set({ isTaskModalOpen: false, editingTask: null });
  },

  openManageRoutinesModal: () => {
    set({ isManageRoutinesModalOpen: true });
  },

  closeManageRoutinesModal: () => {
    set({ isManageRoutinesModalOpen: false });
  },

  openManageCategoriesModal: () => {
    set({ isManageCategoriesModalOpen: true });
  },

  closeManageCategoriesModal: () => {
    set({ isManageCategoriesModalOpen: false });
  },

  openTaskDetail: (taskId: string) => {
    set({ selectedTaskIdForDetail: taskId });
  },

  closeTaskDetail: () => {
    set({ selectedTaskIdForDetail: null });
  },

  openPromoteBacklogModal: (item: BacklogItem | null) => {
    set({ promoteBacklogModalItem: item });
  },

  updateReminderSettings: (updates: Partial<ReminderSettings>) => {
    set((state) => ({
      reminderSettings: {
        ...state.reminderSettings,
        ...updates,
      },
    }));
  },

  openNotificationModal: () => {
    set({ isNotificationModalOpen: true });
  },

  closeNotificationModal: () => {
    set({ isNotificationModalOpen: false });
  },

  updateBackupSettings: (updates: Partial<BackupSettings>) => {
    set((state) => ({
      backupSettings: {
        ...state.backupSettings,
        ...updates,
      },
    }));
  },

  openBackupModal: (tab?: BackupModalTab | any) => {
    const targetTab: BackupModalTab =
      typeof tab === 'string' && (tab === 'export' || tab === 'import')
        ? tab
        : 'backup';
    set({ isBackupModalOpen: true, backupModalTab: targetTab });
  },

  setBackupModalTab: (tab: BackupModalTab) => {
    set({ backupModalTab: tab });
  },

  closeBackupModal: () => {
    set({ isBackupModalOpen: false });
  },

  setAvailableUpdate: (update) => {
    set({ availableUpdate: update, isUpdateModalOpen: !!update });
  },

  openUpdateModal: () => {
    set({ isUpdateModalOpen: true });
  },

  closeUpdateModal: () => {
    set({ isUpdateModalOpen: false });
  },

  showSnackbar: (message: string, onUndo?: () => void) => {
    set({ snackbar: { isOpen: true, message, onUndo } });
  },

  hideSnackbar: () => {
    set((state) => ({ snackbar: { ...state.snackbar, isOpen: false } }));
  },

  completeOnboarding: (data: OnboardingData) => {
    const template =
      ROUTINE_TEMPLATES.find((t) => t.id === data.templateId) || ROUTINE_TEMPLATES[0];

    if (typeof document !== 'undefined') {
      if (data.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }

    const pomodoroDurationSeconds = (data.pomodoroDurationMinutes || 25) * 60;
    const userName = data.name.trim() || 'Usuário';

    set((state) => ({
      hasCompletedOnboarding: true,
      userProfile: {
        name: userName,
        objective: data.objective,
      },
      isOnboardingModalOpen: false,
      theme: data.theme,
      // Injeta a estrutura de rotina, categorias e tarefas do template escolhido
      routineTypes: [template.routineType],
      selectedRoutineTypeId: template.routineType.id,
      categories: template.categories,
      tasks: template.tasks,
      logs: {},
      pomodoro: {
        ...state.pomodoro,
        totalDurationSeconds: pomodoroDurationSeconds,
        timeLeftSeconds: pomodoroDurationSeconds,
        mode: 'focus',
        linkedTaskId: null,
      },
      reminderSettings: {
        ...state.reminderSettings,
        enabled: data.remindersEnabled,
        advanceMinutes: data.reminderAdvanceMinutes,
        soundEnabled: data.soundEnabled,
      },
    }));

    get().showSnackbar(`Bem-vindo ao Flow, ${userName}! Sua rotina está pronta.`);
  },

  updateUserProfile: (updates: Partial<UserProfile>) => {
    set((state) => ({
      userProfile: state.userProfile
        ? { ...state.userProfile, ...updates }
        : { name: '', objective: '', ...updates },
    }));
  },

  openOnboardingModal: () => {
    set({ isOnboardingModalOpen: true });
  },

  closeOnboardingModal: () => {
    set({ isOnboardingModalOpen: false });
  },
});
