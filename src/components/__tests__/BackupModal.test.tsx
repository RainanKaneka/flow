import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BackupModal } from '../BackupModal';
import { useFlowStore } from '../../store/useFlowStore';
import { backupService } from '../../services/backupService';

vi.mock('../../services/backupService', () => ({
  formatBytes: vi.fn((bytes: number) => `${bytes / 1024} KB`),
  backupService: {
    getDefaultBackupDir: vi.fn().mockResolvedValue('C:\\Users\\Test\\Documents\\FlowBackups'),
    pickBackupFolder: vi.fn().mockResolvedValue('D:\\BackupsCustom'),
    createBackup: vi.fn().mockResolvedValue({
      success: true,
      backup: {
        filePath: 'C:\\Users\\Test\\Documents\\FlowBackups\\flow_backup_2026-09-23.db',
        fileName: 'flow_backup_2026-09-23.db',
        fileSizeBytes: 61440,
        createdAt: '2026-09-23T14:00:00Z',
      },
    }),
    listBackups: vi.fn().mockResolvedValue([
      {
        filePath: 'C:\\Users\\Test\\Documents\\FlowBackups\\flow_backup_2026-09-23.db',
        fileName: 'flow_backup_2026-09-23.db',
        fileSizeBytes: 61440,
        createdAt: '2026-09-23T14:00:00Z',
      },
    ]),
    openBackupFolder: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('BackupModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFlowStore.setState({
      isBackupModalOpen: true,
      backupSettings: {
        enabled: true,
        folderPath: 'C:\\Users\\Test\\Documents\\FlowBackups',
        lastBackupDate: '2026-09-23',
        lastBackupTime: '2026-09-23T10:00:00Z',
        lastBackupStatus: 'success',
        lastBackupFileName: 'flow_backup_2026-09-23.db',
        lastBackupError: null,
        autoRetentionCount: 30,
      },
    });
  });

  it('não deve renderizar nada se isBackupModalOpen for falso', () => {
    useFlowStore.setState({ isBackupModalOpen: false });
    const { container } = render(<BackupModal />);
    expect(container).toBeEmptyDOMElement();
  });

  it('deve renderizar o cabeçalho, status do banco e pasta configurada', async () => {
    render(<BackupModal />);

    expect(await screen.findByRole('heading', { name: /backup do banco de dados/i })).toBeInTheDocument();
    expect(screen.getByText(/sqlite nativo conectado/i)).toBeInTheDocument();
    expect(screen.getByText(/backup automático diário/i)).toBeInTheDocument();

    const folderInput = screen.getByLabelText(/pasta de destino dos backups:/i) as HTMLInputElement;
    expect(folderInput.value).toBe('C:\\Users\\Test\\Documents\\FlowBackups');
  });

  it('deve alternar o switch de backup automático ao clicar', async () => {
    render(<BackupModal />);

    const toggle = await screen.findByRole('switch', { name: /ativar backup automático diário/i });
    expect(toggle).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(toggle);

    expect(useFlowStore.getState().backupSettings.enabled).toBe(false);
  });

  it('deve disparar criação de backup manual ao clicar no botão', async () => {
    render(<BackupModal />);

    const backupBtn = await screen.findByRole('button', { name: /fazer backup agora/i });
    fireEvent.click(backupBtn);

    await waitFor(() => {
      expect(backupService.createBackup).toHaveBeenCalledWith(
        expect.objectContaining({ isManual: true })
      );
    });

    expect(
      await screen.findByText(/backup gerado com sucesso: flow_backup_2026-09-23\.db/i)
    ).toBeInTheDocument();
  });

  it('deve permitir escolher uma nova pasta via seletor nativo', async () => {
    render(<BackupModal />);

    const pickBtn = await screen.findByRole('button', { name: /escolher pasta\.\.\./i });
    fireEvent.click(pickBtn);

    await waitFor(() => {
      expect(backupService.pickBackupFolder).toHaveBeenCalled();
    });

    expect(useFlowStore.getState().backupSettings.folderPath).toBe('D:\\BackupsCustom');
  });

  it('deve fechar o modal ao clicar no botão de fechar', async () => {
    render(<BackupModal />);

    const closeBtn = await screen.findByRole('button', { name: /fechar modal de backup/i });
    fireEvent.click(closeBtn);

    expect(useFlowStore.getState().isBackupModalOpen).toBe(false);
  });
});
