'use client';

import React, { useState, useEffect } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import {
  testGeminiApiKey,
  fetchAvailableGeminiModels,
  FALLBACK_MODELS,
  GeminiModelOption,
  normalizeModelName,
} from '../services/geminiService';
import { initiateGoogleOAuthPopup } from '../services/googleAuthService';
import { sounds } from '../utils/audio';
import {
  X,
  Sparkles,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Eye,
  EyeOff,
  LogOut,
  Zap,
  RefreshCw,
  Copy,
  Check,
  Settings,
  HelpCircle,
} from 'lucide-react';

export const GoogleAuthModal: React.FC = () => {
  const isOpen = useFlowStore((s) => s.isGoogleAuthModalOpen);
  const closeModal = useFlowStore((s) => s.closeGoogleAuthModal);

  const googleUser = useFlowStore((s) => s.googleUser);
  const setGoogleUser = useFlowStore((s) => s.setGoogleUser);

  const geminiConfig = useFlowStore((s) => s.geminiConfig);
  const setGeminiConfig = useFlowStore((s) => s.setGeminiConfig);

  const [apiKeyInput, setApiKeyInput] = useState('');
  const [clientIdInput, setClientIdInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [availableModels, setAvailableModels] = useState<GeminiModelOption[]>(FALLBACK_MODELS);
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isLoggingInGoogle, setIsLoggingInGoogle] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [googleAuthError, setGoogleAuthError] = useState<string | null>(null);
  const [copiedOrigin, setCopiedOrigin] = useState(false);
  const [showClientIdConfig, setShowClientIdConfig] = useState(false);

  // Estados de formulário para perfil customizado manual (opcional)
  const [isEditingProfileManual, setIsEditingProfileManual] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualEmail, setManualEmail] = useState('');

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  useEffect(() => {
    if (isOpen) {
      setApiKeyInput(geminiConfig.apiKey || '');
      setClientIdInput(geminiConfig.clientId || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '');
      const cleanModel = normalizeModelName(geminiConfig.model || 'gemini-2.5-flash');
      setSelectedModel(cleanModel);
      setTestResult(null);
      setGoogleAuthError(null);
      setIsLoggingInGoogle(false);

      if (googleUser) {
        setManualName(googleUser.name);
        setManualEmail(googleUser.email);
        setIsEditingProfileManual(false);
      } else {
        setManualName('');
        setManualEmail('');
        setIsEditingProfileManual(false);
      }

      // Se houver chave ou token, atualiza modelos
      if (geminiConfig.apiKey || googleUser?.accessToken) {
        fetchAvailableGeminiModels(geminiConfig.apiKey, googleUser?.accessToken).then((models) => {
          if (models.length > 0) setAvailableModels(models);
        });
      }
    }
  }, [isOpen, geminiConfig, googleUser]);

  if (!isOpen) return null;

  // Iniciar login real do Google OAuth 2.0 via Popup
  const handleStartGoogleOAuth = async () => {
    const activeClientId = clientIdInput.trim() || geminiConfig.clientId?.trim() || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

    if (!activeClientId) {
      setShowClientIdConfig(true);
      setGoogleAuthError('Para abrir a janela oficial do Google, informe o Client ID da sua aplicação Web (veja o passo a passo abaixo).');
      sounds.playTick();
      return;
    }

    setIsLoggingInGoogle(true);
    setGoogleAuthError(null);
    sounds.playTick();

    try {
      const res = await initiateGoogleOAuthPopup({ clientId: activeClientId });

      if (res.success && res.user) {
        setGoogleUser(res.user);
        setGeminiConfig({
          clientId: activeClientId,
          isConnected: true,
        });
        setIsLoggingInGoogle(false);
        setGoogleAuthError(null);
        setShowClientIdConfig(false);
        sounds.playGlassChime();

        // Atualiza modelos disponíveis usando o token da conta
        if (res.user.accessToken) {
          fetchAvailableGeminiModels(apiKeyInput, res.user.accessToken).then((models) => {
            if (models.length > 0) setAvailableModels(models);
          });
        }
      } else {
        setIsLoggingInGoogle(false);
        setGoogleAuthError(res.error || 'Não foi possível concluir o login com o Google.');
        sounds.playTick();
      }
    } catch (err: any) {
      setIsLoggingInGoogle(false);
      setGoogleAuthError(err?.message || 'Erro inesperado na autenticação com o Google.');
      sounds.playTick();
    }
  };

  // Copiar origem para o clipboard
  const handleCopyOrigin = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(currentOrigin);
      setCopiedOrigin(true);
      sounds.playTick();
      setTimeout(() => setCopiedOrigin(false), 2500);
    }
  };

  // Desconectar conta Google
  const handleDisconnectGoogle = () => {
    setGoogleUser(null);
    setGoogleAuthError(null);
    setTestResult(null);
    sounds.playTick();
  };

  // Salvar perfil manual (caso o usuário queira preencher offline)
  const handleSaveManualProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || !manualEmail.trim()) return;

    const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
      manualName.trim()
    )}&backgroundColor=6366f1,4f46e5,4338ca&textColor=ffffff`;

    setGoogleUser({
      id: `google_manual_${Date.now()}`,
      name: manualName.trim(),
      email: manualEmail.trim(),
      avatarUrl,
      connectedAt: new Date().toLocaleDateString('pt-BR'),
    });

    setIsEditingProfileManual(false);
    sounds.playGlassChime();
  };

  // Testar conexão com a IA (via API Key ou Token do Google)
  const handleTestConnection = async () => {
    const hasKey = apiKeyInput.trim().length > 10;
    const hasToken = !!googleUser?.accessToken;

    if (!hasKey && !hasToken) {
      setTestResult({
        success: false,
        message: 'Conecte sua Conta Google oficial ou insira uma chave de API Gemini antes de testar.',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const res = await testGeminiApiKey(
      apiKeyInput.trim() || undefined,
      selectedModel,
      googleUser?.accessToken
    );

    setIsTesting(false);

    if (res.availableModels && res.availableModels.length > 0) {
      setAvailableModels(res.availableModels);
    }

    if (res.valid) {
      const activeModel = res.recommendedModel || selectedModel;
      setSelectedModel(activeModel);
      const authSource = googleUser?.accessToken ? 'Token da Conta Google' : 'Chave de API Gemini';
      setTestResult({
        success: true,
        message: `IA conectada com sucesso via ${authSource} no modelo ${activeModel}!`,
      });
      setGeminiConfig({
        apiKey: apiKeyInput.trim(),
        model: activeModel,
        isConnected: true,
      });
      sounds.playGlassChime();
    } else {
      setTestResult({
        success: false,
        message: res.error || 'Não foi possível validar a conexão com a API do Google.',
      });
      sounds.playTick();
    }
  };

  // Salvar configurações
  const handleSaveConfig = () => {
    const cleanModel = normalizeModelName(selectedModel);
    setGeminiConfig({
      apiKey: apiKeyInput.trim(),
      clientId: clientIdInput.trim() || undefined,
      model: cleanModel,
      isConnected: apiKeyInput.trim().length > 10 || !!googleUser?.accessToken,
    });
    sounds.playTick();
    closeModal();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={closeModal}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '580px',
          border: '1px solid var(--border-color)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header com Double-Bezel */}
        <div
          style={{
            padding: '20px 24px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-color)',
            background: 'linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                color: '#6366F1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(99, 102, 241, 0.25)',
              }}
            >
              <Sparkles size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                Conexão Google & Gemini IA
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Autentique sua conta Google real para personalizar seu perfil e usar tokens da IA (RF-19)
              </p>
            </div>
          </div>
          <button
            onClick={closeModal}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '8px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Conteúdo com Scroll */}
        <div style={{ padding: '22px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Seção 1: Conexão Real com Conta Google (OAuth 2.0) */}
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '18px',
              padding: '18px',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Conta Google do Usuário</span>
              </div>

              {googleUser ? (
                <span
                  style={{
                    fontSize: '0.75rem',
                    padding: '4px 10px',
                    borderRadius: '999px',
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    color: '#10B981',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <CheckCircle2 size={13} /> Conectado
                </span>
              ) : (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>OAuth 2.0 Oficial</span>
              )}
            </div>

            {/* Caso 1: Usuário já conectado */}
            {googleUser && !isEditingProfileManual ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {googleUser.avatarUrl ? (
                      <img
                        src={googleUser.avatarUrl}
                        alt={googleUser.name}
                        style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #6366F1' }}
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
                      onClick={handleDisconnectGoogle}
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
                    backgroundColor: googleUser.accessToken ? 'rgba(99, 102, 241, 0.12)' : 'rgba(245, 158, 11, 0.1)',
                    border: `1px solid ${googleUser.accessToken ? 'rgba(99, 102, 241, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
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
            ) : isEditingProfileManual ? (
              /* Formulário manual alternativo */
              <form onSubmit={handleSaveManualProfile} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                  Preencha seus dados para personalizar a saudação do assistente:
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Seu Nome:
                    </label>
                    <input
                      type="text"
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
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
                    <label style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Seu E-mail:
                    </label>
                    <input
                      type="email"
                      value={manualEmail}
                      onChange={(e) => setManualEmail(e.target.value)}
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
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setIsEditingProfileManual(false)}
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
            ) : (
              /* Caso 2: Não conectado - Botão Oficial do Google OAuth */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', margin: 0 }}>
                  Faça login com sua conta Google real para importar automaticamente seu nome, foto de perfil e autorizar os tokens da IA.
                </p>

                {/* Botão Principal de Login Google */}
                <button
                  type="button"
                  onClick={handleStartGoogleOAuth}
                  disabled={isLoggingInGoogle}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '14px',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    backgroundColor: '#FFFFFF',
                    color: '#1F2937',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    cursor: isLoggingInGoogle ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    transition: 'all 0.2s ease',
                    opacity: isLoggingInGoogle ? 0.75 : 1,
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
                  <span>{isLoggingInGoogle ? 'Aguardando login no Google...' : 'Fazer Login com o Google'}</span>
                </button>

                {/* Mensagem de Erro Google OAuth se houver */}
                {googleAuthError && (
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
                    <span>{googleAuthError}</span>
                  </div>
                )}

                {/* Botões secundários: Configurar Client ID ou Manual */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setShowClientIdConfig(!showClientIdConfig)}
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
                    <span>{showClientIdConfig ? 'Ocultar Client ID OAuth' : 'Configurar Client ID OAuth 2.0'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsEditingProfileManual(true)}
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
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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

                    <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                      1. Crie uma credencial do tipo <strong>ID do cliente OAuth (Aplicativo da Web)</strong>.<br />
                      2. Em <strong>Origens JavaScript autorizadas</strong>, adicione a URL abaixo:
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
                        onClick={handleCopyOrigin}
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

                    {/* Input do Client ID */}
                    <div>
                      <input
                        type="text"
                        value={clientIdInput}
                        onChange={(e) => setClientIdInput(e.target.value)}
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
                      onClick={handleStartGoogleOAuth}
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
            )}
          </div>

          {/* Seção 2: Chave de API Google Gemini & Modelos (IA Generativa) */}
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
            {googleUser?.accessToken && (
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
                  Sua conta Google está conectada. A IA já pode ser utilizada diretamente com os tokens da sua conta!
                </span>
              </div>
            )}

            {/* Input da Chave de API */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Chave de API Gemini {googleUser?.accessToken ? '(Opcional se logado com Google)' : '(Recomendado)'}:
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder={googleUser?.accessToken ? 'Utilizando token da Conta Google (ou cole chave manual)' : 'AIzaSy...'}
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
                  onClick={() => setShowKey(!showKey)}
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
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Modelo do Gemini:
                </label>
                {(apiKeyInput.trim().length > 10 || googleUser?.accessToken) && (
                  <button
                    type="button"
                    onClick={async () => {
                      const models = await fetchAvailableGeminiModels(apiKeyInput, googleUser?.accessToken);
                      setAvailableModels(models);
                      sounds.playTick();
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#6366F1',
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <RefreshCw size={11} /> Atualizar modelos
                  </button>
                )}
              </div>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem',
                  outline: 'none',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                }}
              >
                {availableModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.displayName}
                  </option>
                ))}
              </select>
            </div>

            {/* Feedback do Teste */}
            {testResult && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  backgroundColor: testResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
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
                onClick={handleTestConnection}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              <ShieldCheck size={14} color="#10B981" />
              <span>Suas credenciais e tokens são armazenados com segurança e de forma estritamente local.</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            backgroundColor: 'var(--bg-secondary)',
          }}
        >
          <button
            onClick={closeModal}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'transparent',
              color: 'var(--text-primary)',
              fontSize: '0.88rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSaveConfig}
            style={{
              padding: '10px 22px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: '#6366F1',
              color: '#FFF',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)',
            }}
          >
            Salvar & Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
