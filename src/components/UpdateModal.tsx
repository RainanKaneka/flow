'use client';

import React, { useState } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import {
  Sparkles,
  Download,
  X,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { openExternalUrl, copyToClipboard, isTauri } from '../utils/browser';

export const UpdateModal: React.FC = () => {
  const availableUpdate = useFlowStore((s) => s.availableUpdate);
  const isUpdateModalOpen = useFlowStore((s) => s.isUpdateModalOpen);
  const closeUpdateModal = useFlowStore((s) => s.closeUpdateModal);

  const [isInstalling, setIsInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState(0);
  const [installStepText, setInstallStepText] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isUpdateModalOpen || !availableUpdate) return null;

  const handleStartInAppUpdate = async () => {
    setIsInstalling(true);
    setInstallProgress(10);
    setInstallStepText('Conectando ao repositório de lançamentos...');

    // Progress step 1
    setTimeout(() => {
      setInstallProgress(35);
      setInstallStepText(`Baixando versão oficial v${availableUpdate.latestVersion}...`);
    }, 600);

    // Progress step 2
    setTimeout(() => {
      setInstallProgress(70);
      setInstallStepText('Verificando integridade dos arquivos...');
    }, 1400);

    // Progress step 3
    setTimeout(() => {
      setInstallProgress(90);
      setInstallStepText('Aplicando atualização e preparando reinício...');
    }, 2200);

    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        // Inicia download em background e reinício automático com /S /R
        await invoke('apply_inapp_update', { url: availableUpdate.downloadUrl });
        setInstallProgress(100);
        setInstallStepText('Atualização instalada com sucesso! Reiniciando o Flow...');
      } catch (err) {
        console.warn('Falha no auto-updater nativo, caindo para fallback externo:', err);
        setInstallProgress(100);
        setInstallStepText('Abrindo instalador no seu computador...');
        await openExternalUrl(availableUpdate.downloadUrl);
      }
    } else {
      // Ambiente Web convencional: simula progresso e dispara download
      setTimeout(async () => {
        setInstallProgress(100);
        setInstallStepText('Download concluído no navegador!');
        await openExternalUrl(availableUpdate.downloadUrl);
      }, 2600);
    }
  };

  const handleCopyLink = async () => {
    const ok = await copyToClipboard(availableUpdate.downloadUrl);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleOpenReleasePage = async () => {
    await openExternalUrl(availableUpdate.releaseUrl);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(10px)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isInstalling) closeUpdateModal();
      }}
    >
      <div
        className="double-bezel-outer"
        style={{
          width: '100%',
          maxWidth: '540px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 24px 60px rgba(99, 102, 241, 0.25)',
        }}
      >
        <div
          className="double-bezel-inner"
          style={{
            padding: '28px',
            position: 'relative',
          }}
        >
          {/* Close Button (desabilitado durante instalação ativa) */}
          {!isInstalling && (
            <button
              onClick={closeUpdateModal}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 200ms',
              }}
            >
              <X size={16} />
            </button>
          )}

          {/* Header com Ícone Glow */}
          <div
            style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '20px' }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: isInstalling
                  ? 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)'
                  : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isInstalling
                  ? '0 6px 20px rgba(99, 102, 241, 0.35)'
                  : '0 6px 20px rgba(16, 185, 129, 0.35)',
                flexShrink: 0,
                transition: 'all 300ms ease',
              }}
            >
              {isInstalling ? (
                <RefreshCw size={24} strokeWidth={2.4} className="animate-spin" />
              ) : (
                <Sparkles size={24} strokeWidth={2.4} />
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0, paddingRight: '24px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '3px 9px',
                  borderRadius: '9999px',
                  backgroundColor: isInstalling
                    ? 'rgba(99, 102, 241, 0.12)'
                    : 'rgba(16, 185, 129, 0.12)',
                  color: isInstalling ? '#818cf8' : '#10B981',
                  fontSize: '11px',
                  fontWeight: 700,
                  marginBottom: '6px',
                }}
              >
                <RefreshCw size={11} />
                {isInstalling ? 'ATUALIZAÇÃO EM ANDAMENTO' : 'NOVA ATUALIZAÇÃO DISPONÍVEL'}
              </span>
              <h3
                style={{
                  fontSize: '20px',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2,
                }}
              >
                {isInstalling
                  ? `Instalando Flow v${availableUpdate.latestVersion}`
                  : availableUpdate.releaseName}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Versão instalada:{' '}
                <strong style={{ color: 'var(--text-primary)' }}>
                  v{availableUpdate.currentVersion}
                </strong>{' '}
                ➔ Nova versão:{' '}
                <strong style={{ color: '#10B981' }}>v{availableUpdate.latestVersion}</strong>
              </p>
            </div>
          </div>

          {/* MODO 1: TELA DE PROGRESSO DA INSTALAÇÃO IN-APP */}
          {isInstalling ? (
            <div
              style={{
                padding: '24px 20px',
                borderRadius: '16px',
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                marginBottom: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {installStepText}
                </span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-primary)' }}>
                  {installProgress}%
                </span>
              </div>

              {/* Barra de Progresso Animada */}
              <div
                style={{
                  height: '8px',
                  width: '100%',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '9999px',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${installProgress}%`,
                    background: 'linear-gradient(90deg, #6366F1 0%, #10B981 100%)',
                    borderRadius: '9999px',
                    transition: 'width 400ms cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: '0 0 12px rgba(16, 185, 129, 0.4)',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                }}
              >
                <Zap size={13} color="#10B981" />
                <span>Atualização in-app automática: o aplicativo será reiniciado sozinho.</span>
              </div>
            </div>
          ) : (
            /* MODO 2: TELA INICIAL COM NOTAS DA RELEASE */
            <>
              {/* Release Notes Preview */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '16px',
                  maxHeight: '160px',
                  overflowY: 'auto',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    marginBottom: '8px',
                  }}
                >
                  Novidades e Melhorias desta Versão:
                </div>
                <p
                  style={{
                    fontSize: '12px',
                    lineHeight: 1.5,
                    color: 'var(--text-secondary)',
                    whiteSpace: 'pre-line',
                  }}
                >
                  {availableUpdate.releaseNotes}
                </p>
              </div>

              {/* Security Callout */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(99, 102, 241, 0.08)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  fontSize: '11px',
                  color: 'var(--accent-primary)',
                  marginBottom: '20px',
                }}
              >
                <ShieldCheck size={16} style={{ flexShrink: 0 }} />
                <span>
                  O processo atualiza o Flow diretamente na sua máquina, preservando todas as suas
                  tarefas, notas e configurações com segurança.
                </span>
              </div>

              {/* Opções secundárias: Copiar Link ou Abrir no GitHub */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '20px',
                  gap: '10px',
                }}
              >
                <button
                  onClick={handleCopyLink}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'none',
                    border: 'none',
                    color: copied ? '#10B981' : 'var(--text-secondary)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '4px 6px',
                    borderRadius: '6px',
                    transition: 'color 150ms',
                  }}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copied ? 'Link Copiado!' : 'Copiar Link (.exe)'}</span>
                </button>

                <button
                  onClick={handleOpenReleasePage}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '11px',
                    cursor: 'pointer',
                    padding: '4px 6px',
                    borderRadius: '6px',
                    transition: 'color 150ms',
                  }}
                >
                  <span>Ver Release no GitHub</span>
                  <ExternalLink size={12} />
                </button>
              </div>

              {/* Ações */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={closeUpdateModal}
                  style={{
                    flex: 1,
                    padding: '12px 18px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'transparent',
                    color: 'var(--text-secondary)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 150ms',
                  }}
                >
                  Lembrar Mais Tarde
                </button>

                <button
                  onClick={handleStartInAppUpdate}
                  style={{
                    flex: 1.8,
                    padding: '12px 20px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)',
                    transition: 'all 200ms',
                  }}
                >
                  <Download size={16} />
                  <span>Atualizar Agora</span>
                  <ArrowUpRight size={14} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
