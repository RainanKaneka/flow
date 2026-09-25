import { Task, TaskLog, Category } from '../types/routine';

export interface CalendarDayData {
  dateStr: string; // YYYY-MM-DD
  dayNumber: number;
  month: number; // 0-11
  year: number;
  dayOfWeek: number; // 0 (Dom) - 6 (Sab)
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  tasks: Task[];
  totalTasks: number;
  completedTasks: number;
  completionRate: number; // 0 - 100
  isPerfectDay: boolean;
  categories: { id: string; name: string; color: string }[];
}

export interface MonthSummary {
  monthName: string;
  year: number;
  month: number;
  totalScheduledTasks: number;
  totalCompletedTasks: number;
  averageCompletionRate: number;
  perfectDaysCount: number;
  activeDaysCount: number;
}

export const MONTH_NAMES_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export const WEEKDAY_NAMES_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/**
 * Formata ano, mês e dia em string YYYY-MM-DD
 */
export function formatYMD(year: number, monthIndex: number, day: number): string {
  const m = String(monthIndex + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

/**
 * Obtém tarefas programadas para uma data específica
 */
export function getTasksForDate(tasks: Task[], dateStr: string, dayOfWeek: number): Task[] {
  return tasks.filter((task) => {
    if (task.specificDate) {
      return task.specificDate === dateStr;
    }
    return task.daysOfWeek.includes(dayOfWeek);
  });
}

/**
 * Constrói a matriz completa de dias para o calendário mensal (35 ou 42 dias),
 * incluindo preenchimento dos dias dos meses adjacentes para completar as semanas.
 */
export function buildMonthCalendarDays(
  year: number,
  monthIndex: number, // 0 - 11
  selectedDateStr: string,
  todayDateStr: string,
  tasks: Task[],
  logs: Record<string, TaskLog>,
  categories: Category[]
): CalendarDayData[] {
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  // Primeiro dia do mês selecionado
  const firstDayOfMonth = new Date(year, monthIndex, 1);
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 a 6

  // Total de dias no mês atual
  const daysInCurrentMonth = new Date(year, monthIndex + 1, 0).getDate();

  // Total de dias no mês anterior
  const daysInPrevMonth = new Date(year, monthIndex, 0).getDate();

  const days: CalendarDayData[] = [];

  // 1. Dias do mês anterior para completar a primeira semana
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const prevMonthIndex = monthIndex === 0 ? 11 : monthIndex - 1;
    const prevYear = monthIndex === 0 ? year - 1 : year;
    const dateStr = formatYMD(prevYear, prevMonthIndex, dayNum);
    const dayOfWeek = (startDayOfWeek - 1 - i) % 7;

    const dayTasks = getTasksForDate(tasks, dateStr, dayOfWeek);
    const completedTasks = dayTasks.filter((t) => logs[`${dateStr}_${t.id}`]?.completed).length;
    const totalTasks = dayTasks.length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    days.push({
      dateStr,
      dayNumber: dayNum,
      month: prevMonthIndex,
      year: prevYear,
      dayOfWeek,
      isCurrentMonth: false,
      isToday: dateStr === todayDateStr,
      isSelected: dateStr === selectedDateStr,
      tasks: dayTasks,
      totalTasks,
      completedTasks,
      completionRate,
      isPerfectDay: totalTasks > 0 && completedTasks === totalTasks,
      categories: Array.from(
        new Set(dayTasks.map((t) => t.categoryId))
      ).map((catId) => categoryMap.get(catId) || { id: catId, name: 'Geral', color: '#6366F1' }),
    });
  }

  // 2. Dias do mês atual
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const dateStr = formatYMD(year, monthIndex, d);
    const dateObj = new Date(year, monthIndex, d);
    const dayOfWeek = dateObj.getDay();

    const dayTasks = getTasksForDate(tasks, dateStr, dayOfWeek);
    const completedTasks = dayTasks.filter((t) => logs[`${dateStr}_${t.id}`]?.completed).length;
    const totalTasks = dayTasks.length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    days.push({
      dateStr,
      dayNumber: d,
      month: monthIndex,
      year,
      dayOfWeek,
      isCurrentMonth: true,
      isToday: dateStr === todayDateStr,
      isSelected: dateStr === selectedDateStr,
      tasks: dayTasks,
      totalTasks,
      completedTasks,
      completionRate,
      isPerfectDay: totalTasks > 0 && completedTasks === totalTasks,
      categories: Array.from(
        new Set(dayTasks.map((t) => t.categoryId))
      ).map((catId) => categoryMap.get(catId) || { id: catId, name: 'Geral', color: '#6366F1' }),
    });
  }

  // 3. Dias do próximo mês para completar a grade de semanas (múltiplo de 7, máx 42)
  const remainingCells = (7 - (days.length % 7)) % 7;
  const targetTotal = days.length + remainingCells < 35 ? 35 : days.length + remainingCells;
  const daysToAppend = targetTotal - days.length;

  for (let nextDay = 1; nextDay <= daysToAppend; nextDay++) {
    const nextMonthIndex = monthIndex === 11 ? 0 : monthIndex + 1;
    const nextYear = monthIndex === 11 ? year + 1 : year;
    const dateStr = formatYMD(nextYear, nextMonthIndex, nextDay);
    const dateObj = new Date(nextYear, nextMonthIndex, nextDay);
    const dayOfWeek = dateObj.getDay();

    const dayTasks = getTasksForDate(tasks, dateStr, dayOfWeek);
    const completedTasks = dayTasks.filter((t) => logs[`${dateStr}_${t.id}`]?.completed).length;
    const totalTasks = dayTasks.length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    days.push({
      dateStr,
      dayNumber: nextDay,
      month: nextMonthIndex,
      year: nextYear,
      dayOfWeek,
      isCurrentMonth: false,
      isToday: dateStr === todayDateStr,
      isSelected: dateStr === selectedDateStr,
      tasks: dayTasks,
      totalTasks,
      completedTasks,
      completionRate,
      isPerfectDay: totalTasks > 0 && completedTasks === totalTasks,
      categories: Array.from(
        new Set(dayTasks.map((t) => t.categoryId))
      ).map((catId) => categoryMap.get(catId) || { id: catId, name: 'Geral', color: '#6366F1' }),
    });
  }

  return days;
}

/**
 * Calcula resumo do mês corrente
 */
export function calculateMonthSummary(
  days: CalendarDayData[],
  year: number,
  monthIndex: number
): MonthSummary {
  const currentMonthDays = days.filter((d) => d.isCurrentMonth);

  let totalScheduledTasks = 0;
  let totalCompletedTasks = 0;
  let perfectDaysCount = 0;
  let activeDaysCount = 0;

  for (const day of currentMonthDays) {
    totalScheduledTasks += day.totalTasks;
    totalCompletedTasks += day.completedTasks;
    if (day.isPerfectDay) {
      perfectDaysCount += 1;
    }
    if (day.completedTasks > 0) {
      activeDaysCount += 1;
    }
  }

  const averageCompletionRate =
    totalScheduledTasks > 0
      ? Math.round((totalCompletedTasks / totalScheduledTasks) * 100)
      : 0;

  return {
    monthName: MONTH_NAMES_PT[monthIndex],
    year,
    month: monthIndex,
    totalScheduledTasks,
    totalCompletedTasks,
    averageCompletionRate,
    perfectDaysCount,
    activeDaysCount,
  };
}

/**
 * Navega para o mês anterior
 */
export function getPrevMonth(year: number, monthIndex: number): { year: number; month: number } {
  if (monthIndex === 0) {
    return { year: year - 1, month: 11 };
  }
  return { year, month: monthIndex - 1 };
}

/**
 * Navega para o próximo mês
 */
export function getNextMonth(year: number, monthIndex: number): { year: number; month: number } {
  if (monthIndex === 11) {
    return { year: year + 1, month: 0 };
  }
  return { year, month: monthIndex + 1 };
}
