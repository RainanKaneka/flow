'use client';

import React, { useState, useEffect } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import {
  notificationService,
  NotificationPermissionStatus,
  isTauriEnvironment,
} from '../services/notificationService';
import {
  Bell,
  X,
  Volume2,
  VolumeX,
  Clock,
  CheckCircle2,
  AlertCircle,
  Command,
  Sparkles,
  RefreshCw,
  ArrowUpRight,
} from 'lucide-react';
import { useUpdateChecker } from '../hooks/useUpdateChecker';
import { sounds } from '../utils/audio';
import { CURRENT_APP_VERSION } from '../services/updateService';

export const NotificationSettingsModal: React.FC = () => {
  const isNotificationModalOpen = useFlowStore((s) => s.isNotificationModalOpen);
  const closeNotificationModal = useFlowStore((s) => s.closeNotificationModal);
  const reminderSettings = useFlowStore((s) => s.reminderSettings);
  const updateReminderSettings = useFlowStore((s) => s.updateReminderSettings);

  const { isChecking, lastCheckMessage, checkManually, availableUpdate } = useUpdateChecker();

  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus>('default');
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    if (isNotificationModalOpen) {
      setPermissionStatus(notificationService.getPermissionStatus());
      setTestSent(false);
    }
  }, [isNotificationModalOpen]);

  if (!isNotificationModalOpen) return null;

  const handleToggleEnabled = async () => {
    const nextState = !reminderSettings.enabled;
    if (nextState && permissionStatus !== 'granted') {
      const granted = await notificationService.requestPermission();
      setPermissionStatus(granted ? 'granted' : 'denied');
    }
    updateReminderSettings({ enabled: nextState });
  };

  const handleTestNotification = async () => {
    if (permissionStatus !== 'granted') {
      const granted = await notificationService.requestPermission();
      setPermissionStatus(granted ? 'granted' : 'denied');
      if (!granted && !isTauriEnvironment()) return;
    }

    await notificationService.sendNotification({
      title: 'Flow — Notificação de Teste',
      body: 'Seus lembretes de rotina do Windows estão funcionando perfeitamente!',
      playSound: reminderSettings.soundEnabled,
    });

    setTestSent(true);
    setTimeout(() => setTestSent(false), 4000);
  };

  const advanceOptions = [
    { value: 0, label: 'No horário exato', desc: '0 min' },
    { value: 5, label: '5 min antes', desc: 'Recomendado' },
    { value: 10, label: '10 min antes', desc: 'Preparação' },
    { value: 15, label: '15 min antes', desc: 'Antecipado' },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeNotificationModal();
      }}
    >
      <div
        className="double-bezel-outer"
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div
          className="double-bezel-inner"
          style={{
            padding: '28px',
            position: 'relative',
          }}
        >
          {/* Close Button */}
          <button
            onClick={closeNotificationModal}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 200ms',
            }}
          >
            <X size={16} />
          </button>

          {/* Modal Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(99, 102, 241, 0.12)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bell size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.02em' }}>
                Lembretes & Experiência Desktop
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Notificações nativas do Windows e atalhos de alta performance (RF-12)
              </p>
            </div>
          </div>

          {/* Status de Permissões do Sistema */}
          <div
            style={{
              marginTop: '16px',
              padding: '12px 16px',
              borderRadius: '12px',
              backgroundColor:
                permissionStatus === 'granted'
                  ? 'rgba(16, 185, 129, 0.08)'
                  : permissionStatus === 'denied'
                    ? 'rgba(239, 68, 68, 0.08)'
                    : 'rgba(99, 102, 241, 0.08)',
              border: `1px solid ${
                permissionStatus === 'granted'
                  ? 'rgba(16, 185, 129, 0.25)'
                  : permissionStatus === 'denied'
                    ? 'rgba(239, 68, 68, 0.25)'
                    : 'rgba(99, 102, 241, 0.25)'
              }`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {permissionStatus === 'granted' ? (
                <CheckCircle2 size={16} color="#10B981" />
              ) : (
                <AlertCircle
                  size={16}
                  color={permissionStatus === 'denied' ? '#EF4444' : 'var(--accent-primary)'}
                />
              )}
              <span style={{ fontSize: '12px', fontWeight: 600 }}>
                {permissionStatus === 'granted' &&
                  (isTauriEnvironment()
                    ? 'Notificações Nativas do Windows Ativas (Modo Desktop)'
                    : 'Notificações Nativas Ativas')}
                {permissionStatus === 'denied' && 'Notificações Bloqueadas no Sistema'}
                {permissionStatus === 'default' && 'Permissão do Sistema Pendente'}
              </span>
            </div>

            {permissionStatus !== 'granted' && (
              <button
                onClick={async () => {
                  const granted = await notificationService.requestPermission();
                  setPermissionStatus(granted ? 'granted' : 'denied');
                }}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--accent-primary)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Solicitar Autorização
              </button>
            )}
          </div>

          {/* Configurações Principais */}
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Toggle Lembretes Ativos */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: '12px',
                backgroundColor: 'var(--bg-elevated)',
              }}
            >
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>Ativar Lembretes de Tarefas</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Avisa quando uma atividade da sua rotina estiver prestes a iniciar
                </div>
              </div>

              <button
                onClick={handleToggleEnabled}
                style={{
                  width: '44px',
                  height: '24px',
                  borderRadius: '12px',
                  backgroundColor: reminderSettings.enabled
                    ? 'var(--accent-primary)'
                    : 'var(--border-focus)',
                  border: 'none',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'all 200ms',
                }}
              >
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: '#FFFFFF',
                    position: 'absolute',
                    top: '3px',
                    left: reminderSettings.enabled ? '23px' : '3px',
                    transition: 'all 200ms',
                  }}
                />
              </button>
            </div>

            {/* Antecedência de Aviso Prévio */}
            <div>
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '8px',
                }}
              >
                <Clock size={13} />
                <span>Antecedência do Aviso Prévio:</span>
              </label>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '8px',
                }}
              >
                {advanceOptions.map((opt) => {
                  const isSelected = reminderSettings.advanceMinutes === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => updateReminderSettings({ advanceMinutes: opt.value })}
                      style={{
                        padding: '8px 6px',
                        borderRadius: '10px',
                        border: isSelected
                          ? '1.5px solid var(--accent-primary)'
                          : '1px solid var(--border-subtle)',
                        backgroundColor: isSelected
                          ? 'rgba(99, 102, 241, 0.1)'
                          : 'var(--bg-elevated)',
                        color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 150ms',
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: 700 }}>{opt.label}</div>
                      <div
                        style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}
                      >
                        {opt.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Som da Notificação */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: '12px',
                backgroundColor: 'var(--bg-elevated)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {reminderSettings.soundEnabled ? (
                  <Volume2 size={16} color="var(--accent-primary)" />
                ) : (
                  <VolumeX size={16} color="var(--text-muted)" />
                )}
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>Sinal Sonoro Suave</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Chime harmônico sintetizado nativamente (sem barulhos estridentes)
                  </div>
                </div>
              </div>

              <button
                onClick={() =>
                  updateReminderSettings({ soundEnabled: !reminderSettings.soundEnabled })
                }
                style={{
                  width: '44px',
                  height: '24px',
                  borderRadius: '12px',
                  backgroundColor: reminderSettings.soundEnabled
                    ? 'var(--accent-primary)'
                    : 'var(--border-focus)',
                  border: 'none',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'all 200ms',
                }}
              >
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: '#FFFFFF',
                    position: 'absolute',
                    top: '3px',
                    left: reminderSettings.soundEnabled ? '23px' : '3px',
                    transition: 'all 200ms',
                  }}
                />
              </button>
            </div>

            {/* Botão de Teste Imediato */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={handleTestNotification}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '10px',
                  backgroundColor: testSent ? 'var(--success)' : 'var(--bg-elevated)',
                  border: '1px solid var(--border-focus)',
                  color: testSent ? '#FFFFFF' : 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  transition: 'all 200ms',
                }}
              >
                {testSent ? (
                  <>
                    <CheckCircle2 size={14} />
                    <span>Notificação Enviada com Sucesso!</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} color="var(--accent-primary)" />
                    <span>Testar Notificação Agora</span>
                  </>
                )}
              </button>
            </div>

            {/* Atualizações do Aplicativo (Releases) */}
            <div
              style={{
                padding: '14px',
                borderRadius: '12px',
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <RefreshCw size={14} color="var(--accent-primary)" />
                    <span>Atualizações do Aplicativo</span>
                  </div>
                  <div
                    style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}
                  >
                    Versão atual instalada: <strong>v{CURRENT_APP_VERSION}</strong>
                  </div>
                </div>

                <button
                  onClick={checkManually}
                  disabled={isChecking}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-focus)',
                    color: 'var(--text-primary)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: isChecking ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    opacity: isChecking ? 0.6 : 1,
                  }}
                >
                  <RefreshCw size={12} className={isChecking ? 'spin' : ''} />
                  <span>{isChecking ? 'Verificando...' : 'Verificar Atualizações'}</span>
                </button>
              </div>

              {lastCheckMessage && (
                <div
                  style={{
                    marginTop: '8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: availableUpdate?.hasUpdate ? '#10B981' : 'var(--text-secondary)',
                  }}
                >
                  {lastCheckMessage}
                </div>
              )}
            </div>

            {/* Guia de Atalhos Globais do Sistema */}
            <div
              style={{
                marginTop: '10px',
                padding: '14px',
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '10px',
                }}
              >
                <Command size={12} />
                <span>Atalhos Rápidos de Teclado</span>
              </div>

              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Alternar Abas (Rotina, Pomodoro, Notas, Backlog, Dashboard)
                  </span>
                  <kbd
                    style={{
                      padding: '2px 6px',
                      background: 'var(--bg-elevated)',
                      borderRadius: '4px',
                      border: '1px solid var(--border-focus)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    1 a 5
                  </kbd>
                </div>
                <div
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <span style={{ color: 'var(--text-secondary)' }}>Iniciar / Pausar Pomodoro</span>
                  <kbd
                    style={{
                      padding: '2px 6px',
                      background: 'var(--bg-elevated)',
                      borderRadius: '4px',
                      border: '1px solid var(--border-focus)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    Espaço
                  </kbd>
                </div>
                <div
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <span style={{ color: 'var(--text-secondary)' }}>Nova Atividade</span>
                  <kbd
                    style={{
                      padding: '2px 6px',
                      background: 'var(--bg-elevated)',
                      borderRadius: '4px',
                      border: '1px solid var(--border-focus)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    Ctrl + N
                  </kbd>
                </div>
                <div
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <span style={{ color: 'var(--text-secondary)' }}>Fechar Modais / Janelas</span>
                  <kbd
                    style={{
                      padding: '2px 6px',
                      background: 'var(--bg-elevated)',
                      borderRadius: '4px',
                      border: '1px solid var(--border-focus)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    Esc
                  </kbd>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
