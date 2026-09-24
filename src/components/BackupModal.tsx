'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { backupService, formatBytes } from '../services/backupService';
import {
  generateTasksCsv,
  generateCompletionsCsv,
  generateNotesCsv,
  generateBacklogCsv,
  parseTasksFromCsv,
  generateJsonExport,
  validateJsonImport,
  executeImport,
  downloadJsonExport,
  downloadCsv,
  downloadAllCsvs,
  downloadSqlExport,
} from '../services/exportImportService';
import { BackupInfo, BackupModalTab, ImportMode, ImportValidationResult } from '../types/routine';
import {
  Database,
  X,
  Folder,
  FolderOpen,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  HardDrive,
  DownloadCloud,
  FileCheck,
  RotateCcw,
  Download,
  Upload,
  FileSpreadsheet,
  FileJson,
  FileCode,
  Layers,
  ArrowRight,
  FileText,
  AlertTriangle,
  UploadCloud,
} from 'lucide-react';

export const BackupModal: React.FC = () => {
  const isBackupModalOpen = useFlowStore((s) => s.isBackupModalOpen);
  const closeBackupModal = useFlowStore((s) => s.closeBackupModal);
  const backupModalTab = useFlowStore((s) => s.backupModalTab);
  const setBackupModalTab = useFlowStore((s) => s.setBackupModalTab);
  const backupSettings = useFlowStore((s) => s.backupSettings);
  const updateBackupSettings = useFlowStore((s) => s.updateBackupSettings);

  // Dados completos para exportação
  const routineTypes = useFlowStore((s) => s.routineTypes);
  const categories = useFlowStore((s) => s.categories);
  const tasks = useFlowStore((s) => s.tasks);
  const logs = useFlowStore((s) => s.logs);
  const backlog = useFlowStore((s) => s.backlog);
  const notes = useFlowStore((s) => s.notes);
  const reminderSettings = useFlowStore((s) => s.reminderSettings);

  // Estados da aba de Backup SQLite
  const [isLoading, setIsLoading] = useState(false);
  const [isPickingFolder, setIsPickingFolder] = useState(false);
  const [localFolderPath, setLocalFolderPath] = useState('');
  const [backupsList, setBackupsList] = useState<BackupInfo[]>([]);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Estados da aba de Importação
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [fileType, setFileType] = useState<'json' | 'csv' | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>('merge');
  const [validationResult, setValidationResult] = useState<ImportValidationResult | null>(null);
  const [csvTasksPreview, setCsvTasksPreview] = useState<any[] | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importFeedback, setImportFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const loadExistingBackups = React.useCallback(async (path: string) => {
    if (!path) return;
    try {
      const list = await backupService.listBackups(path);
      setBackupsList(list);
    } catch (e) {
      console.warn('Erro ao carregar lista de backups:', e);
    }
  }, []);

  // Inicializa caminho padrão e lista de backups existentes ao abrir
  useEffect(() => {
    if (!isBackupModalOpen) return;

    let isMounted = true;
    const initPath = async () => {
      let path = backupSettings?.folderPath;
      if (!path) {
        path = await backupService.getDefaultBackupDir();
        if (isMounted) {
          updateBackupSettings({ folderPath: path });
        }
      }
      if (isMounted) {
        setLocalFolderPath(path);
        loadExistingBackups(path);
      }
    };

    initPath();
    return () => {
      isMounted = false;
    };
  }, [isBackupModalOpen, backupSettings?.folderPath, updateBackupSettings, loadExistingBackups]);

  const handleClose = () => {
    setFeedbackMessage(null);
    setImportFeedback(null);
    setSelectedFile(null);
    setFileContent('');
    setFileType(null);
    setValidationResult(null);
    setCsvTasksPreview(null);
    closeBackupModal();
  };

  if (!isBackupModalOpen) return null;

  // --- Funções da Aba de Backup SQLite ---
  const handleToggleEnabled = () => {
    updateBackupSettings({ enabled: !backupSettings.enabled });
  };

  const handleFolderBlur = () => {
    if (localFolderPath !== backupSettings.folderPath) {
      updateBackupSettings({ folderPath: localFolderPath });
      loadExistingBackups(localFolderPath);
    }
  };

  const handlePickFolder = async () => {
    setIsPickingFolder(true);
    setFeedbackMessage(null);
    try {
      const chosen = await backupService.pickBackupFolder();
      if (chosen) {
        setLocalFolderPath(chosen);
        updateBackupSettings({ folderPath: chosen });
        loadExistingBackups(chosen);
      }
    } finally {
      setIsPickingFolder(false);
    }
  };

  const handleResetDefaultFolder = async () => {
    const defaultDir = await backupService.getDefaultBackupDir();
    setLocalFolderPath(defaultDir);
    updateBackupSettings({ folderPath: defaultDir });
    loadExistingBackups(defaultDir);
  };

  const handleOpenFolder = async () => {
    const path = localFolderPath || backupSettings.folderPath;
    if (path) {
      await backupService.openBackupFolder(path);
    }
  };

  const handleManualBackup = async () => {
    setIsLoading(true);
    setFeedbackMessage(null);
    try {
      const result = await backupService.createBackup({
        folderPath: localFolderPath || backupSettings.folderPath,
        isManual: true,
      });

      if (result.success && result.backup) {
        setFeedbackMessage({
          type: 'success',
          text: `Backup gerado com sucesso: ${result.backup.fileName} (${formatBytes(result.backup.fileSizeBytes)})`,
        });
        loadExistingBackups(localFolderPath || backupSettings.folderPath);
      } else {
        setFeedbackMessage({
          type: 'error',
          text: result.error || 'Erro desconhecido ao gerar backup.',
        });
      }
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err?.message || 'Falha ao executar backup.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // --- Funções da Aba de Exportação ---
  const handleExportFullJson = () => {
    const payload = generateJsonExport({
      routineTypes,
      categories,
      tasks,
      logs,
      backlog,
      notes,
      reminderSettings,
      backupSettings,
    });
    downloadJsonExport(payload);
  };

  const handleExportTasksCsv = () => {
    const csv = generateTasksCsv(tasks, routineTypes, categories);
    downloadCsv(csv, `flow_tarefas_${Date.now()}.csv`);
  };

  const handleExportCompletionsCsv = () => {
    const csv = generateCompletionsCsv(logs, tasks, categories);
    downloadCsv(csv, `flow_historico_${Date.now()}.csv`);
  };

  const handleExportNotesCsv = () => {
    const csv = generateNotesCsv(notes);
    downloadCsv(csv, `flow_notas_${Date.now()}.csv`);
  };

  const handleExportBacklogCsv = () => {
    const csv = generateBacklogCsv(backlog, categories);
    downloadCsv(csv, `flow_backlog_${Date.now()}.csv`);
  };

  const handleExportAllCsvs = () => {
    downloadAllCsvs({
      tasks,
      logs,
      notes,
      backlog,
      routineTypes,
      categories,
    });
  };

  const handleExportSql = () => {
    downloadSqlExport(routineTypes, categories, tasks, logs, backlog, notes);
  };

  // --- Funções da Aba de Importação ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFeedback(null);
    setSelectedFile(file);

    const isJson = file.name.endsWith('.json');
    const isCsv = file.name.endsWith('.csv');

    if (!isJson && !isCsv) {
      setImportFeedback({
        type: 'error',
        text: 'Por favor, selecione um arquivo válido no formato .json ou .csv.',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setFileContent(text);

      if (isJson) {
        setFileType('json');
        const validation = validateJsonImport(text);
        setValidationResult(validation);
        setCsvTasksPreview(null);
      } else {
        setFileType('csv');
        const parsed = parseTasksFromCsv(text, routineTypes, categories);
        setCsvTasksPreview(parsed.tasks);
        setValidationResult(null);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleExecuteImport = async () => {
    if (!selectedFile || !fileContent) return;

    setIsImporting(true);
    setImportFeedback(null);

    try {
      if (fileType === 'json') {
        if (!validationResult?.isValid || !validationResult.sanitizedData) {
          throw new Error('O arquivo JSON não é válido para importação.');
        }

        // Se for replace, gera um backup instantâneo de segurança antes de sobrescrever
        if (importMode === 'replace') {
          try {
            await backupService.createBackup({
              folderPath: localFolderPath || backupSettings.folderPath,
              isManual: true,
            });
          } catch (e) {
            console.warn('Backup pré-importação falhou ou foi ignorado:', e);
          }
        }

        const res = await executeImport({
          data: validationResult.sanitizedData,
          mode: importMode,
        });

        if (res.success) {
          setImportFeedback({
            type: 'success',
            text: `Importação concluída com sucesso (${importMode === 'merge' ? 'Mesclado' : 'Substituído'}): ${res.stats.tasks} tarefas, ${res.stats.notes} notas e ${res.stats.completions} conclusões importadas!`,
          });
          // Limpa seleção após sucesso
          setSelectedFile(null);
          setFileContent('');
          setValidationResult(null);
        } else {
          setImportFeedback({
            type: 'error',
            text: res.error || 'Erro ao importar dados.',
          });
        }
      } else if (fileType === 'csv') {
        if (!csvTasksPreview || csvTasksPreview.length === 0) {
          throw new Error('Nenhuma tarefa válida foi encontrada no CSV.');
        }

        const dataToImport = {
          routineTypes: [],
          categories: [],
          tasks: csvTasksPreview,
          logs: {},
          backlog: [],
          notes: [],
        };

        const res = await executeImport({
          data: dataToImport,
          mode: 'merge',
        });

        if (res.success) {
          setImportFeedback({
            type: 'success',
            text: `Importação de CSV concluída! ${csvTasksPreview.length} novas tarefas adicionadas à sua rotina.`,
          });
          setSelectedFile(null);
          setFileContent('');
          setCsvTasksPreview(null);
        } else {
          setImportFeedback({
            type: 'error',
            text: res.error || 'Erro ao importar tarefas do CSV.',
          });
        }
      }
    } catch (err: any) {
      setImportFeedback({
        type: 'error',
        text: err?.message || 'Falha ao processar arquivo para importação.',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return 'Nunca';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="backup-modal-title"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="double-bezel-outer"
        style={{
          width: '100%',
          maxWidth: '640px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div
          className="double-bezel-inner"
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            overflowY: 'auto',
          }}
        >
          {/* Header Principal */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '14px',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(99, 102, 241, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-primary)',
                }}
              >
                <Database size={20} />
              </div>
              <div>
                <h3
                  id="backup-modal-title"
                  style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}
                >
                  Central de Dados & Backup
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                  Persistência SQLite, Exportação em JSON/CSV e Restauração de Rotinas
                </p>
              </div>
            </div>

            <button
              onClick={handleClose}
              aria-label="Fechar modal de backup"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 150ms',
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Abas de Navegação: Backup SQLite | Exportar Dados | Importar Dados */}
          <div
            role="tablist"
            style={{
              display: 'flex',
              gap: '6px',
              padding: '4px',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={backupModalTab === 'backup'}
              onClick={() => setBackupModalTab('backup')}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: backupModalTab === 'backup' ? 700 : 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '7px',
                backgroundColor:
                  backupModalTab === 'backup' ? 'rgba(99, 102, 241, 0.16)' : 'transparent',
                color:
                  backupModalTab === 'backup' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                transition: 'all 150ms ease',
              }}
            >
              <HardDrive size={15} />
              <span>Backup SQLite</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={backupModalTab === 'export'}
              onClick={() => setBackupModalTab('export')}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: backupModalTab === 'export' ? 700 : 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '7px',
                backgroundColor:
                  backupModalTab === 'export' ? 'rgba(99, 102, 241, 0.16)' : 'transparent',
                color:
                  backupModalTab === 'export' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                transition: 'all 150ms ease',
              }}
            >
              <Download size={15} />
              <span>Exportar Dados</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={backupModalTab === 'import'}
              onClick={() => setBackupModalTab('import')}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: backupModalTab === 'import' ? 700 : 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '7px',
                backgroundColor:
                  backupModalTab === 'import' ? 'rgba(99, 102, 241, 0.16)' : 'transparent',
                color:
                  backupModalTab === 'import' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                transition: 'all 150ms ease',
              }}
            >
              <Upload size={15} />
              <span>Importar Dados</span>
            </button>
          </div>

          {/* ============================================================== */}
          {/* TAB 1: BACKUP SQLITE NATIVO (DIÁRIO & SNAPSHOTS)               */}
          {/* ============================================================== */}
          {backupModalTab === 'backup' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* SQLite Status Pill */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}
                >
                  <HardDrive size={15} color="#10B981" />
                  <span>
                    Banco Ativo: <strong>flow.db</strong>
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    color: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    fontWeight: 600,
                  }}
                >
                  SQLite Nativo Conectado
                </span>
              </div>

              {/* Card: Backup Diário Automático */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '14px',
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600 }}>
                      Backup Automático Diário
                    </div>
                    <div
                      style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}
                    >
                      Gera uma cópia de segurança na pasta local ao abrir o Flow a cada novo dia
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={backupSettings.enabled}
                    aria-label="Ativar Backup Automático Diário"
                    onClick={handleToggleEnabled}
                    style={{
                      width: '44px',
                      height: '24px',
                      borderRadius: '12px',
                      backgroundColor: backupSettings.enabled
                        ? 'var(--accent-primary)'
                        : 'var(--border-focus)',
                      border: 'none',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'all 200ms',
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        backgroundColor: '#FFFFFF',
                        position: 'absolute',
                        top: '3px',
                        left: backupSettings.enabled ? '23px' : '3px',
                        transition: 'all 200ms',
                      }}
                    />
                  </button>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                    paddingTop: '10px',
                    borderTop: '1px solid var(--border-subtle)',
                    fontSize: '12px',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Último backup: </span>
                    <strong style={{ color: 'var(--text-primary)' }}>
                      {formatDate(backupSettings.lastBackupTime)}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Status: </span>
                    {backupSettings.lastBackupStatus === 'success' ? (
                      <span style={{ color: '#10B981', fontWeight: 600 }}>Realizado</span>
                    ) : backupSettings.lastBackupStatus === 'error' ? (
                      <span style={{ color: '#EF4444', fontWeight: 600 }}>Falhou</span>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)' }}>Aguardando</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card: Pasta Local Configurável */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '14px',
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>Pasta Local de Destino</div>
                  <div
                    style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}
                  >
                    Local onde os arquivos snapshot <code>.db</code> são armazenados
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    aria-label="Pasta de destino dos backups:"
                    value={localFolderPath}
                    onChange={(e) => setLocalFolderPath(e.target.value)}
                    onBlur={handleFolderBlur}
                    placeholder="Selecione a pasta de backup..."
                    style={{
                      flex: 1,
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  />

                  <button
                    type="button"
                    aria-label="Escolher pasta..."
                    onClick={handlePickFolder}
                    disabled={isPickingFolder}
                    className="btn-island"
                    style={{
                      padding: '8px 14px',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: isPickingFolder ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Folder size={14} />
                    <span>{isPickingFolder ? 'Buscando...' : 'Procurar'}</span>
                  </button>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '4px',
                  }}
                >
                  <button
                    type="button"
                    onClick={handleResetDefaultFolder}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 4px',
                    }}
                    title="Restaurar para a pasta Documentos/FlowBackups"
                  >
                    <RotateCcw size={11} />
                    <span>Restaurar pasta padrão</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenFolder}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--accent-primary)',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '2px 4px',
                    }}
                  >
                    <FolderOpen size={12} />
                    <span>Abrir pasta no Windows Explorer</span>
                  </button>
                </div>
              </div>

              {/* Feedback Message */}
              {feedbackMessage && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor:
                      feedbackMessage.type === 'success'
                        ? 'rgba(16, 185, 129, 0.12)'
                        : 'rgba(239, 68, 68, 0.12)',
                    border: `1px solid ${
                      feedbackMessage.type === 'success'
                        ? 'rgba(16, 185, 129, 0.3)'
                        : 'rgba(239, 68, 68, 0.3)'
                    }`,
                    color: feedbackMessage.type === 'success' ? '#10B981' : '#EF4444',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {feedbackMessage.type === 'success' ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <AlertCircle size={16} />
                  )}
                  <span>{feedbackMessage.text}</span>
                </div>
              )}

              {/* Action: Fazer Backup Agora */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleManualBackup}
                  disabled={isLoading}
                  className="btn-island btn-island-primary"
                  style={{
                    flex: 1,
                    padding: '12px 18px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    opacity: isLoading ? 0.7 : 1,
                  }}
                >
                  <DownloadCloud size={16} />
                  <span>{isLoading ? 'Gerando Cópia...' : 'Fazer Backup Agora'}</span>
                </button>
              </div>

              {/* Lista de Backups Recentes na Pasta */}
              {backupsList.length > 0 && (
                <div
                  style={{
                    marginTop: '2px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>Backups Encontrados ({backupsList.length})</span>
                    <button
                      type="button"
                      onClick={() =>
                        loadExistingBackups(localFolderPath || backupSettings.folderPath)
                      }
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                      }}
                      title="Atualizar lista de backups"
                    >
                      <RefreshCw size={11} />
                      <span>Recarregar</span>
                    </button>
                  </div>

                  <div
                    style={{
                      maxHeight: '130px',
                      overflowY: 'auto',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    }}
                  >
                    {backupsList.map((b, idx) => (
                      <div
                        key={b.filePath || idx}
                        style={{
                          padding: '8px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderBottom:
                            idx < backupsList.length - 1
                              ? '1px solid var(--border-subtle)'
                              : 'none',
                          fontSize: '11px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FileCheck size={13} color="var(--accent-primary)" />
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              color: 'var(--text-primary)',
                              fontWeight: 500,
                            }}
                          >
                            {b.fileName}
                          </span>
                        </div>
                        <span style={{ color: 'var(--text-muted)' }}>
                          {formatBytes(b.fileSizeBytes)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: EXPORTAÇÃO DE DADOS (JSON / CSV / SQL)                   */}
          {/* ============================================================== */}
          {backupModalTab === 'export' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Card 1: Pacote Completo JSON */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '14px',
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(245, 158, 11, 0.14)',
                        color: '#F59E0B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <FileJson size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>
                        Pacote Completo em JSON (.json)
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Ideal para backup geral, sincronização e migração de máquina
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '11px',
                      color: '#F59E0B',
                      backgroundColor: 'rgba(245, 158, 11, 0.12)',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      fontWeight: 600,
                    }}
                  >
                    Recomendado
                  </span>
                </div>

                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                  }}
                >
                  Exporta tarefas, categorias, tipos de rotina, backlog, notas e histórico de
                  conclusões em formato JSON estruturado com metadados de versão.
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                  }}
                >
                  <span>
                    Volume atual: <strong>{tasks.length} tarefas</strong>,{' '}
                    <strong>{Object.keys(logs).length} conclusões</strong>,{' '}
                    <strong>{notes.length} notas</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleExportFullJson}
                    className="btn-island btn-island-primary"
                    style={{
                      padding: '6px 14px',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    <Download size={13} />
                    <span>Baixar JSON</span>
                  </button>
                </div>
              </div>

              {/* Card 2: Planilhas Analíticas CSV */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '14px',
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(16, 185, 129, 0.14)',
                        color: '#10B981',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <FileSpreadsheet size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>
                        Planilhas para Excel & Sheets (.csv)
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Formato tabular UTF-8 BOM com acentuação nativa garantida
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportAllCsvs}
                    className="btn-island"
                    style={{
                      padding: '6px 12px',
                      fontSize: '11px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <Download size={12} />
                    <span>Baixar Todas (4 CSVs)</span>
                  </button>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '8px',
                    paddingTop: '4px',
                  }}
                >
                  <button
                    type="button"
                    onClick={handleExportTasksCsv}
                    className="btn-island"
                    style={{
                      padding: '10px 12px',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={14} color="#3B82F6" />
                      <span>Tarefas da Rotina</span>
                    </div>
                    <Download size={13} />
                  </button>

                  <button
                    type="button"
                    onClick={handleExportCompletionsCsv}
                    className="btn-island"
                    style={{
                      padding: '10px 12px',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Layers size={14} color="#10B981" />
                      <span>Histórico & Foco</span>
                    </div>
                    <Download size={13} />
                  </button>

                  <button
                    type="button"
                    onClick={handleExportNotesCsv}
                    className="btn-island"
                    style={{
                      padding: '10px 12px',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={14} color="#F59E0B" />
                      <span>Bloco de Notas</span>
                    </div>
                    <Download size={13} />
                  </button>

                  <button
                    type="button"
                    onClick={handleExportBacklogCsv}
                    className="btn-island"
                    style={{
                      padding: '10px 12px',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Layers size={14} color="#8B5CF6" />
                      <span>Itens do Backlog</span>
                    </div>
                    <Download size={13} />
                  </button>
                </div>
              </div>

              {/* Card 3: Dump Relacional SQLite SQL */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '14px',
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(14, 165, 233, 0.14)',
                      color: '#0EA5E9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <FileCode size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600 }}>Dump SQL Relacional (.sql)</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Script DDL e DML para inspeção em DBeaver ou SQLite Browser
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleExportSql}
                  className="btn-island"
                  style={{
                    padding: '8px 14px',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Download size={13} />
                  <span>Baixar SQL</span>
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: IMPORTAÇÃO DE DADOS (JSON / CSV)                         */}
          {/* ============================================================== */}
          {backupModalTab === 'import' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              {/* Zona de Drop / Upload */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '24px 20px',
                  borderRadius: '14px',
                  border: '2px dashed var(--border-focus)',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  transition: 'all 200ms ease',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(99, 102, 241, 0.12)',
                    color: 'var(--accent-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <UploadCloud size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>
                    {selectedFile ? selectedFile.name : 'Selecione ou arraste um arquivo'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Compatível com pacotes <strong>.json</strong> do Flow e planilhas de tarefas{' '}
                    <strong>.csv</strong>
                  </div>
                </div>

                {selectedFile && (
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--accent-primary)',
                      backgroundColor: 'rgba(99, 102, 241, 0.12)',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      fontWeight: 600,
                    }}
                  >
                    {formatBytes(selectedFile.size)} • {fileType?.toUpperCase()}
                  </span>
                )}
              </div>

              {/* Pré-visualização do Arquivo JSON */}
              {fileType === 'json' && validationResult && (
                <div
                  style={{
                    padding: '14px',
                    borderRadius: '12px',
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: 700 }}>
                      Estrutura do Arquivo Detectada
                    </span>
                    {validationResult.isValid ? (
                      <span
                        style={{
                          fontSize: '11px',
                          color: '#10B981',
                          backgroundColor: 'rgba(16, 185, 129, 0.12)',
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <CheckCircle2 size={12} />
                        Estrutura Válida
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '11px',
                          color: '#EF4444',
                          backgroundColor: 'rgba(239, 68, 68, 0.12)',
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <AlertCircle size={12} />
                        Incompatível
                      </span>
                    )}
                  </div>

                  {validationResult.summary && (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '8px',
                        fontSize: '11px',
                      }}
                    >
                      <div
                        style={{
                          padding: '8px',
                          borderRadius: '6px',
                          backgroundColor: 'var(--bg-primary)',
                          textAlign: 'center',
                        }}
                      >
                        <span style={{ color: 'var(--text-muted)', display: 'block' }}>Tarefas</span>
                        <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                          {validationResult.summary.tasksCount}
                        </strong>
                      </div>
                      <div
                        style={{
                          padding: '8px',
                          borderRadius: '6px',
                          backgroundColor: 'var(--bg-primary)',
                          textAlign: 'center',
                        }}
                      >
                        <span style={{ color: 'var(--text-muted)', display: 'block' }}>Notas</span>
                        <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                          {validationResult.summary.notesCount}
                        </strong>
                      </div>
                      <div
                        style={{
                          padding: '8px',
                          borderRadius: '6px',
                          backgroundColor: 'var(--bg-primary)',
                          textAlign: 'center',
                        }}
                      >
                        <span style={{ color: 'var(--text-muted)', display: 'block' }}>Histórico</span>
                        <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                          {validationResult.summary.completionsCount}
                        </strong>
                      </div>
                    </div>
                  )}

                  {/* Seletor de Modo de Importação: Mesclar ou Substituir */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Como deseja aplicar os dados?
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setImportMode('merge')}
                        style={{
                          padding: '10px',
                          borderRadius: '8px',
                          border: `1px solid ${
                            importMode === 'merge' ? 'var(--accent-primary)' : 'var(--border-subtle)'
                          }`,
                          backgroundColor:
                            importMode === 'merge'
                              ? 'rgba(99, 102, 241, 0.12)'
                              : 'var(--bg-primary)',
                          textAlign: 'left',
                          cursor: 'pointer',
                        }}
                      >
                        <strong
                          style={{
                            fontSize: '12px',
                            display: 'block',
                            color:
                              importMode === 'merge'
                                ? 'var(--accent-primary)'
                                : 'var(--text-primary)',
                          }}
                        >
                          Mesclar Dados (Merge)
                        </strong>
                        <span
                          style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}
                        >
                          Combina com suas rotinas atuais sem apagar nada
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setImportMode('replace')}
                        style={{
                          padding: '10px',
                          borderRadius: '8px',
                          border: `1px solid ${
                            importMode === 'replace' ? '#EF4444' : 'var(--border-subtle)'
                          }`,
                          backgroundColor:
                            importMode === 'replace'
                              ? 'rgba(239, 68, 68, 0.12)'
                              : 'var(--bg-primary)',
                          textAlign: 'left',
                          cursor: 'pointer',
                        }}
                      >
                        <strong
                          style={{
                            fontSize: '12px',
                            display: 'block',
                            color: importMode === 'replace' ? '#EF4444' : 'var(--text-primary)',
                          }}
                        >
                          Substituir Tudo (Restore)
                        </strong>
                        <span
                          style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}
                        >
                          Sobrescreve o banco (backup gerado antes)
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Pré-visualização do Arquivo CSV */}
              {fileType === 'csv' && csvTasksPreview && (
                <div
                  style={{
                    padding: '14px',
                    borderRadius: '12px',
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: 700 }}>
                      Tarefas Identificadas na Planilha
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        color: '#10B981',
                        backgroundColor: 'rgba(16, 185, 129, 0.12)',
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontWeight: 600,
                      }}
                    >
                      {csvTasksPreview.length} Atividades
                    </span>
                  </div>

                  <div
                    style={{
                      maxHeight: '110px',
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    {csvTasksPreview.slice(0, 5).map((t, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          backgroundColor: 'var(--bg-primary)',
                          fontSize: '11px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span style={{ fontWeight: 500 }}>{t.title}</span>
                        <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {t.startTime} - {t.endTime}
                        </span>
                      </div>
                    ))}
                    {csvTasksPreview.length > 5 && (
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center' }}>
                        + {csvTasksPreview.length - 5} outras atividades na planilha
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Feedback de Importação */}
              {importFeedback && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor:
                      importFeedback.type === 'success'
                        ? 'rgba(16, 185, 129, 0.12)'
                        : 'rgba(239, 68, 68, 0.12)',
                    border: `1px solid ${
                      importFeedback.type === 'success'
                        ? 'rgba(16, 185, 129, 0.3)'
                        : 'rgba(239, 68, 68, 0.3)'
                    }`,
                    color: importFeedback.type === 'success' ? '#10B981' : '#EF4444',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {importFeedback.type === 'success' ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <AlertCircle size={16} />
                  )}
                  <span>{importFeedback.text}</span>
                </div>
              )}

              {/* Botão de Ação: Executar Importação */}
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={
                  !selectedFile ||
                  isImporting ||
                  (fileType === 'json' && !validationResult?.isValid) ||
                  (fileType === 'csv' && (!csvTasksPreview || csvTasksPreview.length === 0))
                }
                className="btn-island btn-island-primary"
                style={{
                  padding: '12px 18px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor:
                    !selectedFile || isImporting ? 'not-allowed' : 'pointer',
                  opacity: !selectedFile || isImporting ? 0.6 : 1,
                }}
              >
                <Upload size={16} />
                <span>
                  {isImporting
                    ? 'Importando e Gravando no SQLite...'
                    : 'Executar Importação de Dados'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
