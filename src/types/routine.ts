export type RoutineLevel = 'easy' | 'medium' | 'hard';

export type TaskCategory =
  | 'coding'
  | 'health'
  | 'routine'
  | 'relationship'
  | 'college'
  | 'creative'
  | 'career'
  | 'leisure';

export type AppView = 'routine' | 'dashboard' | 'backlog';

export interface Task {
  id: string;
  title: string;
  description: string;
  startTime: string; // "10:30"
  endTime: string;   // "11:00"
  level: RoutineLevel;
  category: TaskCategory;
  isGoldenRule?: boolean; // Regra inegociável da rotina
  daysOfWeek: number[];   // [1,2,3,4,5] = Segunda a Sexta
  targetMinutes: number;
  tags: string[];
  notes?: string;
  isCustom?: boolean;
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
  category: TaskCategory;
  targetMinutes: number;
  tags: string[];
  notes?: string;
  createdAt: string; // ISO string
  originalTaskId?: string;
}

export interface DailySummary {
  date: string;
  totalTasks: number;
  completedTasks: number;
  percentage: number;
  goldenRulesFollowed: boolean;
  status: 'epic' | 'good' | 'recovery';
}

export interface FlowState {
  activeView: AppView;
  selectedLevel: RoutineLevel;
  selectedDate: string; // YYYY-MM-DD
  theme: 'dark' | 'light';
  tasks: Task[];
  logs: Record<string, TaskLog>; // key: `${date}_${taskId}`
  backlog: BacklogItem[];
  activeCategoryFilter: TaskCategory | 'all';
  isTaskModalOpen: boolean;
  editingTask: Task | null;
  promoteBacklogModalItem: BacklogItem | null;
}

export interface FlowActions {
  setActiveView: (view: AppView) => void;
  setLevel: (level: RoutineLevel) => void;
  setDate: (date: string) => void;
  toggleTheme: () => void;
  toggleTaskCompletion: (taskId: string, date?: string) => void;
  saveTask: (task: Omit<Task, 'id'> & { id?: string }) => void;
  deleteTask: (taskId: string) => void;
  resetToInitialRoutine: () => void;
  setCategoryFilter: (category: TaskCategory | 'all') => void;
  openTaskModal: (task?: Task | null) => void;
  closeTaskModal: () => void;
  
  // Backlog actions (RF-11)
  moveTaskToBacklog: (taskId: string, targetDate?: string) => void;
  addBacklogItem: (item: Omit<BacklogItem, 'id' | 'createdAt'>) => void;
  deleteBacklogItem: (id: string) => void;
  openPromoteBacklogModal: (item: BacklogItem | null) => void;
  promoteBacklogToTask: (backlogId: string, startTime: string, endTime: string, level?: RoutineLevel) => void;
}

export type FlowStore = FlowState & FlowActions;
