'use client';

import React, { useMemo } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { Header } from '../components/Header';
import { DailyStatsBar } from '../components/DailyStatsBar';
import { CategoryFilter } from '../components/CategoryFilter';
import { TaskCard } from '../components/TaskCard';
import { TaskModal } from '../components/TaskModal';
import { DashboardView } from '../components/DashboardView';
import { BacklogView } from '../components/BacklogView';
import { Sparkles, Compass, RefreshCw } from 'lucide-react';

export default function Home() {
  const activeView = useFlowStore((s) => s.activeView);
  const tasks = useFlowStore((s) => s.tasks);
  const selectedLevel = useFlowStore((s) => s.selectedLevel);
  const selectedDate = useFlowStore((s) => s.selectedDate);
  const activeCategory = useFlowStore((s) => s.activeCategoryFilter);
  const resetToInitialRoutine = useFlowStore((s) => s.resetToInitialRoutine);

  // Filtragem e ordenação cronológica síncrona (vercel-react-best-practices)
  const currentDayOfWeek = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    return new Date(y, m - 1, d).getDay();
  }, [selectedDate]);

  const filteredTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        const matchesLevel = t.level === selectedLevel;
        const matchesDay = t.daysOfWeek.includes(currentDayOfWeek);
        const matchesCategory =
          activeCategory === 'all' || t.category === activeCategory;
        return matchesLevel && matchesDay && matchesCategory;
      })
      .sort((a, b) => {
        const [ah, am] = a.startTime.split(':').map(Number);
        const [bh, bm] = b.startTime.split(':').map(Number);
        return ah * 60 + am - (bh * 60 + bm);
      });
  }, [tasks, selectedLevel, currentDayOfWeek, activeCategory]);

  const getLevelPhilosophy = () => {
    switch (selectedLevel) {
      case 'easy':
        return {
          title: 'Nível Fácil — O Alicerce Anti-Desistência',
          focus: 'Eliminar o celular na cama & 45 min de programação.',
          quote: 'Não corte seu lazer, organize as vitórias. Comece sem culpa.',
        };
      case 'medium':
        return {
          title: 'Nível Médio — A Consolidação dos Hábitos',
          focus: 'Acordar 09:30, 10 min de exercício, café ao sol e rotação criativa (Arte/RPG).',
          quote: 'A consistência transforma esforço em automatismo.',
        };
      case 'hard':
        return {
          title: 'Nível Difícil — Alta Performance',
          focus: 'Acordar 09:00, 2h15 de Deep Work em código, arte diária e 8h30 de sono.',
          quote: 'Estado da arte: 100% dos seus sonhos com harmonia e energia.',
        };
    }
  };

  const philosophy = getLevelPhilosophy();

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '60px' }}>
      {/* Header Sticky */}
      <Header />

      <main style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Renderização Condicional da View Selecionada */}
        {activeView === 'dashboard' && <DashboardView />}

        {activeView === 'backlog' && <BacklogView />}

        {activeView === 'routine' && (
          <>
            {/* Daily Stats Bar */}
            <DailyStatsBar />

            {/* Philosophy Card - Notion Inspiration */}
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
                      {philosophy.title}:
                    </span>{' '}
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {philosophy.focus}
                    </span>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontStyle: 'italic',
                    color: 'var(--text-muted)',
                  }}
                >
                  &ldquo;{philosophy.quote}&rdquo;
                </span>
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
          <span>Flow App — SQLite Relacional & Dashboard Integrado</span>
          <button
            onClick={() => {
              if (window.confirm('Deseja restaurar as tarefas originais dos 3 níveis? Suas anotações personalizadas serão redefinidas.')) {
                resetToInitialRoutine();
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
            <span>Restaurar Rotina Oficial</span>
          </button>
        </div>
      </main>

      {/* Modal de Criação / Edição de Tarefas */}
      <TaskModal />
    </div>
  );
}
