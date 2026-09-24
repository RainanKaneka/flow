import { BackupInfo } from '../types/routine';
import { useFlowStore } from '../store/useFlowStore';
import { getTodayDateString } from '../store/slices/uiSlice';

export interface BackupResult {
  success: boolean;
  backup?: BackupInfo;
  error?: string;
}

/**
 * Detecta se a aplicação está rodando dentro do Tauri Desktop
 */
export const isTauriEnvironment = (): boolean => {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as any).__TAURI_INTERNALS__ ||
    (window as any).__TAURI__ ||
    (window as any).__TAURI_METADATA__
  );
};

/**
 * Converte bytes em uma string legível (ex: 61.4 KB, 1.2 MB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export class BackupService {
  /**
   * Obtém a pasta de backup padrão (ex: Documents/FlowBackups)
   */
  async getDefaultBackupDir(): Promise<string> {
    if (isTauriEnvironment()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const dir = await invoke<string>('get_default_backup_dir');
        if (dir) return dir;
      } catch (err) {
        console.warn('Falha ao obter pasta de backup padrão do Tauri:', err);
      }
    }
    return 'Documents/FlowBackups';
  }

  /**
   * Dispara o seletor nativo de pastas do sistema operacional
   */
  async pickBackupFolder(): Promise<string | null> {
    if (isTauriEnvironment()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<string | null>('pick_backup_folder');
      } catch (err) {
        console.warn('Falha ao abrir seletor de pastas via Tauri:', err);
      }
    }
    return null;
  }

  /**
   * Executa a criação de uma cópia de segurança do banco SQLite
   */
  async createBackup(options?: {
    folderPath?: string;
    isManual?: boolean;
  }): Promise<BackupResult> {
    const store = useFlowStore.getState();
    const today = getTodayDateString();
    
    // Resolve o caminho de destino
    let targetFolder = options?.folderPath || store.backupSettings?.folderPath;
    if (!targetFolder) {
      targetFolder = await this.getDefaultBackupDir();
      store.updateBackupSettings({ folderPath: targetFolder });
    }

    // Define nome do arquivo
    let fileName: string;
    if (options?.isManual) {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
      fileName = `flow_backup_${today}_${timeStr}.db`;
    } else {
      fileName = `flow_backup_${today}.db`;
    }

    try {
      let backupInfo: BackupInfo;

      if (isTauriEnvironment()) {
        const { invoke } = await import('@tauri-apps/api/core');
        backupInfo = await invoke<BackupInfo>('create_database_backup', {
          targetDir: targetFolder,
          fileName,
        });
      } else {
        // Fallback para ambiente de desenvolvimento web / testes
        backupInfo = {
          filePath: `${targetFolder}/${fileName}`,
          fileName,
          fileSizeBytes: 61440,
          createdAt: new Date().toISOString(),
        };
      }

      // Atualiza estado global
      store.updateBackupSettings({
        lastBackupDate: today,
        lastBackupTime: new Date().toISOString(),
        lastBackupStatus: 'success',
        lastBackupFileName: fileName,
        lastBackupError: null,
      });

      return {
        success: true,
        backup: backupInfo,
      };
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      console.error('Erro ao realizar backup do banco SQLite:', errorMessage);

      store.updateBackupSettings({
        lastBackupStatus: 'error',
        lastBackupError: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Lista os arquivos de backup presentes na pasta indicada
   */
  async listBackups(folderPath: string): Promise<BackupInfo[]> {
    if (!folderPath) return [];

    if (isTauriEnvironment()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<BackupInfo[]>('list_database_backups', {
          targetDir: folderPath,
        });
      } catch (err) {
        console.warn('Falha ao listar backups via Tauri:', err);
        return [];
      }
    }

    return [];
  }

  /**
   * Abre o diretório no Windows Explorer
   */
  async openBackupFolder(folderPath: string): Promise<void> {
    if (!folderPath) return;

    if (isTauriEnvironment()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('open_backup_folder', { folderPath });
      } catch (err) {
        console.warn('Falha ao abrir pasta de backup via Tauri:', err);
      }
    }
  }

  /**
   * Rotina Diária: Executa o backup automaticamente caso ainda não tenha sido feito hoje
   */
  async checkAndRunDailyBackup(): Promise<boolean> {
    const store = useFlowStore.getState();
    const settings = store.backupSettings;

    // Se o backup automático estiver desativado pelo usuário
    if (!settings || !settings.enabled) {
      return false;
    }

    const today = getTodayDateString();

    // Se já foi realizado um backup na data de hoje com sucesso
    if (settings.lastBackupDate === today && settings.lastBackupStatus === 'success') {
      return false;
    }

    // Inicializa caminho padrão se vazio
    if (!settings.folderPath) {
      const defaultDir = await this.getDefaultBackupDir();
      store.updateBackupSettings({ folderPath: defaultDir });
    }

    // Dispara criação do backup diário
    const result = await this.createBackup({ isManual: false });
    return result.success;
  }
}

export const backupService = new BackupService();
