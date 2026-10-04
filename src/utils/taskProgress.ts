import { Task, TaskLog } from '../types/routine';

export type TaskProgressStatus = 'pending' | 'in_progress' | 'completed';

export function getLocalDateString(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** Horários locais da ocorrência, inclusive quando ela atravessa a meia-noite. */
export function getTaskTimeWindow(task: Task, date: string): { start: Date; end: Date } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [year, month, day] = date.split('-').map(Number);
  const dayStart = new Date(year, month - 1, day);
  if (getLocalDateString(dayStart) !== date) return null;
  if (
    task.specificDate ? task.specificDate !== date : !task.daysOfWeek.includes(dayStart.getDay())
  ) {
    return null;
  }

  const parseTime = (time: string) => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
    const [hours, minutes] = time.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes);
  };
  const start = parseTime(task.startTime);
  const end = parseTime(task.endTime);
  if (!start || !end || start.getTime() === end.getTime()) return null;
  if (end < start) end.setDate(end.getDate() + 1);
  return { start, end };
}

/** Início manual pode antecipar uma tarefa de hoje, mas nunca prolongá-la além do fim. */
export function canStartTask(task: Task, date: string, now = new Date()): boolean {
  const window = getTaskTimeWindow(task, date);
  if (!window || now >= window.end) return false;
  return date === getLocalDateString(now) || (now >= window.start && now < window.end);
}

/** Prefere uma ocorrência ainda ativa da noite anterior, antes da de hoje. */
export function getCurrentTaskDate(task: Task, now = new Date()): string | null {
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const previousDate = getLocalDateString(yesterday);
  const previousWindow = getTaskTimeWindow(task, previousDate);
  if (previousWindow && now >= previousWindow.start && now < previousWindow.end)
    return previousDate;
  const today = getLocalDateString(now);
  return canStartTask(task, today, now) ? today : null;
}

export function getTaskProgressStatus(
  task: Task,
  log: TaskLog | undefined,
  date: string,
  now = new Date()
): TaskProgressStatus {
  if (log?.completed) return 'completed';
  if (log?.inProgress && canStartTask(task, date, now)) return 'in_progress';
  const window = task.autoStart && !log?.startedAt ? getTaskTimeWindow(task, date) : null;
  if (window && now >= window.start && now < window.end) return 'in_progress';
  return 'pending';
}
