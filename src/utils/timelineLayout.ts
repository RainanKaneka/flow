import { Task, TaskLog } from '../types/routine';
import { timeToMinutes } from './routineReplan';

export interface TimelineTaskItem {
  type: 'task';
  id: string;
  task: Task;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: 'completed' | 'in_progress' | 'upcoming';
  isCurrent: boolean;
}

export interface TimelineIntervalItem {
  type: 'interval';
  id: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  isCurrent: boolean;
}

export type TimelineItem = TimelineTaskItem | TimelineIntervalItem;

export interface TimelineSummary {
  totalTasks: number;
  completedTasks: number;
  totalPlannedMinutes: number;
  completedMinutes: number;
  freeMinutes: number;
  completionRate: number; // 0 to 100
}

/**
 * Formata minutos em formato amigável "Xh Ym" ou "Ym"
 */
export function formatDurationHuman(minutes: number): string {
  if (minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Constrói os itens estruturados da Timeline (estilo Structured),
 * intercalando tarefas cronológicas e blocos de tempo livre (intervalos).
 */
export function buildTimelineItems(
  tasks: Task[],
  logs: Record<string, TaskLog>,
  selectedDate: string,
  nowMinutes?: number
): TimelineItem[] {
  if (!tasks || tasks.length === 0) {
    return [];
  }

  // Ordena tarefas cronologicamente por horário de início
  const sortedTasks = [...tasks].sort(
    (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
  );

  const items: TimelineItem[] = [];

  for (let i = 0; i < sortedTasks.length; i++) {
    const task = sortedTasks[i];
    const taskStartMin = timeToMinutes(task.startTime);
    const taskEndMin = timeToMinutes(task.endTime);
    const taskDuration = Math.max(10, taskEndMin - taskStartMin);

    // 1. Verifica se existe intervalo livre antes da tarefa atual
    if (i > 0) {
      const prevTask = sortedTasks[i - 1];
      const prevEndMin = timeToMinutes(prevTask.endTime);
      const gapMinutes = taskStartMin - prevEndMin;

      // Cria bloco de intervalo para lacunas de 10 min ou mais
      if (gapMinutes >= 10) {
        const isIntervalCurrent =
          nowMinutes !== undefined &&
          nowMinutes >= prevEndMin &&
          nowMinutes < taskStartMin;

        items.push({
          type: 'interval',
          id: `interval_${prevTask.id}_${task.id}`,
          startTime: prevTask.endTime,
          endTime: task.startTime,
          durationMinutes: gapMinutes,
          isCurrent: isIntervalCurrent,
        });
      }
    }

    // 2. Determina status da tarefa
    const logKey = `${selectedDate}_${task.id}`;
    const log = logs[logKey];
    const isCompleted = !!log?.completed;

    const isCurrent =
      nowMinutes !== undefined &&
      nowMinutes >= taskStartMin &&
      nowMinutes < taskEndMin;

    let status: 'completed' | 'in_progress' | 'upcoming';
    if (isCompleted) {
      status = 'completed';
    } else if (isCurrent) {
      status = 'in_progress';
    } else {
      status = 'upcoming';
    }

    items.push({
      type: 'task',
      id: `timeline_task_${task.id}`,
      task,
      startTime: task.startTime,
      endTime: task.endTime,
      durationMinutes: taskDuration,
      status,
      isCurrent,
    });
  }

  return items;
}

/**
 * Calcula resumo métrico para a visualização da Timeline
 */
export function calculateTimelineSummary(items: TimelineItem[]): TimelineSummary {
  let totalTasks = 0;
  let completedTasks = 0;
  let totalPlannedMinutes = 0;
  let completedMinutes = 0;
  let freeMinutes = 0;

  for (const item of items) {
    if (item.type === 'task') {
      totalTasks += 1;
      totalPlannedMinutes += item.durationMinutes;
      if (item.status === 'completed') {
        completedTasks += 1;
        completedMinutes += item.durationMinutes;
      }
    } else if (item.type === 'interval') {
      freeMinutes += item.durationMinutes;
    }
  }

  const completionRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return {
    totalTasks,
    completedTasks,
    totalPlannedMinutes,
    completedMinutes,
    freeMinutes,
    completionRate,
  };
}
