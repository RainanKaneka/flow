import React from 'react';
import { GoogleUser } from '../../types/routine';
import { LogOut, Zap, RefreshCw, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { getTimeUntilExpiryMinutes, isTokenExpired } from '../../services/googleAuthService';

export interface GoogleUserProfileCardProps {
  googleUser: GoogleUser;
  onDisconnect: () => void;
  onRefreshToken?: () => void;
  isRefreshingToken?: boolean;
  isEditingManual: boolean;
  onToggleEditManual: (editing: boolean) => void;
  manualName: string;
  manualEmail: string;
  onManualNameChange: (val: string) => void;
  onManualEmailChange: (val: string) => void;
  onSaveManualProfile: (e: React.FormEvent) => void;
}

export const GoogleUserProfileCard: React.FC<GoogleUserProfileCardProps> = ({
  googleUser,
  onDisconnect,
  onRefreshToken,
  isRefreshingToken = false,
  isEditingManual,
  onToggleEditManual,
  manualName,
  manualEmail,
  onManualNameChange,
  onManualEmailChange,
  onSaveManualProfile,
}) => {
  if (isEditingManual) {
    return (
      <form
        onSubmit={onSaveManualProfile}
        style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
      >
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
          Preencha seus dados para personalizar a saudação do assistente:
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <label
              style={{
                fontSize: '0.76rem',
                color: 'var(--text-muted)',
                display: 'block',
                marginBottom: '4px',
              }}
            >
              Seu Nome:
            </label>
            <input
              type="text"
              value={manualName}
              onChange={(e) => onManualNameChange(e.target.value)}
              placeholder="Ex: Rainan"
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '0.86rem',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label
              style={{
                fontSize: '0.76rem',
                color: 'var(--text-muted)',
                display: 'block',
                marginBottom: '4px',
              }}
            >
              Seu E-mail:
            </label>
            <input
              type="email"
              value={manualEmail}
              onChange={(e) => onManualEmailChange(e.target.value)}
              placeholder="Ex: seuemail@gmail.com"
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '0.86rem',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
            marginTop: '4px',
          }}
        >
          <button
            type="button"
            onClick={() => onToggleEditManual(false)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'none',
              color: 'var(--text-muted)',
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#6366F1',
              color: '#FFF',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Salvar Perfil
          </button>
        </div>
      </form>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {googleUser.avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={googleUser.avatarUrl}
              alt={googleUser.name}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid #6366F1',
              }}
            />
          ) : (
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: '#6366F1',
                color: '#FFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '1rem',
              }}
            >
              {googleUser.name.substring(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{googleUser.name}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{googleUser.email}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={onDisconnect}
            style={{
              background: 'none',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              padding: '6px 12px',
              borderRadius: '10px',
              fontSize: '0.8rem',
              color: '#EF4444',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontWeight: 500,
            }}
          >
            <LogOut size={13} /> Desconectar
          </button>
        </div>
      </div>

      {/* Token status banner com Auto-Refresh (Fase 4, Parte 2) */}
      <div
        style={{
          padding: '10px 12px',
          borderRadius: '12px',
          backgroundColor: googleUser.accessToken
            ? 'rgba(99, 102, 241, 0.1)'
            : 'rgba(245, 158, 11, 0.1)',
          border: `1px solid ${
            googleUser.accessToken ? 'rgba(99, 102, 241, 0.25)' : 'rgba(245, 158, 11, 0.25)'
          }`,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={14} color={googleUser.accessToken ? '#818CF8' : '#F59E0B'} />
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: googleUser.accessToken ? '#818CF8' : '#F59E0B' }}>
              {googleUser.accessToken ? 'Token Google OAuth 2.0 Ativo' : 'Perfil conectado localmente'}
            </span>
          </div>

          {googleUser.accessToken && (
            <span
              style={{
                fontSize: '0.72rem',
                padding: '2px 8px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#10B981',
                fontWeight: 600,
              }}
              data-testid="token-refresh-badge"
            >
              Auto-Refresh Ativo • {getTimeUntilExpiryMinutes(googleUser)} min
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
            {googleUser.accessToken
              ? 'Renovação em segundo plano automática para chamadas da IA Gemini.'
              : 'Faça login com OAuth para obter tokens de IA.'}
          </span>

          {googleUser.accessToken && onRefreshToken && (
            <button
              type="button"
              onClick={onRefreshToken}
              disabled={isRefreshingToken}
              style={{
                background: 'none',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '0.74rem',
                color: 'var(--accent-primary)',
                cursor: isRefreshingToken ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontWeight: 600,
                opacity: isRefreshingToken ? 0.7 : 1,
              }}
              data-testid="refresh-google-token-btn"
              title="Renovar token de acesso antecipadamente"
            >
              <RefreshCw size={12} className={isRefreshingToken ? 'animate-spin' : ''} />
              <span>{isRefreshingToken ? 'Renovando...' : 'Renovar Token'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
