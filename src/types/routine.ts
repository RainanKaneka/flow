export type AppView = 'routine' | 'dashboard' | 'backlog' | 'pomodoro' | 'notes' | 'ai';

// Integração Google & Agente de IA com Gemini (RF-15, RF-16, RF-17, RF-18, RF-19)
export interface GoogleUserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  connectedAt: string;
  accessToken?: string;
}

export type GoogleUser = GoogleUserProfile;

export interface GeminiConfig {
  apiKey: string;
  model: string;
  isConnected: boolean;
  clientId?: string;
}

export type AiActionType =
  'create_task' | 'replan_schedule' | 'decompose_checklist' | 'productivity_report';

export interface AiActionProposal {
  id: string;
  type: AiActionType;
  title: string;
  summary: string;
  payload: any;
  applied?: boolean;
}

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  actionProposal?: AiActionProposal;
}

export interface RoutineType {
  id: string;
  name: string;
  description: string;
  philosophy?: string;
  color?: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

export interface TaskAttachment {
  id: string;
  title: string;
  url: string;
  type?: 'link' | 'file' | 'doc';
}

export interface TaskChecklistItem {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  startTime: string; // "10:30"
  endTime: string; // "11:00"
  routineTypeId: string; // Referência a RoutineType.id
  categoryId: string; // Referência a Category.id
  isGoldenRule?: boolean; // Hábito âncora / Regra prioritária
  daysOfWeek: number[]; // [1,2,3,4,5] = Segunda a Sexta
  specificDate?: string; // YYYY-MM-DD (para tarefas específicas de um determinado dia)
  targetMinutes: number;
  tags: string[];
  notes?: string;
  isCustom?: boolean;

  // Épico 2: Especificações internas & Rich Text (RF-6, RF-17)
  richContent?: string;
  attachments?: TaskAttachment[];
  checklist?: TaskChecklistItem[];
}

export interface TaskLog {
  id: string;
  taskId: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
  completedAt?: string; // HH:mm:ss
  timeSpentMinutes?: number;
}

export interface BacklogItem {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  targetMinutes: number;
  tags: string[];
  notes?: string;
  createdAt: string; // ISO string
  originalTaskId?: string;
}

// Bloco de Notas Livre (RF-8, RF-14)
export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  color?: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

// Lembretes Nativos & Notificações (RF-12)
export interface ReminderSettings {
  enabled: boolean;
  advanceMinutes: number; // 0, 5, 10, 15
  soundEnabled: boolean;
}

// Backup do Banco SQLite (Fase 2, Parte 3)
export interface BackupInfo {
  filePath: string;
  fileName: string;
  fileSizeBytes: number;
  createdAt: string;
}

export interface BackupSettings {
  enabled: boolean;
  folderPath: string;
  lastBackupDate: string | null; // YYYY-MM-DD
  lastBackupTime: string | null; // ISO string
  lastBackupStatus: 'success' | 'error' | null;
  lastBackupFileName: string | null;
  lastBackupError: string | null;
  autoRetentionCount: number;
}

// Exportação e Importação de Dados (Fase 2, Parte 4)
export type BackupModalTab = 'backup' | 'export' | 'import';

export interface FlowExportPayload {
  version: string;
  appName: 'Flow';
  appVersion: string;
  exportedAt: string;
  stats: {
    tasksCount: number;
    completionsCount: number;
    backlogCount: number;
    notesCount: number;
    routineTypesCount: number;
    categoriesCount: number;
  };
  data: {
    routineTypes: RoutineType[];
    categories: Category[];
    tasks: Task[];
    logs: Record<string, TaskLog>;
    backlog: BacklogItem[];
    notes: Note[];
    reminderSettings?: ReminderSettings;
    backupSettings?: BackupSettings;
  };
}

export type ImportMode = 'merge' | 'replace';

export interface ImportValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
  summary?: {
    tasksCount: number;
    completionsCount: number;
    backlogCount: number;
    notesCount: number;
    routineTypesCount: number;
    categoriesCount: number;
  };
  sanitizedData?: FlowExportPayload['data'];
}

export interface ImportExecutionResult {
  success: boolean;
  mode: ImportMode;
  stats: {
    tasks: number;
    completions: number;
    backlog: number;
    notes: number;
    routineTypes: number;
    categories: number;
  };
  error?: string;
}

// Pomodoro Vinculado (RF-7, RF-13)
export type PomodoroMode = 'focus' | 'shortBreak' | 'longBreak';

export interface PomodoroState {
  isActive: boolean;
  timeLeftSeconds: number;
  totalDurationSeconds: number;
  mode: PomodoroMode;
  linkedTaskId: string | null;
  completedSessions: number;
}

export interface FlowState {
  activeView: AppView;
  selectedDate: string; // YYYY-MM-DD
  theme: 'dark' | 'light';

  // Tipos de Rotina Dinâmicos
  routineTypes: RoutineType[];
  selectedRoutineTypeId: string;

  // Categorias Dinâmicas
  categories: Category[];
  activeCategoryIdFilter: string | 'all';

  // Tarefas e Dados
  tasks: Task[];
  logs: Record<string, TaskLog>; // key: `${date}_${taskId}`
  backlog: BacklogItem[];

  // Bloco de Notas (RF-8)
  notes: Note[];

  // Pomodoro (RF-7, RF-13)
  pomodoro: PomodoroState;

  // Lembretes Nativos & Notificações (RF-12)
  reminderSettings: ReminderSettings;
  isNotificationModalOpen: boolean;

  // Backup do Banco SQLite e Export/Import (Fase 2, Partes 3 e 4)
  backupSettings: BackupSettings;
  isBackupModalOpen: boolean;
  backupModalTab: BackupModalTab;

  // Atualizações do Aplicativo (Auto-Updater / Releases)
  availableUpdate: {
    hasUpdate: boolean;
    currentVersion: string;
    latestVersion: string;
    releaseName: string;
    releaseNotes: string;
    downloadUrl: string;
    releaseUrl: string;
  } | null;
  isUpdateModalOpen: boolean;

  // Integração Google & Agente de IA com Gemini (RF-15, RF-16, RF-18, RF-19)
  googleUser: GoogleUserProfile | null;
  geminiConfig: GeminiConfig;
  aiMessages: AiChatMessage[];
  isGoogleAuthModalOpen: boolean;

  // Snackbar Undo/Redo
  snackbar: {
    isOpen: boolean;
    message: string;
    onUndo?: () => void;
  };

  // Modais de Controle
  isTaskModalOpen: boolean;
  editingTask: Task | null;
  promoteBacklogModalItem: BacklogItem | null;
  isManageRoutinesModalOpen: boolean;
  isManageCategoriesModalOpen: boolean;

  // Modal de Especificações / Página Interna da Tarefa (RF-6)
  selectedTaskIdForDetail: string | null;
}

export interface FlowActions {
  setActiveView: (view: AppView) => void;
  setDate: (date: string) => void;
  toggleTheme: () => void;

  // Tipos de Rotina
  selectRoutineType: (id: string) => void;
  addRoutineType: (type: Omit<RoutineType, 'id'>) => void;
  updateRoutineType: (id: string, updates: Partial<RoutineType>) => void;
  deleteRoutineType: (id: string) => void;
  openManageRoutinesModal: () => void;
  closeManageRoutinesModal: () => void;

  // Categorias
  setCategoryIdFilter: (categoryId: string | 'all') => void;
  addCategory: (category: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  openManageCategoriesModal: () => void;
  closeManageCategoriesModal: () => void;

  // Tarefas
  toggleTaskCompletion: (taskId: string, date?: string) => void;
  saveTask: (task: Omit<Task, 'id'> & { id?: string }) => void;
  deleteTask: (taskId: string) => void;
  resetToTemplate: () => void;
  openTaskModal: (task?: Task | null) => void;
  closeTaskModal: () => void;

  // Detalhes / Página Interna da Tarefa (RF-6, RF-17)
  openTaskDetail: (taskId: string) => void;
  closeTaskDetail: () => void;
  updateTaskSpecifications: (
    taskId: string,
    updates: {
      richContent?: string;
      attachments?: TaskAttachment[];
      checklist?: TaskChecklistItem[];
    }
  ) => void;
  toggleChecklistItem: (taskId: string, itemId: string) => void;

  // Backlog
  moveTaskToBacklog: (taskId: string, targetDate?: string) => void;
  addBacklogItem: (item: Omit<BacklogItem, 'id' | 'createdAt'>) => void;
  deleteBacklogItem: (id: string) => void;
  openPromoteBacklogModal: (item: BacklogItem | null) => void;
  promoteBacklogToTask: (
    backlogId: string,
    startTime: string,
    endTime: string,
    routineTypeId?: string
  ) => void;

  // Bloco de Notas (RF-8, RF-14)
  addNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateNote: (id: string, updates: Partial<Omit<Note, 'id' | 'createdAt'>>) => void;
  deleteNote: (id: string) => void;
  convertNoteToTask: (
    noteId: string,
    startTime: string,
    endTime: string,
    routineTypeId?: string,
    categoryId?: string
  ) => void;

  // Pomodoro (RF-7, RF-13)
  startPomodoro: (linkedTaskId?: string) => void;
  pausePomodoro: () => void;
  resetPomodoro: (newDurationSeconds?: number) => void;
  setPomodoroMode: (mode: PomodoroMode, durationSeconds?: number) => void;
  setPomodoroDuration: (seconds: number) => void;
  linkTaskToPomodoro: (taskId: string | null) => void;
  tickPomodoro: () => void;
  finishPomodoroSession: () => void;

  // Lembretes & Notificações (RF-12)
  updateReminderSettings: (updates: Partial<ReminderSettings>) => void;
  openNotificationModal: () => void;
  closeNotificationModal: () => void;

  // Backup do Banco SQLite e Export/Import (Fase 2, Partes 3 e 4)
  updateBackupSettings: (updates: Partial<BackupSettings>) => void;
  openBackupModal: (tab?: BackupModalTab | any) => void;
  setBackupModalTab: (tab: BackupModalTab) => void;
  closeBackupModal: () => void;

  // Atualizações do Aplicativo
  setAvailableUpdate: (update: FlowState['availableUpdate']) => void;
  openUpdateModal: () => void;
  closeUpdateModal: () => void;

  // Agente de IA com Gemini & Conta Google (RF-15, RF-16, RF-18, RF-19)
  setGoogleUser: (user: GoogleUserProfile | null) => void;
  setGeminiConfig: (config: Partial<GeminiConfig>) => void;
  addAiMessage: (
    msg: Omit<AiChatMessage, 'id' | 'timestamp'> & { id?: string; timestamp?: string }
  ) => void;
  clearAiChat: () => void;
  applyAiActionProposal: (proposalId: string) => void;
  openGoogleAuthModal: () => void;
  closeGoogleAuthModal: () => void;

  // Snackbar Undo/Redo
  showSnackbar: (message: string, onUndo?: () => void) => void;
  hideSnackbar: () => void;
}

export type FlowStore = FlowState & FlowActions;
