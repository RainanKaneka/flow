import React from 'react';
import { GoogleUser } from '../../types/routine';
import { LogOut, Zap } from 'lucide-react';

export interface GoogleUserProfileCardProps {
  googleUser: GoogleUser;
  onDisconnect: () => void;
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

      {/* Token status banner */}
      <div
        style={{
          padding: '8px 12px',
          borderRadius: '10px',
          backgroundColor: googleUser.accessToken
            ? 'rgba(99, 102, 241, 0.12)'
            : 'rgba(245, 158, 11, 0.1)',
          border: `1px solid ${
            googleUser.accessToken ? 'rgba(99, 102, 241, 0.25)' : 'rgba(245, 158, 11, 0.25)'
          }`,
          fontSize: '0.8rem',
          color: googleUser.accessToken ? '#818CF8' : '#F59E0B',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <Zap size={14} />
        <span>
          {googleUser.accessToken
            ? 'Token OAuth 2.0 ativo: Sua conta Google está autenticada para alimentar a IA Gemini.'
            : 'Perfil conectado localmente.'}
        </span>
      </div>
    </div>
  );
};
