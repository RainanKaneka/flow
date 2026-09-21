'use client';

import React from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { RoutineLevel } from '../types/routine';
import {
  Sparkles,
  Sun,
  Moon,
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Layers,
} from 'lucide-react';

export const Header: React.FC = () => {
  const selectedLevel = useFlowStore((s) => s.selectedLevel);
  const setLevel = useFlowStore((s) => s.setLevel);
  const theme = useFlowStore((s) => s.theme);
  const toggleTheme = useFlowStore((s) => s.toggleTheme);
  const selectedDate = useFlowStore((s) => s.selectedDate);
  const setDate = useFlowStore((s) => s.setDate);
  const openTaskModal = useFlowStore((s) => s.openTaskModal);

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
          theme === 'dark' ? 'rgba(8, 8, 10, 0.82)' : 'rgba(248, 249, 250, 0.85)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '16px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
      }}
    >
      {/* Brand & Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
            }}
          >
            <Sparkles size={18} strokeWidth={2.2} />
          </div>
          <div>
            <h1
              style={{
                fontSize: '19px',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
              }}
            >
              FLOW
            </h1>
            <p
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                fontWeight: 500,
                letterSpacing: '0.02em',
              }}
            >
              Rotina & Alta Performance
            </p>
          </div>
        </div>

        {/* Nível da Rotina (Fácil / Médio / Difícil) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-elevated)',
            padding: '4px',
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
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: active ? 700 : 500,
                  cursor: 'pointer',
                  backgroundColor: active ? 'var(--bg-secondary)' : 'transparent',
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  boxShadow: active
                    ? '0 2px 8px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.1)'
                    : 'none',
                  transition: 'all 200ms var(--bezier-haptic)',
                }}
              >
                {lvl.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Date Navigation & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Date Selector */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '9999px',
            padding: '4px 6px',
            gap: '6px',
          }}
        >
          <button
            onClick={() => changeDateByDays(-1)}
            style={{
              width: '28px',
              height: '28px',
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
            <ChevronLeft size={16} />
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
                  padding: '2px 6px',
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
              width: '28px',
              height: '28px',
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
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          style={{
            width: '38px',
            height: '38px',
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
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* Button-in-Button: Criar Nova Tarefa */}
        <button
          onClick={() => openTaskModal(null)}
          className="btn-island btn-island-primary"
        >
          <span>Nova Atividade</span>
          <div className="btn-circle-icon">
            <Plus size={14} strokeWidth={2.6} />
          </div>
        </button>
      </div>
    </header>
  );
};
