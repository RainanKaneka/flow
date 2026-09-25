'use client';

import React, { useState, useEffect } from 'react';
import { isTauri } from '../utils/browser';
import { Minus, Square, Copy, X } from 'lucide-react';

export const CustomTitleBar: React.FC = () => {
  const [isDesktop, setIsDesktop] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [appWindow, setAppWindow] = useState<any>(null);

  useEffect(() => {
    if (isTauri()) {
      setIsDesktop(true);
      if (typeof document !== 'undefined') {
        document.documentElement.style.setProperty('--titlebar-height', '32px');
      }
      import('@tauri-apps/api/window')
        .then(({ getCurrentWindow }) => {
          const win = getCurrentWindow();
          setAppWindow(win);
          win
            .isMaximized()
            .then(setIsMaximized)
            .catch(() => {});

          const unlisten = win.onResized(async () => {
            try {
              const max = await win.isMaximized();
              setIsMaximized(max);
            } catch (e) {}
          });

          return () => {
            unlisten.then((fn) => fn()).catch(() => {});
          };
        })
        .catch((err) => {
          console.warn('Falha ao carregar Tauri Window API:', err);
        });

      return () => {
        if (typeof document !== 'undefined') {
          document.documentElement.style.setProperty('--titlebar-height', '0px');
        }
      };
    }
  }, []);

  if (!isDesktop) return null;

  const handleMinimize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (appWindow) await appWindow.minimize();
    } catch (err) {
      console.error('Erro ao minimizar janela:', err);
    }
  };

  const handleToggleMaximize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (appWindow) {
        await appWindow.toggleMaximize();
        const max = await appWindow.isMaximized();
        setIsMaximized(max);
      }
    } catch (err) {
      console.error('Erro ao alternar maximizar janela:', err);
    }
  };

  const handleClose = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (appWindow) await appWindow.close();
    } catch (err) {
      console.error('Erro ao fechar janela:', err);
    }
  };

  return (
    <aside
      aria-label="Barra de Título do Aplicativo"
      data-tauri-drag-region
      onDoubleClick={handleToggleMaximize}
      style={{
        height: '32px',
        width: '100%',
        backgroundColor: 'var(--bg-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        borderBottom: '1px solid var(--border-subtle)',
        zIndex: 50,
        position: 'sticky',
        top: 0,
      }}
    >
      {/* Área Esquerda: Indicador sutil e minimalista (sem título poluído) */}
      <div
        data-tauri-drag-region
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          paddingLeft: '14px',
          height: '100%',
        }}
      >
        <span
          data-tauri-drag-region
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent-primary)',
            boxShadow: '0 0 8px var(--accent-primary)',
            display: 'inline-block',
          }}
        />
        <span
          data-tauri-drag-region
          style={{
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
          }}
        >
          Flow
        </span>
      </div>

      {/* Região central arrastável */}
      <div
        data-tauri-drag-region
        style={{
          flex: 1,
          height: '100%',
        }}
      />

      {/* Controles de Janela Customizados (Minimizar, Maximizar, Fechar) */}
      <div
        style={
          {
            display: 'flex',
            alignItems: 'center',
            height: '100%',
            WebkitAppRegion: 'no-drag',
          } as React.CSSProperties
        }
      >
        {/* Botão Minimizar */}
        <button
          onClick={handleMinimize}
          title="Minimizar"
          style={{
            width: '42px',
            height: '100%',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 150ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.07)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <Minus size={13} strokeWidth={2.2} />
        </button>

        {/* Botão Maximizar / Restaurar */}
        <button
          onClick={handleToggleMaximize}
          title={isMaximized ? 'Restaurar' : 'Maximizar'}
          style={{
            width: '42px',
            height: '100%',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 150ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.07)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          {isMaximized ? (
            <Copy size={11} strokeWidth={2.2} style={{ transform: 'rotate(90deg)' }} />
          ) : (
            <Square size={11} strokeWidth={2.2} />
          )}
        </button>

        {/* Botão Fechar com hover avermelhado */}
        <button
          onClick={handleClose}
          title="Fechar"
          style={{
            width: '44px',
            height: '100%',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 150ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.22)';
            e.currentTarget.style.color = '#EF4444';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <X size={14} strokeWidth={2.2} />
        </button>
      </div>
    </aside>
  );
};
