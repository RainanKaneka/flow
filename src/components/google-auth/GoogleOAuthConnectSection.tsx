import React from 'react';
import { AlertCircle, Settings, ExternalLink, Copy, Check, Zap, Sparkles, ShieldCheck } from 'lucide-react';
import { isValidGoogleClientId } from '../../services/googleAuthService';

export interface GoogleOAuthConnectSectionProps {
  onStartOAuth: () => void;
  isLoggingIn: boolean;
  errorMessage: string | null;
  showClientIdConfig: boolean;
  onToggleShowClientIdConfig: () => void;
  onOpenManualProfile: () => void;
  clientIdInput: string;
  onClientIdInputChange: (val: string) => void;
  currentOrigin: string;
  copiedOrigin: boolean;
  onCopyOrigin: () => void;
  tokenInput?: string;
  onTokenInputChange?: (val: string) => void;
  onConnectWithToken?: () => void;
  isConnectingToken?: boolean;
  isExternalBrowserOpen?: boolean;
  onReopenBrowser?: () => void;
}

export const GoogleOAuthConnectSection: React.FC<GoogleOAuthConnectSectionProps> = ({
  onStartOAuth,
  isLoggingIn,
  errorMessage,
  showClientIdConfig,
  onToggleShowClientIdConfig,
  onOpenManualProfile,
  clientIdInput,
  onClientIdInputChange,
  currentOrigin,
  copiedOrigin,
  onCopyOrigin,
  tokenInput = '',
  onTokenInputChange,
  onConnectWithToken,
  isConnectingToken = false,
  isExternalBrowserOpen = false,
  onReopenBrowser,
}) => {
  const [showManualTokenField, setShowManualTokenField] = React.useState(false);
  const hasValidClientId = isValidGoogleClientId(clientIdInput);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Banner de Modo Oficial Zero-Config ou Status de Client ID */}
      <div
        style={{
          padding: '12px 14px',
          borderRadius: '12px',
          background: hasValidClientId
            ? 'rgba(16, 185, 129, 0.1)'
            : 'rgba(99, 102, 241, 0.08)',
          border: hasValidClientId
            ? '1px solid rgba(16, 185, 129, 0.28)'
            : '1px solid rgba(99, 102, 241, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
        data-testid="flow-official-oauth-badge"
      >
        {hasValidClientId ? (
          <ShieldCheck size={18} color="#10B981" style={{ flexShrink: 0 }} />
        ) : (
          <Sparkles size={18} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
        )}
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', flex: 1 }}>
          <strong style={{ color: hasValidClientId ? '#10B981' : 'var(--text-primary)' }}>
            {hasValidClientId
              ? 'Client ID do Google OAuth Configurado'
              : 'Google OAuth 2.0 (Login & Sincronização)'}
          </strong>
          <div style={{ marginTop: '2px', lineHeight: 1.4 }}>
            {hasValidClientId
              ? 'Credencial ativa com suporte a renovação contínua de token (Auto-Refresh).'
              : 'Requer Client ID do Google Cloud cadastrado ou conecte a IA direto com a Chave Gemini abaixo (sem GCP).'}
          </div>
        </div>
      </div>

      <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', margin: 0 }}>
        Faça login com sua conta Google para sincronizar seu perfil e autorizar os modelos Gemini.
      </p>

      {/* Botão Principal de Login Google */}
      <button
        type="button"
        onClick={onStartOAuth}
        disabled={isLoggingIn}
        style={{
          padding: '12px 16px',
          borderRadius: '14px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          backgroundColor: '#FFFFFF',
          color: '#1F2937',
          fontWeight: 700,
          fontSize: '0.92rem',
          cursor: isLoggingIn ? 'wait' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          transition: 'all 0.2s ease',
          opacity: isLoggingIn ? 0.75 : 1,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.99 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
          />
        </svg>
        <span>{isLoggingIn ? 'Aguardando login no Google...' : 'Fazer Login com o Google'}</span>
      </button>

      {/* Mensagem de Erro Google OAuth se houver (apenas se não for o aviso informativo de navegador externo) */}
      {errorMessage && !isExternalBrowserOpen && (
        <div
          style={{
            padding: '10px 12px',
            borderRadius: '10px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#EF4444',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
          }}
        >
          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Card Especial de Conexão com Token / Navegador Externo (Desktop & Fallback) */}
      {(isExternalBrowserOpen || showManualTokenField) && (
        <div
          style={{
            padding: '14px 16px',
            borderRadius: '14px',
            backgroundColor: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.28)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
          data-testid="external-browser-token-card"
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}
          >
            <span
              style={{
                fontSize: '0.84rem',
                fontWeight: 600,
                color: '#818CF8',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <ExternalLink size={14} />
              Login via Navegador Aberto
            </span>
            {onReopenBrowser && (
              <button
                type="button"
                onClick={onReopenBrowser}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '0.74rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
                }}
              >
                Reabrir Navegador
              </button>
            )}
          </div>

          <p
            style={{
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              margin: 0,
              lineHeight: 1.45,
            }}
          >
            Conclua a autorização no Chrome/Edge. O token é gerado no final. Cole o token ou a URL completa abaixo e clique em <strong>Conectar</strong>:
          </p>

          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => onTokenInputChange && onTokenInputChange(e.target.value)}
              placeholder="Cole o token (ya29...) ou link de redirecionamento"
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
                outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={onConnectWithToken}
              disabled={isConnectingToken || !tokenInput.trim()}
              style={{
                padding: '8px 14px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: tokenInput.trim() ? '#6366F1' : 'rgba(99, 102, 241, 0.4)',
                color: '#FFF',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: isConnectingToken ? 'wait' : tokenInput.trim() ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
              }}
              data-testid="connect-with-token-btn"
            >
              {isConnectingToken ? 'Validando...' : 'Conectar'}
            </button>
          </div>
        </div>
      )}

      {/* Botões secundários: Configurar Client ID, Token ou Manual */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          marginTop: '4px',
        }}
      >
        <button
          type="button"
          onClick={onToggleShowClientIdConfig}
          style={{
            background: 'none',
            border: 'none',
            color: '#6366F1',
            fontSize: '0.78rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: 0,
          }}
        >
          <Settings size={13} />
          <span>
            {showClientIdConfig ? 'Ocultar Client ID OAuth' : 'Configurar Client ID OAuth 2.0'}
          </span>
        </button>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setShowManualTokenField((prev) => !prev)}
            style={{
              background: 'none',
              border: 'none',
              color: showManualTokenField ? '#818CF8' : 'var(--text-muted)',
              fontSize: '0.78rem',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {showManualTokenField ? 'Ocultar campo de token' : 'Conectar com Token já gerado'}
          </button>

          <button
            type="button"
            onClick={onOpenManualProfile}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '0.78rem',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Preencher perfil offline
          </button>
        </div>
      </div>

      {/* Box Expansível de Configuração do Client ID do Google Cloud */}
      {showClientIdConfig && (
        <div
          style={{
            padding: '14px',
            borderRadius: '12px',
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Google OAuth Client ID</span>
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '0.76rem',
                color: '#6366F1',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              Google Cloud Console <ExternalLink size={11} />
            </a>
          </div>

          <p
            style={{
              fontSize: '0.76rem',
              color: 'var(--text-muted)',
              margin: 0,
              lineHeight: 1.45,
            }}
          >
            1. Acesse o <strong>Google Cloud Console &gt; Credenciais</strong>.
            <br />
            2. Clique em <strong>+ Criar Credenciais &gt; ID do cliente OAuth</strong> (Tipo: <em>Aplicativo da Web</em>).
            <br />
            3. Em <strong>Origens JavaScript autorizadas</strong> e <strong>URIs de redirecionamento autorizados</strong>, adicione a URL abaixo:
          </p>

          {/* Origem autorizada com cópia em 1 clique */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 10px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px dashed var(--border-color)',
              fontSize: '0.78rem',
              fontFamily: 'monospace',
            }}
          >
            <span>{currentOrigin}</span>
            <button
              type="button"
              onClick={onCopyOrigin}
              style={{
                background: 'none',
                border: 'none',
                color: copiedOrigin ? '#10B981' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.72rem',
              }}
            >
              {copiedOrigin ? <Check size={12} /> : <Copy size={12} />}
              <span>{copiedOrigin ? 'Copiado!' : 'Copiar'}</span>
            </button>
          </div>

          <div
            style={{
              padding: '8px 10px',
              borderRadius: '8px',
              backgroundColor: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              fontSize: '0.74rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.4,
            }}
          >
            💡 <strong>Dica Rápida:</strong> Se você deseja apenas usar os recursos de Inteligência Artificial do Flow (Gemini), não é necessário criar Client ID no Google Cloud! Basta colar sua Chave de API Gemini gratuita na seção logo abaixo.
          </div>

          {/* Input do Client ID */}
          <div>
            <input
              type="text"
              value={clientIdInput}
              onChange={(e) => onClientIdInputChange(e.target.value)}
              placeholder="Ex: 1234567890-abcdef.apps.googleusercontent.com"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
                fontFamily: 'monospace',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="button"
            onClick={onStartOAuth}
            style={{
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#6366F1',
              color: '#FFF',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Zap size={14} /> Salvar Client ID & Fazer Login Agora
          </button>
        </div>
      )}
    </div>
  );
};
