'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { useFlowStore, initializeDbStore } from '../store/useFlowStore';
import { Header } from '../components/Header';
import { DailyStatsBar } from '../components/DailyStatsBar';
import { CategoryFilter } from '../components/CategoryFilter';
import { TaskStream } from '../components/TaskStream';
import { TimelineView } from '../components/TimelineView';
import { CalendarMonthView } from '../components/CalendarMonthView';
import { TaskModal } from '../components/TaskModal';
import { TaskDetailModal } from '../components/TaskDetailModal';
import { DashboardView } from '../components/DashboardView';
import { BacklogView } from '../components/BacklogView';
import { PomodoroView } from '../components/PomodoroView';
import { NotepadView } from '../components/NotepadView';
import { AiAssistantView } from '../components/AiAssistantView';
import { ManageRoutinesModal } from '../components/ManageRoutinesModal';
import { ManageCategoriesModal } from '../components/ManageCategoriesModal';
import { NotificationSettingsModal } from '../components/NotificationSettingsModal';
import { BackupModal } from '../components/BackupModal';
import { UpdateModal } from '../components/UpdateModal';
import { GoogleAuthModal } from '../components/GoogleAuthModal';
import { InAppNotificationToast } from '../components/InAppNotificationToast';
import { OnboardingWizard } from '../components/OnboardingWizard';
import { GlobalSearchModal } from '../components/GlobalSearchModal';
import { Snackbar } from '../components/Snackbar';
import { CustomTitleBar } from '../components/CustomTitleBar';
import { useGlobalShortcuts } from '../hooks/useGlobalShortcuts';
import { useReminderScheduler } from '../services/reminderScheduler';
import { useDailyBackupScheduler } from '../hooks/useDailyBackupScheduler';
import { useUpdateChecker } from '../hooks/useUpdateChecker';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Sparkles, Compass, RefreshCw, Database, Clock, List } from 'lucide-react';

export default function Home() {
  // Atalhos Globais de Teclado, Lembretes Nativos & Auto-Updater
  useGlobalShortcuts();
  useReminderScheduler();
  useUpdateChecker();

  const activeView = useFlowStore((s) => s.activeView);
  const tasks = useFlowStore((s) => s.tasks);
  const routineTypes = useFlowStore((s) => s.routineTypes);
  const selectedRoutineTypeId = useFlowStore((s) => s.selectedRoutineTypeId);
  const selectedDate = useFlowStore((s) => s.selectedDate);
  const activeCategoryId = useFlowStore((s) => s.activeCategoryIdFilter);
  const resetToTemplate = useFlowStore((s) => s.resetToTemplate);
  const tickPomodoro = useFlowStore((s) => s.tickPomodoro);
  const isPomodoroActive = useFlowStore((s) => s.pomodoro.isActive);
  const routineViewMode = useFlowStore((s) => s.routineViewMode || 'stream');
  const setRoutineViewMode = useFlowStore((s) => s.setRoutineViewMode);
  const [isDbReady, setIsDbReady] = useState(false);
  const openBackupModal = useFlowStore((s) => s.openBackupModal);
  const openOnboardingModal = useFlowStore((s) => s.openOnboardingModal);
  const backupSettings = useFlowStore((s) => s.backupSettings);

  // Inicializa rotina diária de backup quando o banco de dados estiver pronto
  useDailyBackupScheduler(isDbReady);

  // Inicializa o Banco de Dados Nativo (Tauri SQLite)
  useEffect(() => {
    initializeDbStore().then(() => {
      setIsDbReady(true);
    });
  }, []);

  // Background ticker para Pomodoro ativo (RF-7 / RF-13)
  useEffect(() => {
    if (!isPomodoroActive) return;
    const interval = setInterval(() => {
      tickPomodoro();
    }, 1000);
    return () => clearInterval(interval);
  }, [isPomodoroActive, tickPomodoro]);

  // Listener para capturar token se aberto como popup de OAuth 2.0
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash.includes('access_token=')) {
      try {
        const params = new URLSearchParams(window.location.hash.substring(1));
        const token = params.get('access_token');
        if (token && window.opener) {
          window.opener.postMessage({ type: 'GOOGLE_OAUTH_TOKEN', token }, window.location.origin);
          window.close();
        }
      } catch (e) {
        // Ignora
      }
    }
  }, []);

  const currentRoutineType =
    routineTypes.find((rt) => rt.id === selectedRoutineTypeId) || routineTypes[0];

  // Filtragem e ordenação cronológica síncrona (com suporte estrito a data específica)
  const currentDayOfWeek = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    return new Date(y, m - 1, d).getDay();
  }, [selectedDate]);

  const filteredTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        const matchesRoutine = t.routineTypeId === selectedRoutineTypeId;
        const matchesCategory = activeCategoryId === 'all' || t.categoryId === activeCategoryId;
        if (!matchesRoutine || !matchesCategory) return false;

        // Se a tarefa foi agendada para uma data específica (ex: 2026-09-25)
        if (t.specificDate) {
          return t.specificDate === selectedDate;
        }

        // Se for hábito recorrente
        return t.daysOfWeek.includes(currentDayOfWeek);
      })
      .sort((a, b) => {
        const [ah, am] = a.startTime.split(':').map(Number);
        const [bh, bm] = b.startTime.split(':').map(Number);
        return ah * 60 + am - (bh * 60 + bm);
      });
  }, [tasks, selectedRoutineTypeId, currentDayOfWeek, activeCategoryId, selectedDate]);

  if (!isDbReady) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Sincronizando banco de dados...</p>
      </div>
    );
  }

  const isWideView = ['calendar', 'timeline', 'dashboard', 'notes'].includes(activeView);

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '60px' }}>
      {/* Barra de Título Customizada Frameless (Desktop Tauri) */}
      <CustomTitleBar />

      {/* Header Sticky */}
      <Header />

      <main
        data-testid="app-main-container"
        className={`responsive-main ${isWideView ? 'responsive-main-wide' : ''}`}
      >
        {/* Renderização Condicional da View Selecionada com Isolamento de Falhas */}
        {activeView === 'dashboard' && (
          <ErrorBoundary viewName="Painel de Métricas">
            <DashboardView />
          </ErrorBoundary>
        )}

        {activeView === 'backlog' && (
          <ErrorBoundary viewName="Lista de Pendências">
            <BacklogView />
          </ErrorBoundary>
        )}

        {activeView === 'pomodoro' && (
          <ErrorBoundary viewName="Temporizador Pomodoro">
            <PomodoroView />
          </ErrorBoundary>
        )}

        {activeView === 'notes' && (
          <ErrorBoundary viewName="Bloco de Notas">
            <NotepadView />
          </ErrorBoundary>
        )}

        {activeView === 'ai' && (
          <ErrorBoundary viewName="Assistente Inteligente">
            <AiAssistantView />
          </ErrorBoundary>
        )}

        {activeView === 'timeline' && (
          <ErrorBoundary viewName="Cronograma Visual">
            <TimelineView showViewToggle={false} />
          </ErrorBoundary>
        )}

        {activeView === 'calendar' && (
          <ErrorBoundary viewName="Calendário Mensal">
            <CalendarMonthView />
          </ErrorBoundary>
        )}

        {activeView === 'routine' && (
          <ErrorBoundary viewName="Rotina Diária">
            {/* Daily Stats Bar */}
            <DailyStatsBar />

            {/* Philosophy Card - Dinâmico por Tipo de Rotina */}
            <div style={{ padding: '0 var(--content-padding-x, 28px) 12px' }}>
              <div
                style={{
                  padding: '12px 18px',
                  borderRadius: '16px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Compass size={17} color="var(--accent-primary)" />
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>
                      {currentRoutineType?.name}:
                    </span>{' '}
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {currentRoutineType?.description}
                    </span>
                  </div>
                </div>
                {currentRoutineType?.philosophy && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontStyle: 'italic',
                      color: 'var(--text-muted)',
                    }}
                  >
                    &ldquo;{currentRoutineType.philosophy}&rdquo;
                  </span>
                )}
              </div>
            </div>

            {/* Category Filters */}
            <CategoryFilter />

            {/* Alternância entre Fluxo de Tarefas e Cronograma Visual */}
            {routineViewMode === 'timeline' ? (
              <TimelineView showViewToggle={true} />
            ) : (
              <div style={{ padding: '8px var(--content-padding-x, 28px)' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    marginBottom: '8px',
                  }}
                >
                  <div
                    data-testid="routine-mode-switch"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      background: 'var(--bg-elevated)',
                      padding: '2px',
                      borderRadius: '9999px',
                      border: '1px solid var(--border-subtle)',
                      gap: '2px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setRoutineViewMode?.('stream')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        border: 'none',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <List size={12} />
                      <span>Lista</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoutineViewMode?.('timeline')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        border: 'none',
                        fontSize: '11px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        background: 'transparent',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <Clock size={12} />
                      <span>Cronograma</span>
                    </button>
                  </div>
                </div>

                <TaskStream tasks={filteredTasks} />
              </div>
            )}
          </ErrorBoundary>
        )}

        {/* Footer info & restore */}
        <div
          style={{
            marginTop: '36px',
            padding: '16px var(--content-padding-x, 28px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid var(--border-subtle)',
            fontSize: '12px',
            color: 'var(--text-muted)',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Flow App — SQLite Relacional & Rotinas Customizáveis</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <button
              onClick={() => openBackupModal()}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                fontWeight: 600,
              }}
              title="Gerenciar backups do banco de dados SQLite"
            >
              <Database size={13} color="var(--accent-primary)" />
              <span>
                Backup SQLite:{' '}
                {backupSettings?.lastBackupDate
                  ? `Último em ${backupSettings.lastBackupDate}`
                  : 'Configurar'}
              </span>
            </button>

            <button
              onClick={() => openOnboardingModal()}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                fontWeight: 600,
              }}
              title="Personalizar rotina inicial, objetivo e preferências no Onboarding Wizard"
            >
              <Sparkles size={12} color="var(--accent-primary)" />
              <span>Setup Inicial & Templates</span>
            </button>

            <button
              onClick={() => {
                if (
                  window.confirm(
                    'Deseja restaurar as rotinas e categorias padrão? Seus dados serão redefinidos para os modelos iniciais.'
                  )
                ) {
                  resetToTemplate();
                }
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              <RefreshCw size={12} />
              <span>Restaurar Template Padrão</span>
            </button>
          </div>
        </div>
      </main>

      {/* Modais Globais de Controle */}
      <TaskModal />
      <TaskDetailModal />
      <ManageRoutinesModal />
      <ManageCategoriesModal />
      <NotificationSettingsModal />
      <BackupModal />
      <UpdateModal />
      <GoogleAuthModal />
      <InAppNotificationToast />
      <Snackbar />
      <OnboardingWizard />
      <GlobalSearchModal />
    </div>
  );
}
