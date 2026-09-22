import React from 'react';
import {
  Key,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Zap,
  ShieldCheck,
} from 'lucide-react';
import { GeminiModelOption } from '../../services/geminiService';
import { GeminiModelSelector } from './GeminiModelSelector';

export interface GeminiApiKeySectionProps {
  apiKeyInput: string;
  onApiKeyChange: (val: string) => void;
  showKey: boolean;
  onToggleShowKey: () => void;
  isGoogleConnected: boolean;
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  availableModels: GeminiModelOption[];
  onRefreshModels: () => void;
  testResult: { success?: boolean; message?: string } | null;
  isTesting: boolean;
  onTestConnection: () => void;
}

export const GeminiApiKeySection: React.FC<GeminiApiKeySectionProps> = ({
  apiKeyInput,
  onApiKeyChange,
  showKey,
  onToggleShowKey,
  isGoogleConnected,
  selectedModel,
  onSelectModel,
  availableModels,
  onRefreshModels,
  testResult,
  isTesting,
  onTestConnection,
}) => {
  return (
    <div
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: '18px',
        padding: '18px',
        border: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Key size={18} color="#6366F1" />
          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Configuração de IA (Gemini)</span>
        </div>
        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: '0.78rem',
            color: '#6366F1',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontWeight: 500,
          }}
        >
          Gerar chave no Google AI Studio <ExternalLink size={12} />
        </a>
      </div>

      {/* Banner explicativo se o token Google já estiver ativo */}
      {isGoogleConnected && (
        <div
          style={{
            padding: '8px 12px',
            borderRadius: '10px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            color: '#10B981',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={15} />
          <span>
            Sua conta Google está conectada. A IA já pode ser utilizada diretamente com os tokens da
            sua conta!
          </span>
        </div>
      )}

      {/* Input da Chave de API */}
      <div>
        <label
          style={{
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            display: 'block',
            marginBottom: '6px',
          }}
        >
          Chave de API Gemini{' '}
          {isGoogleConnected ? '(Opcional se logado com Google)' : '(Recomendado)'}:
        </label>
        <div style={{ position: 'relative' }}>
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKeyInput}
            onChange={(e) => onApiKeyChange(e.target.value)}
            placeholder={
              isGoogleConnected
                ? 'Utilizando token da Conta Google (ou cole chave manual)'
                : 'AIzaSy...'
            }
            aria-label="Chave de API Gemini"
            style={{
              width: '100%',
              padding: '10px 42px 10px 14px',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '0.88rem',
              fontFamily: 'monospace',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <button
            type="button"
            onClick={onToggleShowKey}
            aria-label={showKey ? 'Ocultar chave' : 'Mostrar chave'}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: 0,
            }}
          >
            {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {/* Seletor Dinâmico de Modelo */}
      <GeminiModelSelector
        selectedModel={selectedModel}
        onSelectModel={onSelectModel}
        availableModels={availableModels}
        onRefreshModels={onRefreshModels}
        showRefreshButton={apiKeyInput.trim().length > 10 || isGoogleConnected}
      />

      {/* Feedback do Teste */}
      {testResult && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '10px',
            backgroundColor: testResult.success
              ? 'rgba(16, 185, 129, 0.1)'
              : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${testResult.success ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
            color: testResult.success ? '#10B981' : '#EF4444',
            fontSize: '0.84rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {testResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{testResult.message}</span>
        </div>
      )}

      {/* Botão de Testar Conexão */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '2px' }}>
        <button
          type="button"
          onClick={onTestConnection}
          disabled={isTesting}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: isTesting ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            opacity: isTesting ? 0.7 : 1,
          }}
        >
          <Zap size={15} color="#F59E0B" />
          {isTesting ? 'Validando conexão com o Google...' : 'Testar Conexão com a IA'}
        </button>
      </div>

      {/* Aviso de Privacidade */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.76rem',
          color: 'var(--text-muted)',
        }}
      >
        <ShieldCheck size={14} color="#10B981" />
        <span>
          Suas credenciais e tokens são armazenados com segurança e de forma estritamente local.
        </span>
      </div>
    </div>
  );
};
