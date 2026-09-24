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
} from '../../types/routine';

export const getTodayDateString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export interface UiSliceState {
  activeView: AppView;
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
}

export interface UiSliceActions {
  setActiveView: (view: AppView) => void;
  setDate: (date: string) => void;
  toggleTheme: () => void;
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
}

export type UiSlice = UiSliceState & UiSliceActions;

export const createUiSlice: StateCreator<FlowStore, [], [], UiSlice> = (set) => ({
  activeView: 'routine',
  selectedDate: getTodayDateString(),
  theme: 'dark',

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
});
