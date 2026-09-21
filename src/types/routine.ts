export type AppView = 'routine' | 'dashboard' | 'backlog';

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

export interface Task {
  id: string;
  title: string;
  description: string;
  startTime: string; // "10:30"
  endTime: string;   // "11:00"
  routineTypeId: string; // Referência a RoutineType.id
  categoryId: string;    // Referência a Category.id
  isGoldenRule?: boolean; // Hábito âncora / Regra prioritária
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
  categoryId: string;
  targetMinutes: number;
  tags: string[];
  notes?: string;
  createdAt: string; // ISO string
  originalTaskId?: string;
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
  
  // Modais de Controle
  isTaskModalOpen: boolean;
  editingTask: Task | null;
  promoteBacklogModalItem: BacklogItem | null;
  isManageRoutinesModalOpen: boolean;
  isManageCategoriesModalOpen: boolean;
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
  
  // Backlog
  moveTaskToBacklog: (taskId: string, targetDate?: string) => void;
  addBacklogItem: (item: Omit<BacklogItem, 'id' | 'createdAt'>) => void;
  deleteBacklogItem: (id: string) => void;
  openPromoteBacklogModal: (item: BacklogItem | null) => void;
  promoteBacklogToTask: (backlogId: string, startTime: string, endTime: string, routineTypeId?: string) => void;
}

export type FlowStore = FlowState & FlowActions;
