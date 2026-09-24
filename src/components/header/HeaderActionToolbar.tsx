import React from 'react';
import { Sparkles, Sun, Moon, Plus, Timer, Bell, Database } from 'lucide-react';
import { isNewerVersion, CURRENT_APP_VERSION } from '../../services/updateService';
import { GoogleUser, GeminiConfig } from '../../types/routine';

export interface HeaderActionToolbarProps {
  activeView: string;
  pomodoroActive: boolean;
  pomodoroTimeStr: string;
  onOpenPomodoro: () => void;
  availableUpdate: { hasUpdate?: boolean; latestVersion?: string } | null;
  onOpenUpdateModal: () => void;
  googleUser: GoogleUser | null;
  geminiConfig: GeminiConfig;
  onOpenGoogleAuthModal: () => void;
  reminderEnabled: boolean;
  onOpenNotificationModal: () => void;
  onOpenBackupModal?: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenNewTaskModal: () => void;
}

export const HeaderActionToolbar: React.FC<HeaderActionToolbarProps> = ({
  activeView,
  pomodoroActive,
  pomodoroTimeStr,
  onOpenPomodoro,
  availableUpdate,
  onOpenUpdateModal,
  googleUser,
  geminiConfig,
  onOpenGoogleAuthModal,
  reminderEnabled,
  onOpenNotificationModal,
  onOpenBackupModal,
  theme,
  onToggleTheme,
  onOpenNewTaskModal,
}) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      {/* Mini Live Timer Pill (se o pomodoro estiver ativo e estivermos em outra aba) */}
      {pomodoroActive && activeView !== 'pomodoro' && (
        <button
          onClick={onOpenPomodoro}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '9999px',
            border: '1px solid rgba(99, 102, 241, 0.4)',
            background: 'rgba(99, 102, 241, 0.12)',
            color: 'var(--accent-primary)',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'var(--font-mono)',
          }}
          title="Voltar ao Pomodoro ativo"
        >
          <Timer size={13} />
          <span>{pomodoroTimeStr}</span>
        </button>
      )}

      {/* Badge de Nova Versão Disponível */}
      {Boolean(
        availableUpdate?.hasUpdate &&
        availableUpdate?.latestVersion &&
        isNewerVersion(availableUpdate.latestVersion, CURRENT_APP_VERSION)
      ) && (
        <button
          onClick={onOpenUpdateModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '9999px',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#10B981',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 200ms',
          }}
          title="Nova versão do Flow pronta para download! Clique para atualizar."
        >
          <Sparkles size={13} />
          <span>Atualização v{availableUpdate?.latestVersion}</span>
        </button>
      )}

      {/* Conexão Google & Gemini */}
      <button
        onClick={onOpenGoogleAuthModal}
        style={{
          height: '36px',
          padding: googleUser ? '0 12px 0 6px' : '0 12px',
          borderRadius: '9999px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          color: googleUser || geminiConfig.apiKey ? '#6366F1' : 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          cursor: 'pointer',
          transition: 'all 200ms var(--bezier-haptic)',
          fontSize: '12px',
          fontWeight: 600,
        }}
        title="Conexão Google & Chave Gemini IA (RF-19)"
      >
        {googleUser?.avatarUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={googleUser.avatarUrl}
            alt={googleUser.name}
            style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }}
          />
        ) : (
          <Sparkles size={14} color={geminiConfig.apiKey ? '#6366F1' : undefined} />
        )}
        <span>
          {googleUser
            ? googleUser.name.split(' ')[0]
            : geminiConfig.apiKey
              ? 'Gemini'
              : 'Google / IA'}
        </span>
      </button>

      {/* Lembretes & Notificações */}
      <button
        onClick={onOpenNotificationModal}
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          color: reminderEnabled ? 'var(--accent-primary)' : 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          position: 'relative',
          transition: 'all 200ms var(--bezier-haptic)',
        }}
        title="Lembretes & Configurações de Notificação (RF-12)"
      >
        <Bell size={16} />
        {reminderEnabled && (
          <span
            style={{
              position: 'absolute',
              top: '7px',
              right: '7px',
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: '#10B981',
              border: '1.5px solid var(--bg-secondary)',
            }}
          />
        )}
      </button>

      {/* Backup do Banco de Dados SQLite */}
      {onOpenBackupModal && (
        <button
          onClick={onOpenBackupModal}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 200ms var(--bezier-haptic)',
          }}
          title="Backup do Banco SQLite (Fase 2)"
        >
          <Database size={15} />
        </button>
      )}

      {/* Theme Toggle */}
      <button
        onClick={onToggleTheme}
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 200ms var(--bezier-haptic)',
        }}
        title={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
      >
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      {/* Button-in-Button: Criar Nova Tarefa */}
      <button
        onClick={onOpenNewTaskModal}
        className="btn-island btn-island-primary"
        title="Nova Atividade [Atalho: Ctrl+N]"
      >
        <span>Nova Atividade</span>
        <div className="btn-circle-icon">
          <Plus size={13} strokeWidth={2.6} />
        </div>
      </button>
    </div>
  );
};
