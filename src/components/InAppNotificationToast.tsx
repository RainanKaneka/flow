'use client';

import React, { useState, useEffect } from 'react';
import { notificationService, NotificationPayload } from '../services/notificationService';
import { Bell, X } from 'lucide-react';

interface ActiveToast extends NotificationPayload {
  id: string;
}

export const InAppNotificationToast: React.FC = () => {
  const [toasts, setToasts] = useState<ActiveToast[]>([]);

  useEffect(() => {
    const unsubscribe = notificationService.onToast((payload) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newToast: ActiveToast = { ...payload, id };

      setToasts((prev) => [...prev.slice(-2), newToast]); // Mantém no máximo 3 simultâneos

      // Auto-remover após 6 segundos
      setTimeout(() => {
        setToasts((current) => current.filter((t) => t.id !== id));
      }, 6000);
    });

    return () => unsubscribe();
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '24px',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        pointerEvents: 'none',
        maxWidth: '380px',
        width: 'calc(100vw - 48px)',
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            pointerEvents: 'auto',
            backgroundColor: 'var(--bg-elevated)',
            borderRadius: '16px',
            padding: '14px 16px',
            border: '1px solid var(--border-color)',
            boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            position: 'relative',
            overflow: 'hidden',
            animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Ícone com brilho sutil */}
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: 'rgba(99, 102, 241, 0.15)',
              color: '#6366F1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              border: '1px solid rgba(99, 102, 241, 0.25)',
            }}
          >
            <Bell size={18} />
          </div>

          {/* Conteúdo */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h4
              style={{
                fontSize: '0.88rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: '0 0 3px 0',
                letterSpacing: '-0.01em',
              }}
            >
              {toast.title}
            </h4>
            <p
              style={{
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
                margin: 0,
                lineHeight: 1.35,
              }}
            >
              {toast.body}
            </p>
          </div>

          {/* Botão de Fechar */}
          <button
            onClick={() => setToasts((curr) => curr.filter((t) => t.id !== toast.id))}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <X size={14} />
          </button>

          {/* Barra de progresso temporal */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '3px',
              backgroundColor: 'rgba(99, 102, 241, 0.2)',
            }}
          >
            <div
              style={{
                height: '100%',
                backgroundColor: '#6366F1',
                animation: 'toastProgress 6s linear forwards',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
