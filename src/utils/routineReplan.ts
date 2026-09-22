import { Task } from '../types/routine';

export interface ReplanDiffItem {
  taskId: string;
  title: string;
  originalStartTime: string;
  originalEndTime: string;
  newStartTime: string;
  newEndTime: string;
  isGoldenRule?: boolean;
  categoryName?: string;
  categoryColor?: string;
}

export interface ReplanResult {
  diffs: ReplanDiffItem[];
  summary: string;
  delayMinutes: number;
  overflowDetected: boolean;
}

export const timeToMinutes = (timeStr: string): number => {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
};

export const minutesToTime = (totalMinutes: number): string => {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, totalMinutes));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

interface ReplanParams {
  tasks: Task[];
  delayMinutes: number;
  referenceTime?: string; // "HH:mm"
  afterTaskId?: string;
}

/**
 * Motor de replanejamento automático (RF-16):
 * Redistribui os horários das tarefas restantes do dia quando o usuário relata atraso.
 */
export const calculateReplanSchedule = ({
  tasks,
  delayMinutes,
  referenceTime,
  afterTaskId,
}: ReplanParams): ReplanResult => {
  if (!tasks || tasks.length === 0 || delayMinutes <= 0) {
    return {
      diffs: [],
      summary: 'Nenhuma alteração necessária.',
      delayMinutes,
      overflowDetected: false,
    };
  }

  // Ordena tarefas cronologicamente
  const sortedTasks = [...tasks].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  let refMinutes = 0;
  if (afterTaskId) {
    const target = sortedTasks.find((t) => t.id === afterTaskId);
    if (target) {
      refMinutes = timeToMinutes(target.endTime);
    }
  } else if (referenceTime) {
    refMinutes = timeToMinutes(referenceTime);
  } else {
    // Referência padrão: hora atual
    const now = new Date();
    refMinutes = now.getHours() * 60 + now.getMinutes();
  }

  const diffs: ReplanDiffItem[] = [];
  let overflowDetected = false;

  for (const task of sortedTasks) {
    const taskStartMinutes = timeToMinutes(task.startTime);
    const taskEndMinutes = timeToMinutes(task.endTime);
    const duration = Math.max(10, taskEndMinutes - taskStartMinutes);

    // Replaneja apenas atividades que iniciam a partir do horário de referência
    if (taskStartMinutes >= refMinutes) {
      const newStartMinutes = taskStartMinutes + delayMinutes;
      const newEndMinutes = newStartMinutes + duration;

      if (newEndMinutes > 23 * 60 + 59) {
        overflowDetected = true;
      }

      diffs.push({
        taskId: task.id,
        title: task.title,
        originalStartTime: task.startTime,
        originalEndTime: task.endTime,
        newStartTime: minutesToTime(newStartMinutes),
        newEndTime: minutesToTime(newEndMinutes),
        isGoldenRule: task.isGoldenRule,
      });
    }
  }

  const count = diffs.length;
  let summary = '';
  if (count === 0) {
    summary = `Nenhuma tarefa futura encontrada após as ${minutesToTime(refMinutes)} para replanejar.`;
  } else {
    summary = `${count} ${count === 1 ? 'tarefa ajustada' : 'tarefas ajustadas'} com deslocamento de +${delayMinutes} min.`;
    if (overflowDetected) {
      summary += ' ⚠️ Atenção: algumas atividades finais avançarão para perto da meia-noite.';
    }
  }

  return {
    diffs,
    summary,
    delayMinutes,
    overflowDetected,
  };
};
