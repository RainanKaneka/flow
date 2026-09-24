import { describe, it, expect, vi, beforeEach } from 'vitest';
import { backupService, formatBytes } from '../backupService';
import { useFlowStore } from '../../store/useFlowStore';
import { getTodayDateString } from '../../store/slices/uiSlice';

// Mock do Tauri @tauri-apps/api/core
const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: any[]) => mockInvoke(...args),
}));

describe('backupService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFlowStore.setState({
      backupSettings: {
        enabled: true,
        folderPath: 'C:\\Users\\Test\\Documents\\FlowBackups',
        lastBackupDate: null,
        lastBackupTime: null,
        lastBackupStatus: null,
        lastBackupFileName: null,
        lastBackupError: null,
        autoRetentionCount: 30,
      },
    });
  });

  describe('formatBytes', () => {
    it('deve formatar 0 bytes corretamente', () => {
      expect(formatBytes(0)).toBe('0 B');
    });

    it('deve formatar KB corretamente', () => {
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(61440)).toBe('60 KB');
    });

    it('deve formatar MB corretamente', () => {
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(1572864)).toBe('1.5 MB');
    });
  });

  describe('getDefaultBackupDir', () => {
    it('deve retornar pasta obtida pelo Tauri quando em ambiente desktop', async () => {
      mockInvoke.mockResolvedValueOnce('C:\\Custom\\FlowBackups');
      (window as any).__TAURI__ = true;

      const dir = await backupService.getDefaultBackupDir();
      expect(dir).toBe('C:\\Custom\\FlowBackups');
      expect(mockInvoke).toHaveBeenCalledWith('get_default_backup_dir');

      delete (window as any).__TAURI__;
    });

    it('deve retornar Documents/FlowBackups como fallback seguro', async () => {
      delete (window as any).__TAURI__;
      delete (window as any).__TAURI_INTERNALS__;

      const dir = await backupService.getDefaultBackupDir();
      expect(dir).toBe('Documents/FlowBackups');
    });
  });

  describe('createBackup', () => {
    it('deve criar backup com sucesso e atualizar estado da store', async () => {
      (window as any).__TAURI__ = true;
      const today = getTodayDateString();
      const expectedFileName = `flow_backup_${today}.db`;
      const fakeBackup = {
        filePath: `C:\\Backups\\${expectedFileName}`,
        fileName: expectedFileName,
        fileSizeBytes: 61440,
        createdAt: new Date().toISOString(),
      };
      mockInvoke.mockResolvedValueOnce(fakeBackup);

      const res = await backupService.createBackup({ isManual: false });
      expect(res.success).toBe(true);
      expect(res.backup?.fileName).toBe(expectedFileName);

      const state = useFlowStore.getState().backupSettings;
      expect(state.lastBackupStatus).toBe('success');
      expect(state.lastBackupDate).toBe(today);
      expect(state.lastBackupFileName).toBe(expectedFileName);

      delete (window as any).__TAURI__;
    });

    it('deve registrar erro na store caso a operação de backup falhe', async () => {
      (window as any).__TAURI__ = true;
      mockInvoke.mockRejectedValueOnce(new Error('Acesso negado ao diretório'));

      const res = await backupService.createBackup({ isManual: true });
      expect(res.success).toBe(false);
      expect(res.error).toContain('Acesso negado ao diretório');

      const state = useFlowStore.getState().backupSettings;
      expect(state.lastBackupStatus).toBe('error');
      expect(state.lastBackupError).toContain('Acesso negado ao diretório');

      delete (window as any).__TAURI__;
    });
  });

  describe('checkAndRunDailyBackup', () => {
    it('não deve executar backup se backupSettings.enabled for falso', async () => {
      useFlowStore.getState().updateBackupSettings({ enabled: false });

      const executed = await backupService.checkAndRunDailyBackup();
      expect(executed).toBe(false);
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('não deve executar backup se já tiver sido realizado com sucesso na data de hoje', async () => {
      const today = getTodayDateString();
      useFlowStore.getState().updateBackupSettings({
        enabled: true,
        lastBackupDate: today,
        lastBackupStatus: 'success',
      });

      const executed = await backupService.checkAndRunDailyBackup();
      expect(executed).toBe(false);
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('deve executar backup se ainda não foi feito hoje ou a data for anterior', async () => {
      (window as any).__TAURI__ = true;
      useFlowStore.getState().updateBackupSettings({
        enabled: true,
        lastBackupDate: '2026-09-22', // dia anterior
        lastBackupStatus: 'success',
      });

      mockInvoke.mockResolvedValueOnce({
        filePath: 'C:\\Backups\\flow_backup_2026-09-23.db',
        fileName: 'flow_backup_2026-09-23.db',
        fileSizeBytes: 61440,
        createdAt: new Date().toISOString(),
      });

      const executed = await backupService.checkAndRunDailyBackup();
      expect(executed).toBe(true);

      const state = useFlowStore.getState().backupSettings;
      expect(state.lastBackupDate).toBe(getTodayDateString());
      expect(state.lastBackupStatus).toBe('success');

      delete (window as any).__TAURI__;
    });
  });

  describe('pickBackupFolder e openBackupFolder', () => {
    it('deve chamar pick_backup_folder via Tauri invoke', async () => {
      (window as any).__TAURI__ = true;
      mockInvoke.mockResolvedValueOnce('D:\\MinhasPastas\\Backups');

      const chosen = await backupService.pickBackupFolder();
      expect(chosen).toBe('D:\\MinhasPastas\\Backups');
      expect(mockInvoke).toHaveBeenCalledWith('pick_backup_folder');

      delete (window as any).__TAURI__;
    });

    it('deve chamar open_backup_folder via Tauri invoke', async () => {
      (window as any).__TAURI__ = true;
      mockInvoke.mockResolvedValueOnce(undefined);

      await backupService.openBackupFolder('D:\\MinhasPastas\\Backups');
      expect(mockInvoke).toHaveBeenCalledWith('open_backup_folder', {
        folderPath: 'D:\\MinhasPastas\\Backups',
      });

      delete (window as any).__TAURI__;
    });
  });
});
