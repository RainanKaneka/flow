import { sounds } from '../utils/audio';

export type NotificationPermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';

export interface NotificationPayload {
  title: string;
  body: string;
  playSound?: boolean;
}

type ToastListener = (payload: NotificationPayload) => void;

class NotificationService {
  private toastListeners: Set<ToastListener> = new Set();

  /**
   * Verifica se o ambiente suporta notificações do sistema
   */
  isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'Notification' in window;
  }

  /**
   * Obtém o status atual de permissão de notificações
   */
  getPermissionStatus(): NotificationPermissionStatus {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission as NotificationPermissionStatus;
  }

  /**
   * Solicita permissão ao usuário para disparar notificações do sistema
   */
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (e) {
      console.warn('Erro ao solicitar permissão de notificação:', e);
      return false;
    }
  }

  /**
   * Registra um listener para toasts visuais internos de fallback
   */
  onToast(listener: ToastListener): () => void {
    this.toastListeners.add(listener);
    return () => {
      this.toastListeners.delete(listener);
    };
  }

  /**
   * Dispara a notificação para o sistema operacional com áudio opcional
   */
  sendNotification(payload: NotificationPayload) {
    const { title, body, playSound = true } = payload;

    // 1. Toca chime suave nativo via Web Audio API se solicitado
    if (playSound) {
      try {
        sounds.playNotificationChime();
      } catch (e) {
        console.warn('Erro ao reproduzir chime de áudio:', e);
      }
    }

    // 2. Dispara a notificação nativa do SO (Windows / Tauri / Browser)
    if (this.isSupported() && Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body,
          silent: true, // Evita som genérico estridente do Windows pois já tocamos nosso chime suave
        });

        notif.onclick = () => {
          window.focus();
        };
      } catch (e) {
        console.warn('Falha ao emitir notificação nativa:', e);
      }
    }

    // 3. Notifica listeners de toast visual interno
    this.toastListeners.forEach((listener) => listener(payload));
  }
}

export const notificationService = new NotificationService();
