'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import {
  X,
  User,
  Settings,
  Award,
  Sparkles,
  Camera,
  Check,
  CheckCircle2,
  Moon,
  Sun,
  Timer,
  Volume2,
  Bell,
  Cloud,
  CloudCheck,
  Zap,
  Target,
  Clock,
  Flame,
  TrendingUp,
  Folder,
} from 'lucide-react';
import {
  AVATAR_PRESETS,
  getPresetById,
  calculateProfileStats,
  userProfileService,
  AvatarPresetOption,
} from '../services/userProfileService';
import { sounds } from '../utils/audio';

type TabType = 'perfil' | 'configuracoes' | 'estatisticas';

export const UserProfileModal: React.FC = () => {
  const isProfileModalOpen = useFlowStore((s) => s.isProfileModalOpen);
  const closeProfileModal = useFlowStore((s) => s.closeProfileModal);

  const userProfile = useFlowStore((s) => s.userProfile);
  const updateUserProfile = useFlowStore((s) => s.updateUserProfile);

  const theme = useFlowStore((s) => s.theme);
  const toggleTheme = useFlowStore((s) => s.toggleTheme);

  const pomodoro = useFlowStore((s) => s.pomodoro);
  const setPomodoroDuration = useFlowStore((s) => s.setPomodoroDuration);

  const reminderSettings = useFlowStore((s) => s.reminderSettings);
  const updateReminderSettings = useFlowStore((s) => s.updateReminderSettings);

  const tasks = useFlowStore((s) => s.tasks);
  const logs = useFlowStore((s) => s.logs);
  const categories = useFlowStore((s) => s.categories);

  const firebaseUser = useFlowStore((s) => s.firebaseUser);
  const googleUser = useFlowStore((s) => s.googleUser);
  const openAuthSyncModal = useFlowStore((s) => s.openAuthSyncModal);
  const showSnackbar = useFlowStore((s) => s.showSnackbar);

  const [activeTab, setActiveTab] = useState<TabType>('perfil');

  // Form states
  const [name, setName] = useState('');
  const [objective, setObjective] = useState('');
  const [bio, setBio] = useState('');
  const [avatarPreset, setAvatarPreset] = useState('spark');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'premium'>('free');
  const [isSaved, setIsSaved] = useState(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carrega valores quando o modal é aberto
  useEffect(() => {
    if (isProfileModalOpen) {
      setName(userProfile?.name || firebaseUser?.displayName || googleUser?.name || '');
      setObjective(userProfile?.objective || 'Alta performance & foco diário');
      setBio(userProfile?.bio || '');
      setAvatarPreset(userProfile?.avatarPreset || 'spark');
      setAvatarUrl(userProfile?.avatarUrl || '');
      setSelectedPlan(userProfile?.plan || 'free');
      setIsSaved(false);
    }
  }, [isProfileModalOpen]);

  // Tecla ESC para fechar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isProfileModalOpen) {
        closeProfileModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isProfileModalOpen, closeProfileModal]);

  // Estatísticas calculadas dinamicamente
  const stats = useMemo(() => {
    return calculateProfileStats(tasks, logs, pomodoro, categories);
  }, [tasks, logs, pomodoro, categories]);

  if (!isProfileModalOpen) return null;

  const activePreset = getPresetById(avatarPreset);

  const handleSaveProfile = async () => {
    const updatedData = {
      name: name.trim() || 'Usuário Flow',
      objective: objective.trim(),
      bio: bio.trim(),
      avatarPreset,
      avatarUrl: avatarUrl.trim() || undefined,
      plan: selectedPlan,
      themePreference: theme,
      pomodoroMinutes: Math.round(pomodoro.totalDurationSeconds / 60),
      soundEnabled: reminderSettings.soundEnabled,
      remindersEnabled: reminderSettings.enabled,
    };

    updateUserProfile(updatedData);
    sounds.playCheck();
    setIsSaved(true);
    showSnackbar('Perfil e configurações atualizados com sucesso!');

    // Se conectado ao Firebase, sincroniza com o Firestore
    if (firebaseUser?.uid) {
      setIsSyncingCloud(true);
      try {
        await userProfileService.saveUserProfileToCloud(firebaseUser.uid, {
          ...updatedData,
          aiQuota: userProfile?.aiQuota,
          premiumSince: userProfile?.premiumSince,
          premiumUntil: userProfile?.premiumUntil,
          createdAt: userProfile?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } finally {
        setIsSyncingCloud(false);
      }
    }

    setTimeout(() => {
      setIsSaved(false);
    }, 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Converte para Base64 Data URL (redimensionado se necessário)
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setAvatarUrl(result);
        sounds.playHapticClick();
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUseGoogleAvatar = () => {
    if (googleUser?.avatarUrl) {
      setAvatarUrl(googleUser.avatarUrl);
      sounds.playHapticClick();
      showSnackbar('Foto do Google importada!');
    }
  };

  const handleUseFirebaseAvatar = () => {
    if (firebaseUser?.photoURL) {
      setAvatarUrl(firebaseUser.photoURL);
      sounds.playHapticClick();
      showSnackbar('Foto do Firebase importada!');
    }
  };

  const handleTestZenSound = () => {
    sounds.playZenChime();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-profile-modal-title"
      data-testid="user-profile-modal-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 200ms var(--bezier-haptic)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closeProfileModal();
        }
      }}
    >
      <div
        data-testid="user-profile-modal-content"
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '24px',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.6), 0 0 0 1px var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideUp 220ms var(--bezier-haptic)',
        }}
      >
        {/* Header com Avatar Hero e Status */}
        <div
          style={{
            padding: '24px 28px 16px',
            backgroundColor: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-subtle)',
            position: 'relative',
          }}
        >
          {/* Botão Fechar */}
          <button
            onClick={closeProfileModal}
            data-testid="close-profile-modal-btn"
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 150ms var(--bezier-haptic)',
            }}
            title="Fechar (Esc)"
          >
            <X size={16} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
            {/* Avatar em Destaque */}
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                background: avatarUrl ? 'transparent' : activePreset.bgGradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.35)',
                border: '3px solid var(--bg-primary)',
                outline: '2px solid var(--accent-primary)',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={avatarUrl}
                  alt={name || 'Avatar'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span>{activePreset.emoji}</span>
              )}
            </div>

            {/* Informações Resumidas */}
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2
                  id="user-profile-modal-title"
                  style={{
                    margin: 0,
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  {name || 'Meu Perfil'}
                </h2>

                {/* Badge do Plano */}
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    backgroundColor: selectedPlan === 'premium' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                    color: selectedPlan === 'premium' ? 'var(--accent-primary)' : 'var(--text-muted)',
                    border: selectedPlan === 'premium' ? '1px solid rgba(99, 102, 241, 0.35)' : '1px solid var(--border-subtle)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {selectedPlan === 'premium' ? <Zap size={11} /> : null}
                  {selectedPlan === 'premium' ? 'Flow Pro' : 'Gratuito'}
                </span>
              </div>

              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: '0.82rem',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>{objective || 'Defina seu objetivo'}</span>
                <span>•</span>
                <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                  Nível {stats.productivityLevel.levelNumber} ({stats.productivityLevel.title})
                </span>
              </p>
            </div>
          </div>

          {/* Abas de Navegação */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              marginTop: '20px',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '14px',
            }}
          >
            <button
              onClick={() => setActiveTab('perfil')}
              data-testid="tab-profile-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: activeTab === 'perfil' ? 'var(--accent-primary)' : 'transparent',
                color: activeTab === 'perfil' ? '#FFF' : 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 150ms var(--bezier-haptic)',
              }}
            >
              <User size={15} />
              <span>Perfil & Avatar</span>
            </button>

            <button
              onClick={() => setActiveTab('configuracoes')}
              data-testid="tab-settings-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: activeTab === 'configuracoes' ? 'var(--accent-primary)' : 'transparent',
                color: activeTab === 'configuracoes' ? '#FFF' : 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 150ms var(--bezier-haptic)',
              }}
            >
              <Settings size={15} />
              <span>Configurações</span>
            </button>

            <button
              onClick={() => setActiveTab('estatisticas')}
              data-testid="tab-stats-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: activeTab === 'estatisticas' ? 'var(--accent-primary)' : 'transparent',
                color: activeTab === 'estatisticas' ? '#FFF' : 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 150ms var(--bezier-haptic)',
              }}
            >
              <Award size={15} />
              <span>Estatísticas & Conquistas</span>
            </button>
          </div>
        </div>

        {/* Corpo do Modal com Scroll Suave */}
        <div
          style={{
            padding: '24px 28px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* TAB 1: PERFIL & AVATAR */}
          {activeTab === 'perfil' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              {/* Seção 1: Seleção de Avatar */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--text-muted)',
                    marginBottom: '10px',
                  }}
                >
                  Escolha seu Avatar ou Estilo Visual
                </label>

                {/* Grid de 8 Presets */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(68px, 1fr))',
                    gap: '10px',
                    marginBottom: '14px',
                  }}
                >
                  {AVATAR_PRESETS.map((preset: AvatarPresetOption) => {
                    const isSelected = !avatarUrl && avatarPreset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setAvatarPreset(preset.id);
                          setAvatarUrl('');
                          sounds.playHapticClick();
                        }}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          padding: '8px 4px',
                          borderRadius: '16px',
                          backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-secondary)',
                          border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                          cursor: 'pointer',
                          transition: 'all 150ms var(--bezier-haptic)',
                        }}
                        title={`${preset.label} — ${preset.description}`}
                      >
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            background: preset.bgGradient,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            boxShadow: isSelected ? '0 0 12px rgba(99, 102, 241, 0.4)' : 'none',
                          }}
                        >
                          {preset.emoji}
                        </div>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: isSelected ? 700 : 500,
                            color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                          }}
                        >
                          {preset.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Opções de Foto Personalizada / Importação */}
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '14px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Camera size={16} color="var(--accent-primary)" />
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>Foto Customizada:</span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*"
                      style={{ display: 'none' }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                      }}
                    >
                      Carregar Imagem...
                    </button>

                    {googleUser?.avatarUrl && (
                      <button
                        type="button"
                        onClick={handleUseGoogleAvatar}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          backgroundColor: 'rgba(99, 102, 241, 0.1)',
                          border: '1px solid rgba(99, 102, 241, 0.25)',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: 'var(--accent-primary)',
                          cursor: 'pointer',
                        }}
                      >
                        Usar do Google
                      </button>
                    )}

                    {firebaseUser?.photoURL && (
                      <button
                        type="button"
                        onClick={handleUseFirebaseAvatar}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          backgroundColor: 'rgba(16, 185, 129, 0.1)',
                          border: '1px solid rgba(16, 185, 129, 0.25)',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#10B981',
                          cursor: 'pointer',
                        }}
                      >
                        Usar do Firebase
                      </button>
                    )}

                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarUrl('');
                          sounds.playHapticClick();
                        }}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '8px',
                          backgroundColor: 'transparent',
                          border: '1px solid var(--border-subtle)',
                          fontSize: '11px',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                        }}
                      >
                        Remover Foto
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Seção 2: Informações de Texto */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label
                    htmlFor="profile-name-input"
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'var(--text-secondary)',
                      marginBottom: '6px',
                    }}
                  >
                    Nome de Exibição
                  </label>
                  <input
                    id="profile-name-input"
                    data-testid="profile-name-input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome ou apelido"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label
                    htmlFor="profile-objective-input"
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'var(--text-secondary)',
                      marginBottom: '6px',
                    }}
                  >
                    Objetivo Principal / Propósito da Rotina
                  </label>
                  <input
                    id="profile-objective-input"
                    data-testid="profile-objective-input"
                    type="text"
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    placeholder="Ex: Foco implacável em estudos, Equilíbrio & Saúde"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label
                    htmlFor="profile-bio-input"
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'var(--text-secondary)',
                      marginBottom: '6px',
                    }}
                  >
                    Bio / Lema Pessoal (Opcional)
                  </label>
                  <textarea
                    id="profile-bio-input"
                    data-testid="profile-bio-input"
                    rows={2}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Uma frase ou reflexão que guia seu dia a dia..."
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      outline: 'none',
                      resize: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONFIGURAÇÕES & PREFERÊNCIAS */}
          {activeTab === 'configuracoes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Configuração 1: Tema */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '16px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {theme === 'dark' ? <Moon size={16} color="var(--accent-primary)" /> : <Sun size={16} color="#F59E0B" />}
                    <span style={{ fontSize: '14px', fontWeight: 700 }}>Tema Visual</span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {theme === 'dark' ? 'Modo Escuro OLED (#08080A)' : 'Modo Claro Suave'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    toggleTheme();
                    sounds.playHapticClick();
                  }}
                  data-testid="profile-theme-toggle-btn"
                  style={{
                    padding: '8px 14px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Alternar para {theme === 'dark' ? 'Claro' : 'Escuro'}
                </button>
              </div>

              {/* Configuração 2: Pomodoro Padrão */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '16px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Timer size={16} color="var(--accent-primary)" />
                    <span style={{ fontSize: '14px', fontWeight: 700 }}>Duração Padrão do Pomodoro</span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Tempo de foco selecionado: {Math.round(pomodoro.totalDurationSeconds / 60)} minutos
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  {[15, 25, 45, 50].map((dur) => {
                    const isCurrent = Math.round(pomodoro.totalDurationSeconds / 60) === dur;
                    return (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => {
                          setPomodoroDuration(dur * 60);
                          sounds.playHapticClick();
                        }}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '8px',
                          backgroundColor: isCurrent ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                          color: isCurrent ? '#FFF' : 'var(--text-secondary)',
                          border: isCurrent ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {dur}m
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Configuração 3: Feedback Sensorial & Áudio */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '16px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Volume2 size={16} color="var(--accent-primary)" />
                    <span style={{ fontSize: '14px', fontWeight: 700 }}>Feedback Sensorial (Tigela Tibetana 528Hz)</span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Sons harmônicos sintetizados ao concluir tarefas e transição de foco
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleTestZenSound}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(99, 102, 241, 0.1)',
                      border: '1px solid rgba(99, 102, 241, 0.25)',
                      color: 'var(--accent-primary)',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Ouvir Som Zen
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      updateReminderSettings({ soundEnabled: !reminderSettings.soundEnabled });
                      sounds.playHapticClick();
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      backgroundColor: reminderSettings.soundEnabled ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                      color: reminderSettings.soundEnabled ? '#FFF' : 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {reminderSettings.soundEnabled ? 'Ativado' : 'Silenciado'}
                  </button>
                </div>
              </div>

              {/* Configuração 4: Lembretes Nativos */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '16px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Bell size={16} color="var(--accent-primary)" />
                    <span style={{ fontSize: '14px', fontWeight: 700 }}>Notificações de Início de Tarefa</span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Alerta nativo no Windows com {reminderSettings.advanceMinutes} min de antecedência
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    updateReminderSettings({ enabled: !reminderSettings.enabled });
                    sounds.playHapticClick();
                  }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    backgroundColor: reminderSettings.enabled ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                    color: reminderSettings.enabled ? '#FFF' : 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {reminderSettings.enabled ? 'Ativo' : 'Desativado'}
                </button>
              </div>

              {/* Configuração 5: Sincronização & Conta Firebase */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '16px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {firebaseUser ? <CloudCheck size={16} color="#10B981" /> : <Cloud size={16} color="var(--text-secondary)" />}
                    <span style={{ fontSize: '14px', fontWeight: 700 }}>Sincronização em Nuvem (Firebase)</span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {firebaseUser
                      ? `Conectado como: ${firebaseUser.displayName || firebaseUser.email || 'Convidado'}`
                      : 'Nenhum usuário conectado à nuvem.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    closeProfileModal();
                    openAuthSyncModal();
                  }}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(99, 102, 241, 0.12)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    color: 'var(--accent-primary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {firebaseUser ? 'Gerenciar Conta' : 'Conectar Nuvem'}
                </button>
              </div>

              {/* Configuração 6: Plano de Assinatura & Tokens (Fase 4.3 & Fase 5) */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '16px',
                  backgroundColor: selectedPlan === 'premium' ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-secondary)',
                  border: selectedPlan === 'premium' ? '1px solid rgba(99, 102, 241, 0.35)' : '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Zap size={16} color="var(--accent-primary)" />
                    <span style={{ fontSize: '14px', fontWeight: 700 }}>
                      Plano Flow: {selectedPlan === 'premium' ? 'Pro / Premium ⚡' : 'Gratuito (Local)'}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {selectedPlan === 'premium'
                      ? 'Acesso irrestrito ao Gemini IA, replanning inteligente e nuvem.'
                      : 'Armazenamento SQLite local com backup automático.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const next = selectedPlan === 'premium' ? 'free' : 'premium';
                    setSelectedPlan(next);
                    sounds.playCheck();
                    showSnackbar(next === 'premium' ? 'Modo Flow Pro ativado!' : 'Modo Gratuito selecionado.');
                  }}
                  data-testid="toggle-plan-btn"
                  style={{
                    padding: '8px 14px',
                    borderRadius: '10px',
                    backgroundColor: selectedPlan === 'premium' ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                    color: selectedPlan === 'premium' ? '#FFF' : 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {selectedPlan === 'premium' ? 'Ativo (Pro)' : 'Ativar Modo Pro (Teste)'}
                </button>
              </div>

              {/* Informações detalhadas de Quota de IA (se houver quota registrada) */}
              {userProfile?.aiQuota && (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Consumo Mensal de IA:</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      {userProfile.aiQuota.used} / {userProfile.aiQuota.monthlyLimit} requisições
                    </span>
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: '6px',
                      backgroundColor: 'var(--bg-elevated)',
                      borderRadius: '3px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round(
                            (userProfile.aiQuota.used / (userProfile.aiQuota.monthlyLimit || 1)) * 100
                          )
                        )}%`,
                        height: '100%',
                        backgroundColor: 'var(--accent-primary)',
                        borderRadius: '3px',
                        transition: 'width 200ms ease',
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <span>Tokens: {userProfile.aiQuota.totalTokensConsumed?.toLocaleString('pt-BR') || 0}</span>
                    <span>Renovação: {userProfile.aiQuota.resetDate || 'Próximo ciclo'}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ESTATÍSTICAS & CONQUISTAS */}
          {activeTab === 'estatisticas' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Card de Nível & Gamificação */}
              <div
                style={{
                  padding: '18px 20px',
                  borderRadius: '18px',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(16, 185, 129, 0.08))',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--accent-primary)',
                        color: '#FFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '15px',
                      }}
                    >
                      {stats.productivityLevel.levelNumber}
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>
                        {stats.productivityLevel.title}
                      </h4>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Nível de Produtividade Flow
                      </span>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'var(--accent-primary)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {stats.productivityLevel.points} XP Total
                  </span>
                </div>

                {/* Barra de Progresso de XP */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                    <span>Progresso para o próximo nível</span>
                    <span>{stats.productivityLevel.progressPercentage}%</span>
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '9999px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${stats.productivityLevel.progressPercentage}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, var(--accent-primary), #10B981)',
                        borderRadius: '9999px',
                        transition: 'width 300ms var(--bezier-haptic)',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Grid com 4 Estatísticas Core */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '12px',
                }}
              >
                {/* 1. Tempo de Foco */}
                <div
                  style={{
                    padding: '14px',
                    borderRadius: '16px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-primary)' }}>
                    <Clock size={15} />
                    <span style={{ fontSize: '11px', fontWeight: 600 }}>Tempo Focado</span>
                  </div>
                  <span style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                    {stats.totalPomodoroMinutes}m
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    Sessões Pomodoro
                  </span>
                </div>

                {/* 2. Tarefas Concluídas */}
                <div
                  style={{
                    padding: '14px',
                    borderRadius: '16px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10B981' }}>
                    <CheckCircle2 size={15} />
                    <span style={{ fontSize: '11px', fontWeight: 600 }}>Concluídas</span>
                  </div>
                  <span style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                    {stats.totalTasksCompleted}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    Tarefas no histórico
                  </span>
                </div>

                {/* 3. Streak */}
                <div
                  style={{
                    padding: '14px',
                    borderRadius: '16px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#EF4444' }}>
                    <Flame size={15} />
                    <span style={{ fontSize: '11px', fontWeight: 600 }}>Sequência</span>
                  </div>
                  <span style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                    {stats.currentStreakDays} {stats.currentStreakDays === 1 ? 'dia' : 'dias'}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    Dias consecutivos
                  </span>
                </div>

                {/* 4. Eficiência */}
                <div
                  style={{
                    padding: '14px',
                    borderRadius: '16px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#F59E0B' }}>
                    <TrendingUp size={15} />
                    <span style={{ fontSize: '11px', fontWeight: 600 }}>Eficiência</span>
                  </div>
                  <span style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                    {stats.efficiencyRate}%
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    Taxa de adesão
                  </span>
                </div>
              </div>

              {/* Categoria Predominante */}
              {stats.topCategory && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '14px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Folder size={15} color={stats.topCategory.color} />
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>
                      Categoria Predominante:
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        backgroundColor: `${stats.topCategory.color}20`,
                        color: stats.topCategory.color,
                      }}
                    >
                      {stats.topCategory.name}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {stats.topCategory.count} conclusões
                  </span>
                </div>
              )}

              {/* Mural de Conquistas */}
              <div>
                <h4
                  style={{
                    margin: '0 0 10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--text-muted)',
                  }}
                >
                  Mural de Conquistas
                </h4>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: '10px',
                  }}
                >
                  {stats.achievements.map((ach) => (
                    <div
                      key={ach.id}
                      style={{
                        padding: '12px',
                        borderRadius: '14px',
                        backgroundColor: ach.unlocked ? 'var(--bg-secondary)' : 'rgba(255, 255, 255, 0.02)',
                        border: ach.unlocked ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        opacity: ach.unlocked ? 1 : 0.6,
                      }}
                    >
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          backgroundColor: ach.unlocked ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-elevated)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '18px',
                          flexShrink: 0,
                        }}
                      >
                        {ach.icon}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {ach.title}
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 600,
                              color: ach.unlocked ? '#10B981' : 'var(--text-muted)',
                            }}
                          >
                            {ach.unlocked ? 'Desbloqueado' : ach.progressText || 'Pendente'}
                          </span>
                        </div>
                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                          {ach.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer com Botão de Ação */}
        <div
          style={{
            padding: '16px 28px',
            backgroundColor: 'var(--bg-secondary)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {isSyncingCloud
              ? 'Sincronizando com a nuvem...'
              : firebaseUser
                ? 'Perfil conectado à nuvem do Firebase'
                : 'Alterações salvas localmente'}
          </span>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={closeProfileModal}
              style={{
                padding: '9px 18px',
                borderRadius: '12px',
                backgroundColor: 'transparent',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Fechar
            </button>

            <button
              type="button"
              onClick={handleSaveProfile}
              data-testid="save-profile-btn"
              style={{
                padding: '9px 22px',
                borderRadius: '12px',
                backgroundColor: isSaved ? '#10B981' : 'var(--accent-primary)',
                border: 'none',
                color: '#FFF',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 200ms var(--bezier-haptic)',
              }}
            >
              {isSaved ? <Check size={16} /> : <Sparkles size={16} />}
              <span>{isSaved ? 'Salvo!' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
