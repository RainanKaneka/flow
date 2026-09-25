import { Task } from '../types/routine';
import { timeToMinutes, minutesToTime } from './routineReplan';

export interface ReorderResult {
  updatedTasks: Task[];
  hasChanges: boolean;
  affectedTaskIds: string[];
}

/**
 * Reordena tarefas e recalcula seus horários de forma encadeada e inteligente.
 * - Preserva a duração (targetMinutes / tempo entre start e end) de cada atividade.
 * - Encadeia o início de tarefas subsequentes para evitar sobreposição.
 * - Preserva intervalos naturais de descanso/almoço quando não há colisão.
 */
export function reorderAndRescheduleTasks(
  dayTasks: Task[],
  sourceTaskId: string,
  targetTaskId: string
): ReorderResult {
  if (!dayTasks || dayTasks.length <= 1 || sourceTaskId === targetTaskId) {
    return { updatedTasks: dayTasks, hasChanges: false, affectedTaskIds: [] };
  }

  const sourceIndex = dayTasks.findIndex((t) => t.id === sourceTaskId);
  const targetIndex = dayTasks.findIndex((t) => t.id === targetTaskId);

  if (sourceIndex === -1 || targetIndex === -1) {
    return { updatedTasks: dayTasks, hasChanges: false, affectedTaskIds: [] };
  }

  // 1. Reordena os elementos na lista
  const reordered = [...dayTasks];
  const [movedTask] = reordered.splice(sourceIndex, 1);
  reordered.splice(targetIndex, 0, movedTask);

  // 2. Determina o horário de início inicial da cadeia
  // Usamos o horário inicial original da primeira tarefa da lista
  const initialStartTimeMinutes = timeToMinutes(dayTasks[0].startTime);

  // Mapeia gaps originais entre tarefas ordenadas cronologicamente
  const origGapMap = new Map<string, number>();
  origGapMap.set(dayTasks[0].id, 0);
  for (let k = 1; k < dayTasks.length; k++) {
    const prevEnd = timeToMinutes(dayTasks[k - 1].endTime);
    const currStart = timeToMinutes(dayTasks[k].startTime);
    const gap = Math.max(0, currStart - prevEnd);
    origGapMap.set(dayTasks[k].id, gap);
  }

  let currentStartMinutes = initialStartTimeMinutes;
  const updatedTasks: Task[] = [];
  const affectedTaskIds: string[] = [];

  for (let i = 0; i < reordered.length; i++) {
    const task = reordered[i];
    const origStart = timeToMinutes(task.startTime);
    const origEnd = timeToMinutes(task.endTime);
    const duration = Math.max(10, origEnd - origStart);

    let newStartMinutes: number;

    if (i === 0) {
      newStartMinutes = initialStartTimeMinutes;
    } else {
      // Se a tarefa não foi a movida e possuía um intervalo original (ex: almoço),
      // preservamos o início original contanto que ele ainda esteja adiante do término atual.
      const origGap = origGapMap.get(task.id) || 0;
      if (
        task.id !== sourceTaskId &&
        origGap > 0 &&
        origStart >= currentStartMinutes + origGap
      ) {
        newStartMinutes = origStart;
      } else {
        newStartMinutes = currentStartMinutes;
      }
    }

    const newEndMinutes = Math.min(23 * 60 + 59, newStartMinutes + duration);
    const newStartTime = minutesToTime(newStartMinutes);
    const newEndTime = minutesToTime(newEndMinutes);

    const hasTimeChanged =
      task.startTime !== newStartTime || task.endTime !== newEndTime;

    if (hasTimeChanged || task.id === sourceTaskId) {
      affectedTaskIds.push(task.id);
    }

    updatedTasks.push({
      ...task,
      startTime: newStartTime,
      endTime: newEndTime,
      targetMinutes: duration,
    });

    currentStartMinutes = newEndMinutes;
  }

  return {
    updatedTasks,
    hasChanges: true,
    affectedTaskIds,
  };
}

/**
 * Desloca o horário de uma tarefa em +/- minutos especificados.
 */
export function shiftTaskTime(task: Task, deltaMinutes: number): Task {
  const currentStart = timeToMinutes(task.startTime);
  const currentEnd = timeToMinutes(task.endTime);
  const duration = Math.max(10, currentEnd - currentStart);

  const newStartMinutes = Math.max(0, Math.min(23 * 60 + 59 - duration, currentStart + deltaMinutes));
  const newEndMinutes = Math.min(23 * 60 + 59, newStartMinutes + duration);

  return {
    ...task,
    startTime: minutesToTime(newStartMinutes),
    endTime: minutesToTime(newEndMinutes),
    targetMinutes: duration,
  };
}
