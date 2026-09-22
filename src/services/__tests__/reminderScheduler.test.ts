import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReminderScheduler } from '../reminderScheduler';
import { useFlowStore } from '../../store/useFlowStore';
import { notificationService } from '../notificationService';

describe('useReminderScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useFlowStore.getState().resetToTemplate();
    vi.spyOn(notificationService, 'sendNotification').mockImplementation(vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('não deve disparar notificações se lembretes estiverem desabilitados', () => {
    useFlowStore.getState().updateReminderSettings({ enabled: false });

    renderHook(() => useReminderScheduler());

    act(() => {
      vi.advanceTimersByTime(30000);
    });

    expect(notificationService.sendNotification).not.toHaveBeenCalled();
  });

  it('deve disparar notificação no horário exato de disparo da tarefa', () => {
    // Configura horário falso do sistema: 08:55 (terça-feira, 22/09/2026)
    const mockNow = new Date(2026, 8, 22, 8, 55, 0);
    vi.setSystemTime(mockNow);

    const routineId = useFlowStore.getState().selectedRoutineTypeId;
    const catId = useFlowStore.getState().categories[0].id;

    // Adiciona tarefa que inicia às 09:00 com antecedência de 5 minutos (disparo às 08:55)
    useFlowStore.getState().saveTask({
      title: 'Daily Meeting de Alinhamento',
      startTime: '09:00',
      endTime: '09:30',
      targetMinutes: 30,
      daysOfWeek: [mockNow.getDay()],
      categoryId: catId,
      routineTypeId: routineId,
    });

    useFlowStore.getState().updateReminderSettings({
      enabled: true,
      advanceMinutes: 5,
      soundEnabled: true,
    });

    renderHook(() => useReminderScheduler());

    expect(notificationService.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining('Em 5 min: Daily Meeting de Alinhamento'),
        playSound: true,
      })
    );
  });
});
