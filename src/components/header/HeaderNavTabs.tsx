import React from 'react';
import { AppView } from '../../types/routine';
import { CheckCircle2, Timer, FileText, Inbox, BarChart2, Sparkles, Clock, Calendar } from 'lucide-react';
import styles from './HeaderNavTabs.module.css';

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
      data-testid="header-nav-tabs"
      className={styles.container}
    >
      {/* 1: Rotina Tab */}
      <button
        onClick={() => onSelectView('routine')}
        title="Rotina [Atalho: 1]"
        className={`${styles.tabBtn} ${activeView === 'routine' ? styles.tabBtnActive : ''}`}
      >
        <CheckCircle2 size={13} />
        <span>Rotina</span>
      </button>

      {/* 7: Cronograma Tab (Structured Timeline) */}
      <button
        onClick={() => onSelectView('timeline')}
        title="Cronograma Visual [Atalho: 7]"
        className={`${styles.tabBtn} ${activeView === 'timeline' ? styles.tabBtnActive : ''}`}
      >
        <Clock size={13} />
        <span>Cronograma</span>
      </button>

      {/* 8: Calendário Tab */}
      <button
        onClick={() => onSelectView('calendar')}
        title="Calendário Mensal [Atalho: 8]"
        className={`${styles.tabBtn} ${activeView === 'calendar' ? styles.tabBtnActive : ''}`}
      >
        <Calendar size={13} />
        <span>Calendário</span>
      </button>

      {/* 2: Pomodoro Tab */}
      <button
        onClick={() => onSelectView('pomodoro')}
        title="Pomodoro [Atalho: 2]"
        className={`${styles.tabBtn} ${activeView === 'pomodoro' ? styles.tabBtnActive : ''}`}
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
        className={`${styles.tabBtn} ${activeView === 'notes' ? styles.tabBtnActive : ''}`}
      >
        <FileText size={13} />
        <span>Notas</span>
        {notesCount > 0 && (
          <span className={styles.tabCountBadge}>
            {notesCount}
          </span>
        )}
      </button>

      {/* 4: Backlog Tab */}
      <button
        onClick={() => onSelectView('backlog')}
        title="Backlog [Atalho: 4]"
        className={`${styles.tabBtn} ${activeView === 'backlog' ? styles.tabBtnActive : ''}`}
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
        className={`${styles.tabBtn} ${activeView === 'dashboard' ? styles.tabBtnActive : ''}`}
      >
        <BarChart2 size={13} />
        <span>Dashboard</span>
      </button>

      {/* 6: IA Assistant Tab */}
      <button
        onClick={() => onSelectView('ai')}
        title="Assistente IA Copilot [Atalho: 6]"
        className={`${styles.tabBtn} ${activeView === 'ai' ? styles.tabBtnActive : ''}`}
        style={activeView === 'ai' ? { color: '#6366F1' } : undefined}
      >
        <Sparkles size={13} color="#6366F1" />
        <span>IA</span>
      </button>
    </div>
  );
};
