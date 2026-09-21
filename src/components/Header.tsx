'use client';

import React from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { RoutineLevel, AppView } from '../types/routine';
import {
  Sparkles,
  Sun,
  Moon,
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Layers,
  BarChart2,
  Inbox,
  CheckCircle2,
} from 'lucide-react';

export const Header: React.FC = () => {
  const activeView = useFlowStore((s) => s.activeView);
  const setActiveView = useFlowStore((s) => s.setActiveView);
  const selectedLevel = useFlowStore((s) => s.selectedLevel);
  const setLevel = useFlowStore((s) => s.setLevel);
  const theme = useFlowStore((s) => s.theme);
  const toggleTheme = useFlowStore((s) => s.toggleTheme);
  const selectedDate = useFlowStore((s) => s.selectedDate);
  const setDate = useFlowStore((s) => s.setDate);
  const openTaskModal = useFlowStore((s) => s.openTaskModal);
  const backlog = useFlowStore((s) => s.backlog);

  // Navegação de datas
  const changeDateByDays = (days: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() + days);
    const newY = dateObj.getFullYear();
    const newM = String(dateObj.getMonth() + 1).padStart(2, '0');
    const newD = String(dateObj.getDate()).padStart(2, '0');
    setDate(`${newY}-${newM}-${newD}`);
  };

  const isToday = () => {
    const today = new Date();
    const [y, m, d] = selectedDate.split('-').map(Number);
    return (
      today.getFullYear() === y &&
      today.getMonth() === m - 1 &&
      today.getDate() === d
    );
  };

  const formatDateDisplay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const weekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' });
    const dayAndMonth = dateObj.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });
    return `${weekday.toUpperCase()}, ${dayAndMonth}`;
  };

  const levels: { id: RoutineLevel; label: string; desc: string }[] = [
    { id: 'easy', label: 'Fácil', desc: 'Alicerce Anti-Desistência' },
    { id: 'medium', label: 'Médio', desc: 'Consolidação de Hábitos' },
    { id: 'hard', label: 'Difícil', desc: 'Alta Performance' },
  ];

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        backgroundColor:
          theme === 'dark' ? 'rgba(8, 8, 10, 0.85)' : 'rgba(248, 249, 250, 0.88)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '12px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {/* Top Bar: Brand, Views Switcher, Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        {/* Brand & Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '11px',
                background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
              }}
            >
              <Sparkles size={17} strokeWidth={2.4} />
            </div>
            <div>
              <h1
                style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  lineHeight: 1.1,
                }}
              >
                FLOW
              </h1>
            </div>
          </div>

          {/* Abas Principais (Rotina / Dashboard / Backlog) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--bg-elevated)',
              padding: '3px',
              borderRadius: '9999px',
              border: '1px solid var(--border-subtle)',
              gap: '2px',
            }}
          >
            <button
              onClick={() => setActiveView('routine')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '9999px',
                border: 'none',
                fontSize: '12px',
                fontWeight: activeView === 'routine' ? 700 : 500,
                cursor: 'pointer',
                backgroundColor: activeView === 'routine' ? 'var(--bg-secondary)' : 'transparent',
                color: activeView === 'routine' ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: activeView === 'routine' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 200ms var(--bezier-haptic)',
              }}
            >
              <CheckCircle2 size={13} />
              <span>Rotina Diária</span>
            </button>

            <button
              onClick={() => setActiveView('dashboard')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '9999px',
                border: 'none',
                fontSize: '12px',
                fontWeight: activeView === 'dashboard' ? 700 : 500,
                cursor: 'pointer',
                backgroundColor: activeView === 'dashboard' ? 'var(--bg-secondary)' : 'transparent',
                color: activeView === 'dashboard' ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: activeView === 'dashboard' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 200ms var(--bezier-haptic)',
              }}
            >
              <BarChart2 size={13} />
              <span>Dashboard & Métricas</span>
            </button>

            <button
              onClick={() => setActiveView('backlog')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '9999px',
                border: 'none',
                fontSize: '12px',
                fontWeight: activeView === 'backlog' ? 700 : 500,
                cursor: 'pointer',
                backgroundColor: activeView === 'backlog' ? 'var(--bg-secondary)' : 'transparent',
                color: activeView === 'backlog' ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: activeView === 'backlog' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 200ms var(--bezier-haptic)',
              }}
            >
              <Inbox size={13} />
              <span>Backlog</span>
              {backlog.length > 0 && (
                <span
                  style={{
                    fontSize: '10px',
                    padding: '1px 6px',
                    borderRadius: '9999px',
                    background: 'var(--accent-soft)',
                    color: 'var(--accent-primary)',
                    fontWeight: 700,
                  }}
                >
                  {backlog.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Right Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 200ms var(--bezier-haptic)',
            }}
            title={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Button-in-Button: Criar Nova Tarefa */}
          <button
            onClick={() => openTaskModal(null)}
            className="btn-island btn-island-primary"
          >
            <span>Nova Atividade</span>
            <div className="btn-circle-icon">
              <Plus size={13} strokeWidth={2.6} />
            </div>
          </button>
        </div>
      </div>

      {/* Sub-bar: Apenas visível na visão de rotina ou dashboard para selecionar nível e data */}
      {activeView !== 'backlog' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            paddingTop: '4px',
          }}
        >
          {/* Nível da Rotina */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--bg-secondary)',
              padding: '3px',
              borderRadius: '9999px',
              border: '1px solid var(--border-subtle)',
              gap: '2px',
            }}
          >
            {levels.map((lvl) => {
              const active = selectedLevel === lvl.id;
              return (
                <button
                  key={lvl.id}
                  onClick={() => setLevel(lvl.id)}
                  title={lvl.desc}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '9999px',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                    backgroundColor: active ? 'var(--text-primary)' : 'transparent',
                    color: active ? 'var(--bg-primary)' : 'var(--text-secondary)',
                    transition: 'all 200ms var(--bezier-haptic)',
                  }}
                >
                  {lvl.label}
                </button>
              );
            })}
          </div>

          {/* Seletor de Data */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '9999px',
              padding: '3px 6px',
              gap: '4px',
            }}
          >
            <button
              onClick={() => changeDateByDays(-1)}
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Dia anterior"
            >
              <ChevronLeft size={15} />
            </button>

            <button
              onClick={() => {
                const t = new Date();
                const y = t.getFullYear();
                const m = String(t.getMonth() + 1).padStart(2, '0');
                const d = String(t.getDate()).padStart(2, '0');
                setDate(`${y}-${m}-${d}`);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'transparent',
                border: 'none',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                cursor: 'pointer',
                padding: '2px 8px',
              }}
            >
              <Calendar size={13} color="var(--accent-primary)" />
              <span>{formatDateDisplay()}</span>
              {isToday() && (
                <span
                  style={{
                    fontSize: '9px',
                    background: 'var(--success-bg)',
                    color: 'var(--success)',
                    padding: '1px 5px',
                    borderRadius: '9999px',
                    fontWeight: 700,
                  }}
                >
                  HOJE
                </span>
              )}
            </button>

            <button
              onClick={() => changeDateByDays(1)}
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Próximo dia"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
