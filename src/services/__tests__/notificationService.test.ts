import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notificationService, isTauriEnvironment } from '../notificationService';

describe('notificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as any).__TAURI__;
    delete (window as any).__TAURI_INTERNALS__;
    delete (window as any).__TAURI_METADATA__;
  });

  describe('isTauriEnvironment', () => {
    it('deve retornar false quando nenhuma variável global Tauri estiver presente', () => {
      expect(isTauriEnvironment()).toBe(false);
    });

    it('deve retornar true quando __TAURI_INTERNALS__ estiver presente', () => {
      (window as any).__TAURI_INTERNALS__ = {};
      expect(isTauriEnvironment()).toBe(true);
    });

    it('deve retornar true quando __TAURI__ estiver presente', () => {
      (window as any).__TAURI__ = {};
      expect(isTauriEnvironment()).toBe(true);
    });
  });

  describe('isSupported & getPermissionStatus', () => {
    it('deve indicar suporte a notificações no navegador quando window.Notification existir', () => {
      expect(notificationService.isSupported()).toBe(true);
    });

    it('deve obter o status de permissão do navegador', () => {
      (window.Notification as any).permission = 'granted';
      expect(notificationService.getPermissionStatus()).toBe('granted');

      (window.Notification as any).permission = 'denied';
      expect(notificationService.getPermissionStatus()).toBe('denied');
    });

    it('deve retornar "granted" no ambiente Tauri', () => {
      (window as any).__TAURI__ = {};
      expect(notificationService.getPermissionStatus()).toBe('granted');
    });
  });

  describe('requestPermission', () => {
    it('deve solicitar permissão via Notification.requestPermission no navegador', async () => {
      (window.Notification.requestPermission as any).mockResolvedValueOnce('granted');
      const granted = await notificationService.requestPermission();
      expect(granted).toBe(true);
      expect(window.Notification.requestPermission).toHaveBeenCalled();
    });

    it('deve retornar false caso a permissão seja negada no navegador', async () => {
      (window.Notification.requestPermission as any).mockResolvedValueOnce('denied');
      const granted = await notificationService.requestPermission();
      expect(granted).toBe(false);
    });
  });

  describe('onToast & sendNotification', () => {
    it('deve registrar listener de toast e dispará-lo quando sendNotification for chamado', async () => {
      const mockToastListener = vi.fn();
      const unsubscribe = notificationService.onToast(mockToastListener);

      const payload = {
        title: 'Hora do Foco',
        body: 'Iniciando bloco de 25 minutos.',
        playSound: false,
      };

      await notificationService.sendNotification(payload);

      expect(mockToastListener).toHaveBeenCalledTimes(1);
      expect(mockToastListener).toHaveBeenCalledWith(payload);

      // Desinscreve e verifica que não recebe mais notificações
      unsubscribe();
      await notificationService.sendNotification(payload);
      expect(mockToastListener).toHaveBeenCalledTimes(1);
    });

    it('deve instanciar notificação nativa do navegador quando permissão concedida', async () => {
      (window.Notification as any).permission = 'granted';

      await notificationService.sendNotification({
        title: 'Lembrete de Tarefa',
        body: 'Almoço saudável',
        playSound: true,
      });

      expect(window.Notification).toHaveBeenCalledWith(
        'Lembrete de Tarefa',
        expect.objectContaining({
          body: 'Almoço saudável',
          silent: true,
        })
      );
    });
  });
});
