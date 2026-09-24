import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BackupModal } from '../BackupModal';
import { useFlowStore } from '../../store/useFlowStore';
import { backupService } from '../../services/backupService';
import * as exportImportService from '../../services/exportImportService';

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
      backupModalTab: 'backup',
      tasks: [
        {
          id: 't1',
          title: 'Tarefa Teste',
          description: 'Desc',
          startTime: '09:00',
          endTime: '10:00',
          routineTypeId: 'rt1',
          categoryId: 'c1',
          daysOfWeek: [1, 2, 3],
          targetMinutes: 60,
          tags: ['teste'],
        },
      ],
      categories: [{ id: 'c1', name: 'Trabalho', color: '#6366F1' }],
      routineTypes: [{ id: 'rt1', name: 'Rotina Semanal', description: 'Desc' }],
      logs: {},
      backlog: [],
      notes: [],
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

    expect(await screen.findByRole('heading', { name: /central de dados & backup/i })).toBeInTheDocument();
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

  it('deve alternar para a aba de exportação e disparar downloads', async () => {
    const downloadJsonSpy = vi.spyOn(exportImportService, 'downloadJsonExport').mockImplementation(() => {});
    const downloadAllCsvsSpy = vi.spyOn(exportImportService, 'downloadAllCsvs').mockImplementation(() => {});
    const downloadSqlSpy = vi.spyOn(exportImportService, 'downloadSqlExport').mockImplementation(() => {});

    render(<BackupModal />);

    // Clica na aba "Exportar Dados"
    const exportTab = screen.getByRole('tab', { name: /exportar dados/i });
    fireEvent.click(exportTab);

    expect(useFlowStore.getState().backupModalTab).toBe('export');

    // Clica em "Baixar JSON"
    const jsonBtn = screen.getByRole('button', { name: /baixar json/i });
    fireEvent.click(jsonBtn);
    expect(downloadJsonSpy).toHaveBeenCalledTimes(1);

    // Clica em "Baixar Todas (4 CSVs)"
    const allCsvsBtn = screen.getByRole('button', { name: /baixar todas \(4 csvs\)/i });
    fireEvent.click(allCsvsBtn);
    expect(downloadAllCsvsSpy).toHaveBeenCalledTimes(1);

    // Clica em "Baixar SQL"
    const sqlBtn = screen.getByRole('button', { name: /baixar sql/i });
    fireEvent.click(sqlBtn);
    expect(downloadSqlSpy).toHaveBeenCalledTimes(1);
  });

  it('deve alternar para a aba de importação e processar arquivo JSON', async () => {
    render(<BackupModal />);

    // Clica na aba "Importar Dados"
    const importTab = screen.getByRole('tab', { name: /importar dados/i });
    fireEvent.click(importTab);

    expect(useFlowStore.getState().backupModalTab).toBe('import');
    expect(screen.getByText(/compatível com pacotes/i)).toBeInTheDocument();

    // Simula seleção de arquivo JSON válido
    const mockJsonContent = JSON.stringify({
      version: '1.0',
      appName: 'Flow',
      data: {
        tasks: [{ id: 'imported_t1', title: 'Tarefa Importada', startTime: '14:00', endTime: '15:00', routineTypeId: 'rt1', categoryId: 'c1', daysOfWeek: [1], targetMinutes: 60, tags: [] }],
        categories: [],
        routineTypes: [],
        logs: {},
        backlog: [],
        notes: [],
      },
    });

    const file = new File([mockJsonContent], 'backup_flow.json', { type: 'application/json' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    // Dispara leitura do arquivo
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/estrutura do arquivo detectada/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/estrutura válida/i)).toBeInTheDocument();
    expect(screen.getByText(/mesclar dados \(merge\)/i)).toBeInTheDocument();
    expect(screen.getByText(/substituir tudo \(restore\)/i)).toBeInTheDocument();

    // Testa alternância para modo replace
    const replaceBtn = screen.getByText(/substituir tudo \(restore\)/i);
    fireEvent.click(replaceBtn);

    // Executa importação
    const execSpy = vi.spyOn(exportImportService, 'executeImport').mockResolvedValue({
      success: true,
      mode: 'replace',
      stats: { tasks: 1, notes: 0, completions: 0, backlog: 0, routineTypes: 0, categories: 0 },
    });

    const importSubmitBtn = screen.getByRole('button', { name: /executar importação de dados/i });
    fireEvent.click(importSubmitBtn);

    await waitFor(() => {
      expect(execSpy).toHaveBeenCalled();
    });

    expect(await screen.findByText(/importação concluída com sucesso/i)).toBeInTheDocument();
  });

  it('deve fechar o modal ao clicar no botão de fechar', async () => {
    render(<BackupModal />);

    const closeBtn = await screen.findByRole('button', { name: /fechar modal de backup/i });
    fireEvent.click(closeBtn);

    expect(useFlowStore.getState().isBackupModalOpen).toBe(false);
  });
});
