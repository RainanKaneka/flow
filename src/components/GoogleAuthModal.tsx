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
import { X, Sparkles, CheckCircle2 } from 'lucide-react';
import { GoogleUserProfileCard } from './google-auth/GoogleUserProfileCard';
import { GoogleOAuthConnectSection } from './google-auth/GoogleOAuthConnectSection';
import { GeminiApiKeySection } from './google-auth/GeminiApiKeySection';

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
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(
    null
  );
  const [googleAuthError, setGoogleAuthError] = useState<string | null>(null);
  const [copiedOrigin, setCopiedOrigin] = useState(false);
  const [showClientIdConfig, setShowClientIdConfig] = useState(false);

  // Estados de formulário para perfil customizado manual (opcional)
  const [isEditingProfileManual, setIsEditingProfileManual] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualEmail, setManualEmail] = useState('');

  const currentOrigin =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

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
    const activeClientId =
      clientIdInput.trim() ||
      geminiConfig.clientId?.trim() ||
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
      '';

    if (!activeClientId) {
      setShowClientIdConfig(true);
      setGoogleAuthError(
        'Para abrir a janela oficial do Google, informe o Client ID da sua aplicação Web (veja o passo a passo abaixo).'
      );
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
        message:
          'Conecte sua Conta Google oficial ou insira uma chave de API Gemini antes de testar.',
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

  // Atualizar modelos sob demanda
  const handleRefreshModels = async () => {
    const models = await fetchAvailableGeminiModels(apiKeyInput, googleUser?.accessToken);
    setAvailableModels(models);
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
                Autentique sua conta Google real para personalizar seu perfil e usar tokens da IA
                (RF-19)
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
        <div
          style={{
            padding: '22px 24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          {/* Seção 1: Conexão Real com Conta Google (OAuth 2.0) */}
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '18px',
              padding: '18px',
              border: '1px solid var(--border-color)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '14px',
              }}
            >
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
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                  Conta Google do Usuário
                </span>
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
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  OAuth 2.0 Oficial
                </span>
              )}
            </div>

            {googleUser || isEditingProfileManual ? (
              <GoogleUserProfileCard
                googleUser={googleUser!}
                onDisconnect={handleDisconnectGoogle}
                isEditingManual={isEditingProfileManual}
                onToggleEditManual={setIsEditingProfileManual}
                manualName={manualName}
                manualEmail={manualEmail}
                onManualNameChange={setManualName}
                onManualEmailChange={setManualEmail}
                onSaveManualProfile={handleSaveManualProfile}
              />
            ) : (
              <GoogleOAuthConnectSection
                onStartOAuth={handleStartGoogleOAuth}
                isLoggingIn={isLoggingInGoogle}
                errorMessage={googleAuthError}
                showClientIdConfig={showClientIdConfig}
                onToggleShowClientIdConfig={() => setShowClientIdConfig(!showClientIdConfig)}
                onOpenManualProfile={() => setIsEditingProfileManual(true)}
                clientIdInput={clientIdInput}
                onClientIdInputChange={setClientIdInput}
                currentOrigin={currentOrigin}
                copiedOrigin={copiedOrigin}
                onCopyOrigin={handleCopyOrigin}
              />
            )}
          </div>

          {/* Seção 2: Chave de API Google Gemini & Modelos (IA Generativa) */}
          <GeminiApiKeySection
            apiKeyInput={apiKeyInput}
            onApiKeyChange={setApiKeyInput}
            showKey={showKey}
            onToggleShowKey={() => setShowKey(!showKey)}
            isGoogleConnected={!!googleUser?.accessToken}
            selectedModel={selectedModel}
            onSelectModel={setSelectedModel}
            availableModels={availableModels}
            onRefreshModels={handleRefreshModels}
            testResult={testResult}
            isTesting={isTesting}
            onTestConnection={handleTestConnection}
          />
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
