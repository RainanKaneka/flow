import React, { useEffect, useState } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { RefreshCcw, X } from 'lucide-react';

export const Snackbar: React.FC = () => {
  const snackbar = useFlowStore((s) => s.snackbar);
  const hideSnackbar = useFlowStore((s) => s.hideSnackbar);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (snackbar.isOpen) {
      setVisible(true);
      timeout = setTimeout(() => {
        hideSnackbar();
      }, 5000);
    } else {
      // Delay unmount to allow CSS transition
      timeout = setTimeout(() => {
        setVisible(false);
      }, 300);
    }
    return () => clearTimeout(timeout);
  }, [snackbar.isOpen, hideSnackbar]);

  if (!visible && !snackbar.isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '30px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        backgroundColor: 'var(--bg-elevated)',
        borderRadius: '24px',
        padding: '10px 16px 10px 20px',
        border: '1px solid var(--border-color)',
        boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08)',
        opacity: snackbar.isOpen ? 1 : 0,
        transition: 'opacity 0.3s ease, transform 0.3s ease',
      }}
    >
      <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
        {snackbar.message}
      </span>
      {snackbar.onUndo && (
        <button
          onClick={() => {
            if (snackbar.onUndo) snackbar.onUndo();
            hideSnackbar();
          }}
          style={{
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            color: '#6366F1',
            borderRadius: '16px',
            padding: '6px 12px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
          }}
        >
          <RefreshCcw size={12} />
          Desfazer
        </button>
      )}
      <button
        onClick={hideSnackbar}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title="Fechar"
      >
        <X size={16} />
      </button>
    </div>
  );
};
