'use client';

import React, { useEffect } from 'react';
import { Trash2, X } from 'lucide-react';
import { sounds } from '../utils/audio';

interface DeleteTaskConfirmModalProps {
  isOpen: boolean;
  taskTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteTaskConfirmModal: React.FC<DeleteTaskConfirmModalProps> = ({
  isOpen,
  taskTitle,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      } else if (e.key === 'Enter') {
        onConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel, onConfirm]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onCancel}
    >
      <div
        className="double-bezel-outer"
        style={{
          width: '100%',
          maxWidth: '440px',
          boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="double-bezel-inner"
          style={{
            padding: '26px 28px',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#EF4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 15px rgba(239, 68, 68, 0.2)',
                }}
              >
                <Trash2 size={20} />
              </div>
              <div>
                <h3
                  style={{
                    fontSize: '16px',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    color: 'var(--text-primary)',
                  }}
                >
                  Excluir Atividade?
                </h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Remoção de atividade da rotina
                </span>
              </div>
            </div>

            <button
              onClick={onCancel}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '8px',
                display: 'flex',
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Description */}
          <p
            style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              marginBottom: '22px',
            }}
          >
            Tem certeza que deseja excluir a atividade{' '}
            <strong style={{ color: 'var(--text-primary)' }}>&ldquo;{taskTitle}&rdquo;</strong>?
            Ela será removida da sua programação, mas você poderá desfazer a exclusão no aviso que aparecerá na tela.
          </p>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '9px 18px',
                borderRadius: '10px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                sounds.playTick();
              }}
              style={{
                padding: '9px 20px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 16px rgba(239, 68, 68, 0.35)',
                transition: 'all 0.15s ease',
              }}
            >
              <Trash2 size={15} /> Confirmar Exclusão
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
