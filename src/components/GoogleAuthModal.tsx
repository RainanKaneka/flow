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
  User,
  Mail,
  RefreshCw,
} from 'lucide-react';

export const GoogleAuthModal: React.FC = () => {
  const isOpen = useFlowStore((s) => s.isGoogleAuthModalOpen);
  const closeModal = useFlowStore((s) => s.closeGoogleAuthModal);

  const googleUser = useFlowStore((s) => s.googleUser);
  const setGoogleUser = useFlowStore((s) => s.setGoogleUser);

  const geminiConfig = useFlowStore((s) => s.geminiConfig);
  const setGeminiConfig = useFlowStore((s) => s.setGeminiConfig);

  const [apiKeyInput, setApiKeyInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [availableModels, setAvailableModels] = useState<GeminiModelOption[]>(FALLBACK_MODELS);
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);

  // Estados de formulário de perfil Google real
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');

  useEffect(() => {
    if (isOpen) {
      setApiKeyInput(geminiConfig.apiKey || '');
      const cleanModel = normalizeModelName(geminiConfig.model || 'gemini-2.5-flash');
      setSelectedModel(cleanModel);
      setTestResult(null);

      if (googleUser) {
        setProfileName(googleUser.name);
        setProfileEmail(googleUser.email);
        setIsEditingProfile(false);
      } else {
        setProfileName('');
        setProfileEmail('');
        setIsEditingProfile(false);
      }

      // Se já houver chave, busca modelos atualizados em segundo plano
      if (geminiConfig.apiKey) {
        fetchAvailableGeminiModels(geminiConfig.apiKey).then((models) => {
          if (models.length > 0) setAvailableModels(models);
        });
      }
    }
  }, [isOpen, geminiConfig, googleUser]);

  if (!isOpen) return null;

  // Conectar com perfil Google real fornecido pelo usuário
  const handleSaveRealGoogleProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim() || !profileEmail.trim()) return;

    // Gera avatar padrão com iniciais ou foto
    const initials = profileName.trim().substring(0, 2).toUpperCase();
    const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
      profileName.trim()
    )}&backgroundColor=6366f1,4f46e5,4338ca&textColor=ffffff`;

    const newUser = {
      id: `google_${Date.now()}`,
      name: profileName.trim(),
      email: profileEmail.trim(),
      avatarUrl,
      connectedAt: new Date().toLocaleDateString('pt-BR'),
    };

    setGoogleUser(newUser);
    setIsEditingProfile(false);
    sounds.playGlassChime();
  };

  // Login via Google OAuth 2.0 Popup
  const handleGoogleOAuthPopup = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    if (!clientId) {
      // Se não há client_id de OAuth configurado no app, abre o formulário para inserção direta dos dados reais
      setIsEditingProfile(true);
      return;
    }

    const redirectUri = window.location.origin;
    const scope = encodeURIComponent('email profile openid');
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=token&scope=${scope}&prompt=select_account`;

    const popup = window.open(authUrl, 'google_oauth_popup', 'width=500,height=650,left=200,top=100');

    if (!popup) {
      setIsEditingProfile(true);
      return;
    }

    const pollTimer = window.setInterval(async () => {
      try {
        if (popup.closed) {
          clearInterval(pollTimer);
          return;
        }

        const popupUrl = popup.location.href;
        if (popupUrl && popupUrl.includes('access_token=')) {
          clearInterval(pollTimer);
          const params = new URLSearchParams(popup.location.hash.substring(1));
          const accessToken = params.get('access_token');
          popup.close();

          if (accessToken) {
            const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (userInfoRes.ok) {
              const userInfo = await userInfoRes.json();
              setGoogleUser({
                id: userInfo.sub || `google_${Date.now()}`,
                name: userInfo.name || 'Usuário Google',
                email: userInfo.email || '',
                avatarUrl: userInfo.picture,
                connectedAt: new Date().toLocaleDateString('pt-BR'),
              });
              sounds.playGlassChime();
            }
          }
        }
      } catch (err) {
        // Cross-origin até o redirecionamento
      }
    }, 500);
  };

  const handleDisconnectGoogle = () => {
    setGoogleUser(null);
    setProfileName('');
    setProfileEmail('');
    setIsEditingProfile(false);
    sounds.playTick();
  };

  // Testar chave de API
  const handleTestKey = async () => {
    if (!apiKeyInput.trim()) {
      setTestResult({ success: false, message: 'Digite ou cole uma chave de API antes de testar.' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const res = await testGeminiApiKey(apiKeyInput.trim(), selectedModel);
    setIsTesting(false);

    if (res.availableModels && res.availableModels.length > 0) {
      setAvailableModels(res.availableModels);
    }

    if (res.valid) {
      const activeModel = res.recommendedModel || selectedModel;
      setSelectedModel(activeModel);
      setTestResult({
        success: true,
        message: `Chave validada com sucesso no modelo ${activeModel}!`,
      });
      setGeminiConfig({
        apiKey: apiKeyInput.trim(),
        model: activeModel,
        isConnected: true,
      });
      sounds.playGlassChime();
    } else {
      setTestResult({ success: false, message: res.error || 'Não foi possível validar a chave com a API do Google.' });
      sounds.playTick();
    }
  };

  // Salvar configuração
  const handleSaveConfig = () => {
    const cleanModel = normalizeModelName(selectedModel);
    setGeminiConfig({
      apiKey: apiKeyInput.trim(),
      model: cleanModel,
      isConnected: apiKeyInput.trim().length > 10,
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
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
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
          maxWidth: '560px',
          border: '1px solid var(--border-color)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header com Double-Bezel */}
        <div
          style={{
            padding: '22px 24px 18px',
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
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                Conexão Google & Gemini IA
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Alimente seu assistente de rotina com inteligência generativa (RF-19)
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

        {/* Conteúdo do Modal */}
        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Seção 1: Conexão com Conta Google (RF-19) */}
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '16px',
              padding: '18px',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Conta Google do Usuário</span>
              </div>
              {googleUser ? (
                <span
                  style={{
                    fontSize: '0.75rem',
                    padding: '3px 8px',
                    borderRadius: '999px',
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    color: '#10B981',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <CheckCircle2 size={12} /> Conectado
                </span>
              ) : (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Personalização</span>
              )}
            </div>

            {googleUser && !isEditingProfile ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {googleUser.avatarUrl ? (
                    <img
                      src={googleUser.avatarUrl}
                      alt={googleUser.name}
                      style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: '#6366F1',
                        color: '#FFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                      }}
                    >
                      {googleUser.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{googleUser.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{googleUser.email}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    style={{
                      background: 'none',
                      border: '1px solid var(--border-color)',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                    }}
                  >
                    Editar
                  </button>
                  <button
                    onClick={handleDisconnectGoogle}
                    style={{
                      background: 'none',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      color: '#EF4444',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <LogOut size={13} /> Desconectar
                  </button>
                </div>
              </div>
            ) : isEditingProfile ? (
              <form onSubmit={handleSaveRealGoogleProfile} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                  Informe seus dados reais da sua conta Google para personalizar o assistente:
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Seu Nome:
                    </label>
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
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
                      Seu E-mail Google:
                    </label>
                    <input
                      type="email"
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
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
                    onClick={() => setIsEditingProfile(false)}
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
                    Salvar Perfil Google
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', margin: 0 }}>
                  Vincule sua conta Google para que o assistente do Flow identifique seu nome e perfil oficial.
                </p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleGoogleOAuthPopup}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24">
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
                    <span>Conectar Conta Google</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(true)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'transparent',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    Digitar Meu Nome / E-mail
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Seção 2: Chave de API Google Gemini (Google AI Studio) */}
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '16px',
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
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Chave de API Gemini (IA)</span>
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

            {/* Input da Chave */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Cole sua chave de API gerada com sua conta Google:
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  style={{
                    width: '100%',
                    padding: '10px 42px 10px 14px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
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
                {apiKeyInput.trim().length > 10 && (
                  <button
                    type="button"
                    onClick={async () => {
                      const models = await fetchAvailableGeminiModels(apiKeyInput);
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
                onClick={handleTestKey}
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
                {isTesting ? 'Validando chave com o Google...' : 'Testar Conexão'}
              </button>
            </div>

            {/* Aviso de Privacidade */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              <ShieldCheck size={14} color="#10B981" />
              <span>Sua chave é armazenada de forma estritamente local no seu próprio dispositivo.</span>
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
              color: '#FFFFFF',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
            }}
          >
            Salvar e Aplicar
          </button>
        </div>
      </div>
    </div>
  );
};
