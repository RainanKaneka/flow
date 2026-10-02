import { RoutineType, Category, Task } from '../types/routine';

export const DEFAULT_ROUTINE_TYPES: RoutineType[] = [
  {
    id: 'main_routine',
    name: 'Minha Rotina',
    description: 'Sua rotina personalizada de alta performance e constância diária.',
    philosophy: 'Um dia produtivo começa com clareza e intenção.',
    color: '#6366F1',
  },
];

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'geral',
    name: 'Geral',
    color: '#6366F1',
  },
];

export const getTodayDateStringHelper = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const createWelcomeTask = (dateStr?: string): Task => ({
  id: 'welcome_task',
  title: 'Boas-vindas ao Flow: Crie sua primeira atividade!',
  description:
    'Esta é uma tarefa de exemplo para você conhecer o app. Clique em "+ Nova Atividade" (ou use Ctrl+N) para criar suas próprias atividades, definir horários e marcar Regras de Ouro. Você pode editar ou excluir este card quando quiser!',
  startTime: '09:00',
  endTime: '09:30',
  routineTypeId: 'main_routine',
  categoryId: 'geral',
  isGoldenRule: true,
  daysOfWeek: [], // Apenas no primeiro dia que a pessoa entrou (não recorrente nos demais dias)
  specificDate: dateStr || getTodayDateStringHelper(),
  targetMinutes: 30,
  tags: ['início', 'tutorial'],
  notes: 'Dica: Clique no ícone de documento no card para ver sub-tarefas e links!',
  checklist: [
    {
      id: 'step_1',
      title: 'Explorar as abas: Pomodoro, Notas, Backlog e Dashboard',
      completed: false,
    },
    {
      id: 'step_2',
      title: 'Criar suas próprias categorias no menu "Gerenciar Categorias"',
      completed: false,
    },
    { id: 'step_3', title: 'Adicionar sua primeira atividade personalizada', completed: false },
  ],
});

export const DEFAULT_TASKS: Task[] = [createWelcomeTask()];
