import React from 'react';
import { AppView } from '../../types/routine';
import { CheckCircle2, Timer, FileText, Inbox, BarChart2, Sparkles } from 'lucide-react';

export interface HeaderNavTabsProps {
  activeView: AppView;
  onSelectView: (view: AppView) => void;
  pomodoroActive: boolean;
  pomodoroTimeStr: string;
  notesCount: number;
  backlogCount: number;
}

export const HeaderNavTabs: React.FC<HeaderNavTabsProps> = ({
  activeView,
  onSelectView,
  pomodoroActive,
  pomodoroTimeStr,
  notesCount,
  backlogCount,
}) => {
  return (
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
        onClick={() => onSelectView('routine')}
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
        onClick={() => onSelectView('pomodoro')}
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
        <Timer size={13} color={pomodoroActive ? 'var(--accent-primary)' : undefined} />
        <span>Pomodoro</span>
        {pomodoroActive && (
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
            {pomodoroTimeStr}
          </span>
        )}
      </button>

      {/* 3: Bloco de Notas Tab */}
      <button
        onClick={() => onSelectView('notes')}
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
        {notesCount > 0 && (
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
            {notesCount}
          </span>
        )}
      </button>

      {/* 4: Backlog Tab */}
      <button
        onClick={() => onSelectView('backlog')}
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
        {backlogCount > 0 && (
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
            {backlogCount}
          </span>
        )}
      </button>

      {/* 5: Dashboard Tab */}
      <button
        onClick={() => onSelectView('dashboard')}
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

      {/* 6: IA Assistant Tab */}
      <button
        onClick={() => onSelectView('ai')}
        title="Assistente IA Copilot [Atalho: 6]"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 14px',
          borderRadius: '9999px',
          border: 'none',
          fontSize: '12px',
          fontWeight: activeView === 'ai' ? 700 : 500,
          cursor: 'pointer',
          backgroundColor: activeView === 'ai' ? 'var(--bg-secondary)' : 'transparent',
          color: activeView === 'ai' ? '#6366F1' : 'var(--text-secondary)',
          boxShadow: activeView === 'ai' ? '0 2px 8px rgba(99,102,241,0.15)' : 'none',
          transition: 'all 200ms var(--bezier-haptic)',
        }}
      >
        <Sparkles size={13} color="#6366F1" />
        <span>IA</span>
      </button>
    </div>
  );
};
