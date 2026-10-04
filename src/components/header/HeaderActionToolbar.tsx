import { PRODUCT_FEATURES } from '../../config/productFeatures';
import React from 'react';
import {
  Sparkles,
  Sun,
  Moon,
  Plus,
  Timer,
  Bell,
  Database,
  Search,
  Cloud,
  CloudCheck,
  User,
} from 'lucide-react';
import { isNewerVersion, CURRENT_APP_VERSION } from '../../services/updateService';
import {
  GoogleUser,
  GeminiConfig,
  FirebaseUserProfile,
  CloudSyncStatus,
  UserProfile,
} from '../../types/routine';
import { getPresetById } from '../../services/userProfileService';

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
  onOpenOnboardingModal?: () => void;
  onOpenGlobalSearch?: () => void;
  firebaseUser?: FirebaseUserProfile | null;
  cloudSyncStatus?: CloudSyncStatus;
  onOpenAuthSyncModal?: () => void;
  userProfile?: UserProfile | null;
  onOpenProfileModal?: () => void;
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
  onOpenOnboardingModal,
  onOpenGlobalSearch,
  firebaseUser,
  cloudSyncStatus,
  onOpenAuthSyncModal,
  userProfile,
  onOpenProfileModal,
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
      {PRODUCT_FEATURES.aiAssistant && (
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
      )}

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

      {/* Sincronização em Nuvem / Firebase Sync (Fase 4, Parte 1) */}
      {onOpenAuthSyncModal && (
        <button
          onClick={onOpenAuthSyncModal}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: firebaseUser ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-secondary)',
            border: firebaseUser
              ? '1px solid rgba(99, 102, 241, 0.4)'
              : '1px solid var(--border-subtle)',
            color: firebaseUser ? 'var(--accent-primary)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            position: 'relative',
            transition: 'all 200ms var(--bezier-haptic)',
          }}
          title={
            firebaseUser
              ? `Nuvem conectada: ${firebaseUser.displayName || firebaseUser.email || 'Convidado'}`
              : 'Sincronização em Nuvem (Firebase Sync & Autenticação)'
          }
          data-testid="header-cloud-sync-btn"
        >
          {cloudSyncStatus?.isSyncing ? (
            <Cloud size={15} style={{ animation: 'spin 1.5s linear infinite' }} />
          ) : firebaseUser ? (
            <CloudCheck size={15} />
          ) : (
            <Cloud size={15} />
          )}
          {cloudSyncStatus?.isSyncing && (
            <span
              style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-primary)',
              }}
            />
          )}
        </button>
      )}

      {/* Onboarding Wizard / Setup de Rotinas */}
      {onOpenOnboardingModal && (
        <button
          onClick={onOpenOnboardingModal}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--accent-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 200ms var(--bezier-haptic)',
          }}
          title="Setup Inicial & Templates de Rotina (Fase 3)"
        >
          <Sparkles size={15} />
        </button>
      )}

      {/* Pesquisa Global / Command Palette (Fase 3, Parte 5) */}
      {onOpenGlobalSearch && (
        <button
          onClick={onOpenGlobalSearch}
          style={{
            height: '36px',
            padding: '0 12px',
            borderRadius: '9999px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            transition: 'all 200ms var(--bezier-haptic)',
            fontSize: '12px',
            fontWeight: 500,
          }}
          title="Pesquisa Global de Tarefas, Notas e Configurações [Atalho: Ctrl+K / Cmd+K]"
          data-testid="header-global-search-btn"
        >
          <Search size={14} color="var(--accent-primary)" />
          <span className="hide-on-compact-desktop" style={{ color: 'var(--text-muted)' }}>
            Buscar...
          </span>
          <kbd
            style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '2px 5px',
              borderRadius: '4px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            Ctrl+K
          </kbd>
        </button>
      )}

      {/* Perfil de Usuário & Configurações (Fase 4, Parte 4) */}
      {onOpenProfileModal && (
        <button
          onClick={onOpenProfileModal}
          data-testid="header-user-profile-btn"
          style={{
            height: '36px',
            padding: userProfile?.name ? '0 10px 0 4px' : '0 10px',
            borderRadius: '9999px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            transition: 'all 200ms var(--bezier-haptic)',
            fontSize: '12px',
            fontWeight: 600,
          }}
          title={`Perfil de Usuário: ${userProfile?.name || 'Configurar Perfil'}`}
        >
          {userProfile?.avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={userProfile.avatarUrl}
              alt={userProfile.name}
              style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : userProfile?.avatarPreset ? (
            <div
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: getPresetById(userProfile.avatarPreset).bgGradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
              }}
            >
              {getPresetById(userProfile.avatarPreset).emoji}
            </div>
          ) : (
            <div
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: 'var(--bg-elevated)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
              }}
            >
              <User size={14} />
            </div>
          )}
          <span className="hide-on-compact-desktop">
            {userProfile?.name ? userProfile.name.split(' ')[0] : 'Perfil'}
          </span>
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
        <span className="hide-on-compact-desktop">Nova Atividade</span>
        <span className="show-on-compact-desktop">Nova</span>
        <div className="btn-circle-icon">
          <Plus size={13} strokeWidth={2.6} />
        </div>
      </button>
    </div>
  );
};
