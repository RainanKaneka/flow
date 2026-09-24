'use client';

import React, { useState, useEffect } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { backupService, formatBytes } from '../services/backupService';
import { BackupInfo } from '../types/routine';
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
} from 'lucide-react';

export const BackupModal: React.FC = () => {
  const isBackupModalOpen = useFlowStore((s) => s.isBackupModalOpen);
  const closeBackupModal = useFlowStore((s) => s.closeBackupModal);
  const backupSettings = useFlowStore((s) => s.backupSettings);
  const updateBackupSettings = useFlowStore((s) => s.updateBackupSettings);

  const [isLoading, setIsLoading] = useState(false);
  const [isPickingFolder, setIsPickingFolder] = useState(false);
  const [localFolderPath, setLocalFolderPath] = useState('');
  const [backupsList, setBackupsList] = useState<BackupInfo[]>([]);
  const [feedbackMessage, setFeedbackMessage] = useState<{
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
    closeBackupModal();
  };

  if (!isBackupModalOpen) return null;

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
          maxWidth: '580px',
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
            gap: '20px',
            overflowY: 'auto',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '16px',
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
                  Backup do Banco de Dados
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                  Persistência SQLite Relacional & Cópias de Segurança Locais
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
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
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
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

            {/* Status do último backup */}
            <div
              style={{
                paddingTop: '10px',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: 'var(--text-secondary)',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {backupSettings.lastBackupStatus === 'success' && (
                  <CheckCircle2 size={13} color="#10B981" />
                )}
                {backupSettings.lastBackupStatus === 'error' && (
                  <AlertCircle size={13} color="#EF4444" />
                )}
                {!backupSettings.lastBackupStatus && (
                  <RefreshCw size={13} color="var(--text-muted)" />
                )}
                <span>
                  Último backup:{' '}
                  <strong>{formatDate(backupSettings.lastBackupTime)}</strong>
                  {backupSettings.lastBackupFileName && (
                    <span style={{ color: 'var(--text-muted)' }}>
                      {' '}
                      ({backupSettings.lastBackupFileName})
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Card: Pasta Configurável */}
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label
                htmlFor="backup-folder-input"
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Folder size={15} color="var(--accent-primary)" />
                <span>Pasta de Destino dos Backups:</span>
              </label>

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
                }}
                title="Restaurar pasta padrão do Flow"
              >
                <RotateCcw size={11} />
                <span>Restaurar Padrão</span>
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                id="backup-folder-input"
                type="text"
                value={localFolderPath}
                onChange={(e) => setLocalFolderPath(e.target.value)}
                onBlur={handleFolderBlur}
                placeholder="Ex: C:\Users\Nome\Documents\FlowBackups"
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                  outline: 'none',
                }}
              />

              <button
                type="button"
                onClick={handlePickFolder}
                disabled={isPickingFolder}
                style={{
                  padding: '0 12px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-focus)',
                  color: 'var(--text-primary)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: isPickingFolder ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                }}
                title="Procurar pasta no sistema operacional"
              >
                <FolderOpen size={13} />
                <span>{isPickingFolder ? 'Buscando...' : 'Escolher Pasta...'}</span>
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
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
                marginTop: '4px',
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
                  onClick={() => loadExistingBackups(localFolderPath || backupSettings.folderPath)}
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
                  maxHeight: '140px',
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
                        idx < backupsList.length - 1 ? '1px solid var(--border-subtle)' : 'none',
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
      </div>
    </div>
  );
};
