'use client';

import { useEffect, useRef } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { notificationService } from './notificationService';

const parseTimeToMinutes = (timeStr: string): number => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const formatMinutesToTime = (minutes: number): string => {
  // Ajusta caso seja negativo (ex: 00:02 - 5 min = dia anterior 23:57)
  const normalized = (minutes + 24 * 60) % (24 * 60);
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const useReminderScheduler = () => {
  const reminderSettings = useFlowStore((s) => s.reminderSettings);
  const tasks = useFlowStore((s) => s.tasks);
  const routineTypes = useFlowStore((s) => s.routineTypes);
  const selectedRoutineTypeId = useFlowStore((s) => s.selectedRoutineTypeId);
  const categories = useFlowStore((s) => s.categories);
  const selectedDate = useFlowStore((s) => s.selectedDate);

  // Armazena as chaves de notificações já disparadas nesta sessão
  const notifiedKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!reminderSettings.enabled) return;

    const checkReminders = () => {
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;
      const currentDayOfWeek = now.getDay();

      const advance = reminderSettings.advanceMinutes;

      // Filtra as tarefas ativas para o tipo de rotina selecionado e para o dia de hoje
      const todaysTasks = tasks.filter(
        (t) =>
          t.routineTypeId === selectedRoutineTypeId &&
          t.daysOfWeek.includes(currentDayOfWeek)
      );

      for (const task of todaysTasks) {
        if (!task.startTime) continue;

        const taskStartMinutes = parseTimeToMinutes(task.startTime);
        const triggerMinutes = taskStartMinutes - advance;
        const triggerTimeStr = formatMinutesToTime(triggerMinutes);

        // Chave única para evitar repetição do mesmo lembrete no dia
        const reminderKey = `${selectedDate}_${task.id}_${task.startTime}_${advance}`;

        if (currentTimeStr === triggerTimeStr && !notifiedKeysRef.current.has(reminderKey)) {
          notifiedKeysRef.current.add(reminderKey);

          const category = categories.find((c) => c.id === task.categoryId);
          const categoryName = category ? category.name : 'Geral';

          const title =
            advance === 0
              ? `Agora: ${task.title}`
              : `Em ${advance} min: ${task.title}`;

          const body = `Início às ${task.startTime} (${task.targetMinutes}m) • ${categoryName}\n${task.description || ''}`;

          notificationService.sendNotification({
            title,
            body: body.trim(),
            playSound: reminderSettings.soundEnabled,
          });
        }
      }
    };

    // Executa verificação inicial e a cada 20 segundos
    checkReminders();
    const interval = setInterval(checkReminders, 20000);

    return () => clearInterval(interval);
  }, [
    reminderSettings,
    tasks,
    selectedRoutineTypeId,
    categories,
    selectedDate,
  ]);
};
