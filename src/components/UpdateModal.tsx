'use client';

import React from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { Sparkles, Download, X, ArrowUpRight, ShieldCheck, RefreshCw } from 'lucide-react';

export const UpdateModal: React.FC = () => {
  const availableUpdate = useFlowStore((s) => s.availableUpdate);
  const isUpdateModalOpen = useFlowStore((s) => s.isUpdateModalOpen);
  const closeUpdateModal = useFlowStore((s) => s.closeUpdateModal);

  if (!isUpdateModalOpen || !availableUpdate) return null;

  const handleDownload = () => {
    // Abre diretamente o download do novo instalador .exe
    window.open(availableUpdate.downloadUrl, '_blank');
    closeUpdateModal();
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
        if (e.target === e.currentTarget) closeUpdateModal();
      }}
    >
      <div
        className="double-bezel-outer"
        style={{
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 24px 60px rgba(99, 102, 241, 0.25)',
        }}
      >
        <div
          className="double-bezel-inner"
          style={{
            padding: '30px',
            position: 'relative',
          }}
        >
          {/* Close Button */}
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

          {/* Header with Glow */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '20px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 20px rgba(16, 185, 129, 0.35)',
                flexShrink: 0,
              }}
            >
              <Sparkles size={24} strokeWidth={2.4} />
            </div>

            <div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '3px 9px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  color: '#10B981',
                  fontSize: '11px',
                  fontWeight: 700,
                  marginBottom: '6px',
                }}
              >
                <RefreshCw size={11} />
                NOVA ATUALIZAÇÃO DISPONÍVEL
              </span>
              <h3 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                {availableUpdate.releaseName}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Versão atual instalada: <strong style={{ color: 'var(--text-primary)' }}>v{availableUpdate.currentVersion}</strong> ➔ Nova versão: <strong style={{ color: '#10B981' }}>v{availableUpdate.latestVersion}</strong>
              </p>
            </div>
          </div>

          {/* Release Notes Preview */}
          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '20px',
              maxHeight: '180px',
              overflowY: 'auto',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
              Novidades e Melhorias desta Versão:
            </div>
            <p style={{ fontSize: '12px', lineHeight: 1.5, color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>
              {availableUpdate.releaseNotes}
            </p>
          </div>

          {/* Security & Verification Callout */}
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
              marginBottom: '24px',
            }}
          >
            <ShieldCheck size={16} style={{ flexShrink: 0 }} />
            <span>
              O instalador `.exe` oficial substitui a versão antiga mantendo todos os seus dados e tarefas salvos com segurança.
            </span>
          </div>

          {/* Actions */}
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
              onClick={handleDownload}
              style={{
                flex: 1.8,
                padding: '12px 20px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(99, 102, 241, 0.35)',
                transition: 'all 200ms',
              }}
            >
              <Download size={16} />
              <span>Baixar Atualização (.exe)</span>
              <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
