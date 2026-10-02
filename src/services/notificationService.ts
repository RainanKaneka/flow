import { sounds } from '../utils/audio';

export type NotificationPermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';

export interface NotificationPayload {
  title: string;
  body: string;
  playSound?: boolean;
}

type ToastListener = (payload: NotificationPayload) => void;

/**
 * Detecta se a aplicação está rodando dentro do cliente desktop Tauri
 */
export const isTauriEnvironment = (): boolean => {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as any).__TAURI_INTERNALS__ ||
    (window as any).__TAURI__ ||
    (window as any).__TAURI_METADATA__
  );
};

class NotificationService {
  private toastListeners: Set<ToastListener> = new Set();
  private tauriModule: any = null;
  private lastNotificationKey: string = '';
  private lastNotificationTime: number = 0;

  /**
   * Limpa o cache de deduplicação (útil para testes unitários)
   */
  clearDeduplicationCache() {
    this.lastNotificationKey = '';
    this.lastNotificationTime = 0;
  }

  private async getTauriNotificationModule() {
    if (!isTauriEnvironment()) return null;
    if (this.tauriModule) return this.tauriModule;
    try {
      this.tauriModule = await import('@tauri-apps/plugin-notification');
      return this.tauriModule;
    } catch (e) {
      console.warn('Tauri notification plugin não carregado dinamicamente:', e);
      return null;
    }
  }

  /**
   * Verifica se o ambiente suporta notificações
   */
  isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    if (isTauriEnvironment()) return true;
    return 'Notification' in window;
  }

  /**
   * Obtém o status atual de permissão de notificações
   */
  getPermissionStatus(): NotificationPermissionStatus {
    if (typeof window === 'undefined') return 'unsupported';
    if (isTauriEnvironment()) {
      return 'granted';
    }
    if (!this.isSupported()) return 'unsupported';
    return (Notification.permission as NotificationPermissionStatus) || 'default';
  }

  /**
   * Solicita permissão ao usuário para disparar notificações do sistema
   */
  async requestPermission(): Promise<boolean> {
    if (isTauriEnvironment()) {
      try {
        const tauri = await this.getTauriNotificationModule();
        if (tauri) {
          if (typeof tauri.isPermissionGranted === 'function') {
            const granted = await tauri.isPermissionGranted();
            if (granted) return true;
          }
          if (typeof tauri.requestPermission === 'function') {
            const res = await tauri.requestPermission();
            return res === 'granted';
          }
        }
        return true;
      } catch (e) {
        console.warn('Erro ao solicitar permissão Tauri:', e);
        return true;
      }
    }

    if (!this.isSupported()) return false;
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (e) {
      console.warn('Erro ao solicitar permissão de notificação no navegador:', e);
      return false;
    }
  }

  /**
   * Registra um listener para toasts visuais internos de alta fidelidade
   */
  onToast(listener: ToastListener): () => void {
    this.toastListeners.add(listener);
    return () => {
      this.toastListeners.delete(listener);
    };
  }

  /**
   * Dispara a notificação para o sistema operacional com áudio suave e toast visual
   * Garante emissão única (sem duplicidade entre show_windows_toast e tauri plugin)
   */
  async sendNotification(payload: NotificationPayload) {
    const { title, body, playSound = true } = payload;

    // Deduplicação estrita: ignora disparos duplicados idênticos em janela de 600ms
    const now = Date.now();
    const dedupeKey = `${title}:::${body}`;
    if (dedupeKey === this.lastNotificationKey && now - this.lastNotificationTime < 600) {
      return;
    }
    this.lastNotificationKey = dedupeKey;
    this.lastNotificationTime = now;

    // 1. Toca chime harmônico suave nativo via Web Audio API se solicitado
    if (playSound) {
      try {
        sounds.playNotificationChime();
      } catch (e) {
        console.warn('Erro ao reproduzir chime de áudio:', e);
      }
    }

    // 2. Dispara a notificação nativa do SO (Windows / Tauri ou Navegador)
    if (isTauriEnvironment()) {
      let customToastSent = false;
      // Dispara toast nativo do Windows WinRT (garante sobreposição a outros apps no Windows)
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('show_windows_toast', { title, body });
        customToastSent = true;
      } catch (invokeErr) {
        console.warn('Fallback show_windows_toast invoke:', invokeErr);
      }

      // Se o toast nativo WinRT não foi emitido (ex: ambiente Linux/Mac ou erro), usa o plugin Tauri como fallback único
      if (!customToastSent) {
        try {
          const tauri = await this.getTauriNotificationModule();
          if (tauri) {
            let isGranted = false;
            if (typeof tauri.isPermissionGranted === 'function') {
              isGranted = await tauri.isPermissionGranted();
            }
            if (!isGranted && typeof tauri.requestPermission === 'function') {
              const req = await tauri.requestPermission();
              isGranted = req === 'granted';
            } else {
              isGranted = true;
            }

            if (isGranted && typeof tauri.sendNotification === 'function') {
              tauri.sendNotification({ title, body });
            }
          }
        } catch (e) {
          console.warn('Tentando emitir notificação nativa via Tauri plugin:', e);
        }
      }
    } else if (this.isSupported() && Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body,
          silent: true, // Evita som estridente do Windows pois já tocamos nosso chime harmônico
        });

        notif.onclick = () => {
          window.focus();
        };
      } catch (e) {
        console.warn('Falha ao emitir notificação nativa no navegador:', e);
      }
    }

    // 3. SEMPRE dispara o toast visual interno de alta fidelidade na tela
    this.toastListeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (e) {
        console.error('Erro no listener de toast:', e);
      }
    });
  }
}

export const notificationService = new NotificationService();
