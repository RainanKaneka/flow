'use client';

import React from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { AppView } from '../types/routine';
import {
  Sparkles,
  Sun,
  Moon,
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar,
  BarChart2,
  Inbox,
  CheckCircle2,
  SlidersHorizontal,
  Timer,
  FileText,
  Bell,
} from 'lucide-react';

export const Header: React.FC = () => {
  const activeView = useFlowStore((s) => s.activeView);
  const setActiveView = useFlowStore((s) => s.setActiveView);
  
  const routineTypes = useFlowStore((s) => s.routineTypes);
  const selectedRoutineTypeId = useFlowStore((s) => s.selectedRoutineTypeId);
  const selectRoutineType = useFlowStore((s) => s.selectRoutineType);
  const openManageRoutinesModal = useFlowStore((s) => s.openManageRoutinesModal);

  const theme = useFlowStore((s) => s.theme);
  const toggleTheme = useFlowStore((s) => s.toggleTheme);
  const selectedDate = useFlowStore((s) => s.selectedDate);
  const setDate = useFlowStore((s) => s.setDate);
  const openTaskModal = useFlowStore((s) => s.openTaskModal);
  const backlog = useFlowStore((s) => s.backlog);
  const notes = useFlowStore((s) => s.notes);
  const pomodoro = useFlowStore((s) => s.pomodoro);
  const reminderSettings = useFlowStore((s) => s.reminderSettings);
  const openNotificationModal = useFlowStore((s) => s.openNotificationModal);
  const availableUpdate = useFlowStore((s) => s.availableUpdate);
  const openUpdateModal = useFlowStore((s) => s.openUpdateModal);

  const pomodoroMinutes = Math.floor(pomodoro.timeLeftSeconds / 60);
  const pomodoroSeconds = pomodoro.timeLeftSeconds % 60;
  const liveTimeStr = `${String(pomodoroMinutes).padStart(2, '0')}:${String(pomodoroSeconds).padStart(2, '0')}`;

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
            {/* 1: Rotina Tab */}
            <button
              onClick={() => setActiveView('routine')}
              title="Rotina [Atalho: 1]"
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
              <span>Rotina</span>
            </button>

            {/* 2: Pomodoro Tab */}
            <button
              onClick={() => setActiveView('pomodoro')}
              title="Pomodoro [Atalho: 2]"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '9999px',
                border: 'none',
                fontSize: '12px',
                fontWeight: activeView === 'pomodoro' ? 700 : 500,
                cursor: 'pointer',
                backgroundColor: activeView === 'pomodoro' ? 'var(--bg-secondary)' : 'transparent',
                color: activeView === 'pomodoro' ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: activeView === 'pomodoro' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 200ms var(--bezier-haptic)',
              }}
            >
              <Timer size={13} color={pomodoro.isActive ? 'var(--accent-primary)' : undefined} />
              <span>Pomodoro</span>
              {pomodoro.isActive && (
                <span
                  style={{
                    fontSize: '10px',
                    padding: '1px 6px',
                    borderRadius: '9999px',
                    background: 'var(--accent-soft)',
                    color: 'var(--accent-primary)',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {liveTimeStr}
                </span>
              )}
            </button>

            {/* 3: Bloco de Notas Tab */}
            <button
              onClick={() => setActiveView('notes')}
              title="Notas [Atalho: 3]"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '9999px',
                border: 'none',
                fontSize: '12px',
                fontWeight: activeView === 'notes' ? 700 : 500,
                cursor: 'pointer',
                backgroundColor: activeView === 'notes' ? 'var(--bg-secondary)' : 'transparent',
                color: activeView === 'notes' ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: activeView === 'notes' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 200ms var(--bezier-haptic)',
              }}
            >
              <FileText size={13} />
              <span>Notas</span>
              {notes.length > 0 && (
                <span
                  style={{
                    fontSize: '10px',
                    padding: '1px 6px',
                    borderRadius: '9999px',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-muted)',
                    fontWeight: 700,
                  }}
                >
                  {notes.length}
                </span>
              )}
            </button>

            {/* 4: Backlog Tab */}
            <button
              onClick={() => setActiveView('backlog')}
              title="Backlog [Atalho: 4]"
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

            {/* 5: Dashboard Tab */}
            <button
              onClick={() => setActiveView('dashboard')}
              title="Dashboard [Atalho: 5]"
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
              <span>Dashboard</span>
            </button>
          </div>
        </div>

        {/* Right Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Mini Live Timer Pill (se o pomodoro estiver ativo e estivermos em outra aba) */}
          {pomodoro.isActive && activeView !== 'pomodoro' && (
            <button
              onClick={() => setActiveView('pomodoro')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '9999px',
                border: '1px solid rgba(99, 102, 241, 0.4)',
                background: 'rgba(99, 102, 241, 0.12)',
                color: 'var(--accent-primary)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
              }}
              title="Voltar ao Pomodoro ativo"
            >
              <Timer size={13} />
              <span>{liveTimeStr}</span>
            </button>
          )}

          {/* Badge de Nova Versão Disponível */}
          {availableUpdate?.hasUpdate && (
            <button
              onClick={openUpdateModal}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '9999px',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10B981',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 200ms',
              }}
              title="Nova versão do Flow pronta para download! Clique para atualizar."
            >
              <Sparkles size={13} />
              <span>Atualização v{availableUpdate.latestVersion}</span>
            </button>
          )}

          {/* Lembretes & Notificações (RF-12) */}
          <button
            onClick={openNotificationModal}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              color: reminderSettings.enabled ? 'var(--accent-primary)' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 200ms var(--bezier-haptic)',
            }}
            title="Lembretes & Configurações de Notificação (RF-12)"
          >
            <Bell size={16} />
            {reminderSettings.enabled && (
              <span
                style={{
                  position: 'absolute',
                  top: '7px',
                  right: '7px',
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: '#10B981',
                  border: '1.5px solid var(--bg-secondary)',
                }}
              />
            )}
          </button>

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
            title="Nova Atividade [Atalho: Ctrl+N]"
          >
            <span>Nova Atividade</span>
            <div className="btn-circle-icon">
              <Plus size={13} strokeWidth={2.6} />
            </div>
          </button>
        </div>
      </div>

      {/* Sub-bar: Visível para selecionar Tipos de Rotina e Data */}
      {(activeView === 'routine' || activeView === 'dashboard') && (
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
          {/* Tipos de Rotina 100% Dinâmicos */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--bg-secondary)',
              padding: '3px 6px 3px 4px',
              borderRadius: '9999px',
              border: '1px solid var(--border-subtle)',
              gap: '4px',
            }}
          >
            {routineTypes.map((rt) => {
              const active = selectedRoutineTypeId === rt.id;
              return (
                <button
                  key={rt.id}
                  onClick={() => selectRoutineType(rt.id)}
                  title={rt.description}
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
                  {rt.name}
                </button>
              );
            })}

            {/* Botão para gerenciar / criar tipos de rotina */}
            <button
              onClick={openManageRoutinesModal}
              title="Gerenciar ou Criar Tipos de Rotina"
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                border: 'none',
                background: 'var(--bg-elevated)',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Plus size={12} strokeWidth={2.5} />
            </button>
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
