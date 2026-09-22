'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { sounds } from '../utils/audio';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Timer,
  CheckCircle2,
  Sparkles,
  Flame,
  ChevronDown,
  Check,
  X,
} from 'lucide-react';
import styles from './PomodoroView.module.css';

export const PomodoroView: React.FC = () => {
  const pomodoro = useFlowStore((s) => s.pomodoro);
  const tasks = useFlowStore((s) => s.tasks);
  const selectedRoutineTypeId = useFlowStore((s) => s.selectedRoutineTypeId);
  const selectedDate = useFlowStore((s) => s.selectedDate);
  const logs = useFlowStore((s) => s.logs);

  const startPomodoro = useFlowStore((s) => s.startPomodoro);
  const pausePomodoro = useFlowStore((s) => s.pausePomodoro);
  const resetPomodoro = useFlowStore((s) => s.resetPomodoro);
  const setPomodoroMode = useFlowStore((s) => s.setPomodoroMode);
  const setPomodoroDuration = useFlowStore((s) => s.setPomodoroDuration);
  const linkTaskToPomodoro = useFlowStore((s) => s.linkTaskToPomodoro);
  const tickPomodoro = useFlowStore((s) => s.tickPomodoro);
  const finishPomodoroSession = useFlowStore((s) => s.finishPomodoroSession);
  const categories = useFlowStore((s) => s.categories);

  const [isLinkDropdownOpen, setIsLinkDropdownOpen] = useState(false);
  const linkDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (linkDropdownRef.current && !linkDropdownRef.current.contains(e.target as Node)) {
        setIsLinkDropdownOpen(false);
      }
    };
    if (isLinkDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isLinkDropdownOpen]);

  // Intervalo de contagem regressiva
  useEffect(() => {
    if (!pomodoro.isActive) return;

    const interval = setInterval(() => {
      tickPomodoro();
    }, 1000);

    return () => clearInterval(interval);
  }, [pomodoro.isActive, tickPomodoro]);

  // Filtrar tarefas de hoje para vincular
  const [year, month, day] = selectedDate.split('-').map(Number);
  const currentDayOfWeek = new Date(year, month - 1, day).getDay();

  const todayTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (t.routineTypeId !== selectedRoutineTypeId) return false;
      if (t.specificDate) return t.specificDate === selectedDate;
      return t.daysOfWeek.includes(currentDayOfWeek);
    });
  }, [tasks, selectedRoutineTypeId, currentDayOfWeek, selectedDate]);

  const linkedTask = tasks.find((t) => t.id === pomodoro.linkedTaskId);
  const linkedTaskTime = linkedTask
    ? logs[`${selectedDate}_${linkedTask.id}`]?.timeSpentMinutes || 0
    : 0;

  // Formatação de minutos e segundos
  const minutes = Math.floor(pomodoro.timeLeftSeconds / 60);
  const seconds = pomodoro.timeLeftSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Progresso do círculo SVG
  const progressPercent =
    pomodoro.totalDurationSeconds > 0
      ? ((pomodoro.totalDurationSeconds - pomodoro.timeLeftSeconds) /
          pomodoro.totalDurationSeconds) *
        100
      : 0;

  const radius = 135;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  // Ajuste rápido de tempo (+5 min / -5 min)
  const adjustMinutes = (deltaMins: number) => {
    const currentMins = Math.floor(pomodoro.totalDurationSeconds / 60);
    const newMins = Math.max(1, Math.min(120, currentMins + deltaMins));
    setPomodoroDuration(newMins * 60);
  };

  const getModeColor = () => {
    switch (pomodoro.mode) {
      case 'focus':
        return '#6366F1';
      case 'shortBreak':
        return '#10B981';
      case 'longBreak':
        return '#0EA5E9';
    }
  };

  const modeColor = getModeColor();

  return (
    <div className={styles.container}>
      {/* Top Banner de Status / Pomodoro Vinculado */}
      <div className={`double-bezel-outer ${styles.topBannerOuter}`}>
        <div className={`double-bezel-inner ${styles.topBannerInner}`}>
          <div className={styles.bannerLeft}>
            <div className={styles.bannerIconBox}>
              <Timer size={20} strokeWidth={2.4} />
            </div>
            <div>
              <h3 className={styles.bannerTitle}>Pomodoro de Alta Performance</h3>
              <p className={styles.bannerSubtitle}>
                {linkedTask
                  ? `Vinculado a: ${linkedTask.title} (${linkedTaskTime} min acumulados hoje)`
                  : 'Foco livre ou vincule a uma tarefa da rotina abaixo'}
              </p>
            </div>
          </div>

          {/* Contador de Ciclos */}
          <div className={styles.cycleBadge}>
            <Flame size={14} />
            <span>{pomodoro.completedSessions} Blocos Cumpridos</span>
          </div>
        </div>
      </div>

      {/* Seletor de Modo (Foco, Pausa Curta, Pausa Longa) */}
      <div className={styles.modeSelector}>
        <button
          onClick={() => setPomodoroMode('focus')}
          className={`${styles.modeButton} ${pomodoro.mode === 'focus' ? styles.modeButtonActive : ''}`}
        >
          Foco (25m)
        </button>

        <button
          onClick={() => setPomodoroMode('shortBreak')}
          className={`${styles.modeButton} ${pomodoro.mode === 'shortBreak' ? styles.modeButtonActive : ''}`}
        >
          Pausa Curta (5m)
        </button>

        <button
          onClick={() => setPomodoroMode('longBreak')}
          className={`${styles.modeButton} ${pomodoro.mode === 'longBreak' ? styles.modeButtonActive : ''}`}
        >
          Pausa Longa (15m)
        </button>
      </div>

      {/* Relógio Circular Principal (Double-Bezel Circular) */}
      <div
        className={`double-bezel-outer ${styles.timerOuter}`}
        style={{
          boxShadow: pomodoro.isActive
            ? `0 0 40px -10px ${modeColor}55, 0 12px 32px rgba(0,0,0,0.2)`
            : '0 12px 32px rgba(0,0,0,0.15)',
        }}
      >
        <div className={`double-bezel-inner ${styles.timerInner}`}>
          {/* SVG Progress Ring */}
          <svg width="308" height="308" className={styles.svgRing}>
            <circle
              cx="154"
              cy="154"
              r={radius}
              strokeWidth="10"
              fill="transparent"
              className={styles.circleTrack}
            />
            <circle
              cx="154"
              cy="154"
              r={radius}
              stroke={modeColor}
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className={styles.circleProgress}
            />
          </svg>

          {/* Central Time Display */}
          <div className={styles.centerDisplay}>
            <span className={styles.modeLabel} style={{ color: modeColor }}>
              {pomodoro.mode === 'focus' ? 'Modo Foco' : 'Recuperação'}
            </span>

            <h1 className={styles.timeDigits}>{formattedTime}</h1>

            <p className={styles.timerStatus}>
              {pomodoro.isActive ? 'Foco absoluto em andamento...' : 'Pausado'}
            </p>
          </div>
        </div>
      </div>

      {/* Botões de Ação Principais */}
      <div className={styles.actionButtonsRow}>
        {/* Resetar */}
        <button
          onClick={() => resetPomodoro()}
          title="Resetar tempo do ciclo"
          className={styles.circleActionButton}
        >
          <RotateCcw size={18} />
        </button>

        {/* Iniciar / Pausar (Button-in-Button) */}
        {pomodoro.isActive ? (
          <button onClick={pausePomodoro} className={`btn-island ${styles.pauseBtn}`}>
            <span>Pausar</span>
            <div className={`btn-circle-icon ${styles.pauseIconBox}`}>
              <Pause size={14} fill="currentColor" />
            </div>
          </button>
        ) : (
          <button
            onClick={() => startPomodoro()}
            className={`btn-island btn-island-primary ${styles.playBtn}`}
          >
            <span>Iniciar Foco</span>
            <div className="btn-circle-icon">
              <Play size={14} fill="currentColor" />
            </div>
          </button>
        )}

        {/* Pular / Concluir Ciclo */}
        <button
          onClick={() => finishPomodoroSession()}
          title="Concluir sessão e tocar som"
          className={styles.circleActionButton}
        >
          <SkipForward size={18} />
        </button>
      </div>

      {/* Ajuste Customizado & Vinculação com Tarefas (RF-13, RF-7) */}
      <div className={`double-bezel-outer ${styles.settingsOuter}`}>
        <div className={`double-bezel-inner ${styles.settingsInner}`}>
          {/* Vinculação de Tarefa */}
          <div>
            <label className={styles.settingsLabel}>
              Vincular a uma Atividade da Rotina de Hoje (RF-13)
            </label>
            <p className={styles.settingsSubtitle}>
              O tempo focado nesta sessão será somado automaticamente ao histórico real da
              atividade.
            </p>

            {/* Custom Dropdown Seletor de Atividades */}
            <div ref={linkDropdownRef} className={styles.dropdownWrapper}>
              <button
                type="button"
                onClick={() => {
                  setIsLinkDropdownOpen((prev) => !prev);
                  sounds.playTick();
                }}
                className={`${styles.dropdownTrigger} ${isLinkDropdownOpen ? styles.dropdownTriggerOpen : ''}`}
              >
                <div className={styles.dropdownTriggerContent}>
                  {linkedTask ? (
                    <>
                      <div
                        className={styles.categoryDot}
                        style={{
                          background:
                            categories.find((c) => c.id === linkedTask.categoryId)?.color ||
                            '#6366F1',
                          boxShadow: `0 0 8px ${categories.find((c) => c.id === linkedTask.categoryId)?.color || '#6366F1'}80`,
                        }}
                      />
                      <div className={styles.taskInfo}>
                        <span className={styles.taskTitle}>{linkedTask.title}</span>
                        <span className={styles.taskMeta}>
                          {linkedTask.startTime} - {linkedTask.endTime} • {linkedTask.targetMinutes}{' '}
                          min
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      <span style={{ color: 'var(--text-secondary)' }}>
                        Nenhuma atividade vinculada (Foco Avulso)
                      </span>
                    </>
                  )}
                </div>

                <div className={styles.dropdownTriggerRight}>
                  {linkedTask && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        linkTaskToPomodoro(null);
                        sounds.playTick();
                      }}
                      title="Desvincular atividade"
                      className={styles.unlinkBtn}
                    >
                      <X size={14} />
                    </span>
                  )}
                  <ChevronDown
                    size={16}
                    style={{
                      color: 'var(--text-muted)',
                      transform: isLinkDropdownOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s ease',
                    }}
                  />
                </div>
              </button>

              {/* Menu Flutuante */}
              {isLinkDropdownOpen && (
                <div className={styles.dropdownMenu}>
                  {/* Opção Desvincular / Foco Avulso */}
                  <div
                    onClick={() => {
                      linkTaskToPomodoro(null);
                      setIsLinkDropdownOpen(false);
                      sounds.playTick();
                    }}
                    className={`${styles.dropdownItem} ${styles.freeFocusItem} ${!pomodoro.linkedTaskId ? styles.dropdownItemActive : ''}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Sparkles size={14} />
                      <div>
                        <div>Foco Avulso (Sem vincular)</div>
                        <div
                          style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 400 }}
                        >
                          Sessão livre sem vincular a nenhuma atividade da rotina
                        </div>
                      </div>
                    </div>
                    {!pomodoro.linkedTaskId && <Check size={14} />}
                  </div>

                  <div className={styles.dropdownDivider} />

                  <div className={styles.dropdownHeader}>
                    Atividades da Rotina de Hoje ({todayTasks.length})
                  </div>

                  {todayTasks.length === 0 ? (
                    <div className={styles.emptyTasks}>
                      Nenhuma atividade encontrada para a rotina de hoje.
                    </div>
                  ) : (
                    todayTasks.map((t) => {
                      const isSelected = pomodoro.linkedTaskId === t.id;
                      const cat = categories.find((c) => c.id === t.categoryId);
                      const isTaskCompleted = !!logs[`${selectedDate}_${t.id}`]?.completed;

                      return (
                        <div
                          key={t.id}
                          onClick={() => {
                            linkTaskToPomodoro(t.id);
                            setIsLinkDropdownOpen(false);
                            sounds.playTick();
                          }}
                          className={`${styles.dropdownItem} ${isSelected ? styles.dropdownItemActive : ''}`}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              minWidth: 0,
                            }}
                          >
                            <div
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: cat?.color || '#6366F1',
                                flexShrink: 0,
                              }}
                            />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span
                                  style={{
                                    fontWeight: isSelected ? 700 : 500,
                                    color: 'var(--text-primary)',
                                  }}
                                >
                                  {t.title}
                                </span>
                                {isTaskCompleted && (
                                  <CheckCircle2
                                    size={12}
                                    style={{ color: 'var(--success, #10B981)', flexShrink: 0 }}
                                  />
                                )}
                              </div>
                              <div
                                style={{
                                  fontSize: '10px',
                                  color: 'var(--text-muted)',
                                  display: 'flex',
                                  gap: '6px',
                                  alignItems: 'center',
                                }}
                              >
                                <span>
                                  {t.startTime} - {t.endTime}
                                </span>
                                <span>•</span>
                                <span>{t.targetMinutes}m</span>
                                {cat && (
                                  <>
                                    <span>•</span>
                                    <span style={{ color: cat.color }}>{cat.name}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {isSelected && (
                            <Check
                              size={14}
                              style={{ color: 'var(--accent-primary, #6366F1)', flexShrink: 0 }}
                            />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Ajustador de Tempo Personalizado (RF-7) */}
          <div className={styles.adjustContainer}>
            <div>
              <span className={styles.settingsLabel}>Ajustar Duração do Ciclo</span>
              <p className={styles.settingsSubtitle}>
                Duração atual:{' '}
                <strong>{Math.floor(pomodoro.totalDurationSeconds / 60)} minutos</strong>
              </p>
            </div>

            <div className={styles.adjustButtons}>
              <button onClick={() => adjustMinutes(-5)} className={styles.adjustBtn}>
                -5 min
              </button>

              <button onClick={() => adjustMinutes(5)} className={styles.adjustBtn}>
                +5 min
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
