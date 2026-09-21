'use client';

import React, { useMemo, useEffect } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { Header } from '../components/Header';
import { DailyStatsBar } from '../components/DailyStatsBar';
import { CategoryFilter } from '../components/CategoryFilter';
import { TaskCard } from '../components/TaskCard';
import { TaskModal } from '../components/TaskModal';
import { TaskDetailModal } from '../components/TaskDetailModal';
import { DashboardView } from '../components/DashboardView';
import { BacklogView } from '../components/BacklogView';
import { PomodoroView } from '../components/PomodoroView';
import { NotepadView } from '../components/NotepadView';
import { ManageRoutinesModal } from '../components/ManageRoutinesModal';
import { ManageCategoriesModal } from '../components/ManageCategoriesModal';
import { NotificationSettingsModal } from '../components/NotificationSettingsModal';
import { useGlobalShortcuts } from '../hooks/useGlobalShortcuts';
import { useReminderScheduler } from '../services/reminderScheduler';
import { Sparkles, Compass, RefreshCw } from 'lucide-react';

export default function Home() {
  // Atalhos Globais de Teclado & Agendador de Lembretes Nativos (RF-12)
  useGlobalShortcuts();
  useReminderScheduler();

  const activeView = useFlowStore((s) => s.activeView);
  const tasks = useFlowStore((s) => s.tasks);
  const routineTypes = useFlowStore((s) => s.routineTypes);
  const selectedRoutineTypeId = useFlowStore((s) => s.selectedRoutineTypeId);
  const selectedDate = useFlowStore((s) => s.selectedDate);
  const activeCategoryId = useFlowStore((s) => s.activeCategoryIdFilter);
  const resetToTemplate = useFlowStore((s) => s.resetToTemplate);
  const tickPomodoro = useFlowStore((s) => s.tickPomodoro);
  const isPomodoroActive = useFlowStore((s) => s.pomodoro.isActive);

  // Background ticker para Pomodoro ativo (RF-7 / RF-13)
  useEffect(() => {
    if (!isPomodoroActive) return;
    const interval = setInterval(() => {
      tickPomodoro();
    }, 1000);
    return () => clearInterval(interval);
  }, [isPomodoroActive, tickPomodoro]);

  const currentRoutineType =
    routineTypes.find((rt) => rt.id === selectedRoutineTypeId) || routineTypes[0];

  // Filtragem e ordenação cronológica síncrona (vercel-react-best-practices)
  const currentDayOfWeek = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    return new Date(y, m - 1, d).getDay();
  }, [selectedDate]);

  const filteredTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        const matchesRoutine = t.routineTypeId === selectedRoutineTypeId;
        const matchesDay = t.daysOfWeek.includes(currentDayOfWeek);
        const matchesCategory =
          activeCategoryId === 'all' || t.categoryId === activeCategoryId;
        return matchesRoutine && matchesDay && matchesCategory;
      })
      .sort((a, b) => {
        const [ah, am] = a.startTime.split(':').map(Number);
        const [bh, bm] = b.startTime.split(':').map(Number);
        return ah * 60 + am - (bh * 60 + bm);
      });
  }, [tasks, selectedRoutineTypeId, currentDayOfWeek, activeCategoryId]);

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '60px' }}>
      {/* Header Sticky */}
      <Header />

      <main style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Renderização Condicional da View Selecionada */}
        {activeView === 'dashboard' && <DashboardView />}

        {activeView === 'backlog' && <BacklogView />}

        {activeView === 'pomodoro' && <PomodoroView />}

        {activeView === 'notes' && <NotepadView />}

        {activeView === 'routine' && (
          <>
            {/* Daily Stats Bar */}
            <DailyStatsBar />

            {/* Philosophy Card - Dinâmico por Tipo de Rotina */}
            <div style={{ padding: '0 28px 12px' }}>
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

            {/* Tasks Stream */}
            <div
              style={{
                padding: '8px 28px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {filteredTasks.length > 0 ? (
                filteredTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))
              ) : (
                <div
                  className="double-bezel-outer"
                  style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                  }}
                >
                  <div
                    className="double-bezel-inner"
                    style={{
                      padding: '36px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: 'var(--bg-elevated)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <Sparkles size={22} />
                    </div>
                    <h4 style={{ fontSize: '16px', fontWeight: 700 }}>
                      Nenhuma atividade encontrada neste filtro
                    </h4>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '400px' }}>
                      Não há atividades para a categoria selecionada neste dia. Você pode alternar o filtro ou adicionar uma nova atividade personalizada.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Footer info & restore */}
        <div
          style={{
            marginTop: '36px',
            padding: '16px 28px',
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
          <span>Flow App — SQLite Relacional & Rotinas Customizáveis</span>
          <button
            onClick={() => {
              if (window.confirm('Deseja restaurar as rotinas e categorias padrão? Seus dados serão redefinidos para os modelos iniciais.')) {
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
      </main>

      {/* Modais Globais de Controle */}
      <TaskModal />
      <TaskDetailModal />
      <ManageRoutinesModal />
      <ManageCategoriesModal />
      <NotificationSettingsModal />
    </div>
  );
}
