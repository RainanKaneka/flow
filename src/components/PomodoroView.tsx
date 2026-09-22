'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { PomodoroMode } from '../types/routine';
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
  Clock,
  Sliders,
  Bell,
  Layers,
  ChevronDown,
  Check,
  X,
} from 'lucide-react';

export const PomodoroView: React.FC = () => {
  const pomodoro = useFlowStore((s) => s.pomodoro);
  const tasks = useFlowStore((s) => s.tasks);
  const routineTypes = useFlowStore((s) => s.routineTypes);
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
  const linkedTaskTime = linkedTask ? logs[`${selectedDate}_${linkedTask.id}`]?.timeSpentMinutes || 0 : 0;

  // Formatação de minutos e segundos
  const minutes = Math.floor(pomodoro.timeLeftSeconds / 60);
  const seconds = pomodoro.timeLeftSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Progresso do círculo SVG
  const progressPercent =
    pomodoro.totalDurationSeconds > 0
      ? ((pomodoro.totalDurationSeconds - pomodoro.timeLeftSeconds) / pomodoro.totalDurationSeconds) * 100
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
    <div
      style={{
        padding: '24px 28px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
        maxWidth: '720px',
        margin: '0 auto',
      }}
    >
      {/* Top Banner de Status / Pomodoro Vinculado */}
      <div
        className="double-bezel-outer"
        style={{ width: '100%' }}
      >
        <div
          className="double-bezel-inner"
          style={{
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'var(--accent-soft)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Timer size={20} strokeWidth={2.4} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '-0.01em' }}>
                Pomodoro de Alta Performance
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {linkedTask
                  ? `Vinculado a: ${linkedTask.title} (${linkedTaskTime} min acumulados hoje)`
                  : 'Foco livre ou vincule a uma tarefa da rotina abaixo'}
              </p>
            </div>
          </div>

          {/* Contador de Ciclos */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '9999px',
              background: 'var(--golden-rule-bg)',
              color: 'var(--golden-rule)',
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            <Flame size={14} />
            <span>{pomodoro.completedSessions} Blocos Cumpridos</span>
          </div>
        </div>
      </div>

      {/* Seletor de Modo (Foco, Pausa Curta, Pausa Longa) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--bg-secondary)',
          padding: '4px',
          borderRadius: '9999px',
          border: '1px solid var(--border-subtle)',
          gap: '4px',
        }}
      >
        <button
          onClick={() => setPomodoroMode('focus')}
          style={{
            padding: '7px 18px',
            borderRadius: '9999px',
            border: 'none',
            fontSize: '12px',
            fontWeight: pomodoro.mode === 'focus' ? 700 : 500,
            cursor: 'pointer',
            backgroundColor: pomodoro.mode === 'focus' ? 'var(--text-primary)' : 'transparent',
            color: pomodoro.mode === 'focus' ? 'var(--bg-primary)' : 'var(--text-secondary)',
            transition: 'all 200ms cubic-bezier(0.32, 0.72, 0, 1)',
          }}
        >
          Foco (25m)
        </button>

        <button
          onClick={() => setPomodoroMode('shortBreak')}
          style={{
            padding: '7px 18px',
            borderRadius: '9999px',
            border: 'none',
            fontSize: '12px',
            fontWeight: pomodoro.mode === 'shortBreak' ? 700 : 500,
            cursor: 'pointer',
            backgroundColor: pomodoro.mode === 'shortBreak' ? 'var(--text-primary)' : 'transparent',
            color: pomodoro.mode === 'shortBreak' ? 'var(--bg-primary)' : 'var(--text-secondary)',
            transition: 'all 200ms cubic-bezier(0.32, 0.72, 0, 1)',
          }}
        >
          Pausa Curta (5m)
        </button>

        <button
          onClick={() => setPomodoroMode('longBreak')}
          style={{
            padding: '7px 18px',
            borderRadius: '9999px',
            border: 'none',
            fontSize: '12px',
            fontWeight: pomodoro.mode === 'longBreak' ? 700 : 500,
            cursor: 'pointer',
            backgroundColor: pomodoro.mode === 'longBreak' ? 'var(--text-primary)' : 'transparent',
            color: pomodoro.mode === 'longBreak' ? 'var(--bg-primary)' : 'var(--text-secondary)',
            transition: 'all 200ms cubic-bezier(0.32, 0.72, 0, 1)',
          }}
        >
          Pausa Longa (15m)
        </button>
      </div>

      {/* Relógio Circular Principal (Double-Bezel Circular) */}
      <div
        className="double-bezel-outer"
        style={{
          borderRadius: '50%',
          width: '320px',
          height: '320px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: pomodoro.isActive
            ? `0 0 40px -10px ${modeColor}55, 0 12px 32px rgba(0,0,0,0.2)`
            : '0 12px 32px rgba(0,0,0,0.15)',
          transition: 'box-shadow 400ms ease',
        }}
      >
        <div
          className="double-bezel-inner"
          style={{
            borderRadius: '50%',
            width: '308px',
            height: '308px',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* SVG Progress Ring */}
          <svg
            width="308"
            height="308"
            style={{
              position: 'absolute',
              inset: 0,
              transform: 'rotate(-90deg)',
            }}
          >
            <circle
              cx="154"
              cy="154"
              r={radius}
              stroke="var(--bg-elevated)"
              strokeWidth="10"
              fill="transparent"
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
              style={{
                transition: 'stroke-dashoffset 800ms linear, stroke 300ms ease',
              }}
            />
          </svg>

          {/* Central Time Display */}
          <div style={{ zIndex: 10, textAlign: 'center' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: modeColor,
              }}
            >
              {pomodoro.mode === 'focus' ? 'Modo Foco' : 'Recuperação'}
            </span>

            <h1
              style={{
                fontSize: '62px',
                fontWeight: 800,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
                color: 'var(--text-primary)',
                margin: '2px 0 6px',
              }}
            >
              {formattedTime}
            </h1>

            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {pomodoro.isActive ? 'Foco absoluto em andamento...' : 'Pausado'}
            </p>
          </div>
        </div>
      </div>

      {/* Botões de Ação Principais */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Resetar */}
        <button
          onClick={() => resetPomodoro()}
          title="Resetar tempo do ciclo"
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 200ms',
          }}
        >
          <RotateCcw size={18} />
        </button>

        {/* Iniciar / Pausar (Button-in-Button) */}
        {pomodoro.isActive ? (
          <button
            onClick={pausePomodoro}
            className="btn-island"
            style={{
              padding: '12px 28px',
              fontSize: '15px',
              background: 'var(--text-primary)',
              color: 'var(--bg-primary)',
            }}
          >
            <span>Pausar</span>
            <div className="btn-circle-icon" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
              <Pause size={14} fill="currentColor" />
            </div>
          </button>
        ) : (
          <button
            onClick={() => startPomodoro()}
            className="btn-island btn-island-primary"
            style={{
              padding: '12px 32px',
              fontSize: '15px',
            }}
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
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 200ms',
          }}
        >
          <SkipForward size={18} />
        </button>
      </div>

      {/* Ajuste Customizado & Vinculação com Tarefas (RF-13, RF-7) */}
      <div
        className="double-bezel-outer"
        style={{ width: '100%', marginTop: '6px' }}
      >
        <div
          className="double-bezel-inner"
          style={{
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* Vinculação de Tarefa */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
              Vincular a uma Atividade da Rotina de Hoje (RF-13)
            </label>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              O tempo focado nesta sessão será somado automaticamente ao histórico real da atividade.
            </p>

            {/* Custom Dropdown Seletor de Atividades */}
            <div ref={linkDropdownRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => {
                  setIsLinkDropdownOpen((prev) => !prev);
                  sounds.playTick();
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: isLinkDropdownOpen
                    ? '1px solid var(--accent-primary, #6366F1)'
                    : '1px solid var(--border-subtle)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  cursor: 'pointer',
                  outline: 'none',
                  boxShadow: isLinkDropdownOpen ? '0 0 0 3px rgba(99, 102, 241, 0.15)' : 'none',
                  transition: 'all 0.2s ease',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                  {linkedTask ? (
                    <>
                      <div
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: categories.find((c) => c.id === linkedTask.categoryId)?.color || '#6366F1',
                          flexShrink: 0,
                          boxShadow: `0 0 8px ${categories.find((c) => c.id === linkedTask.categoryId)?.color || '#6366F1'}80`,
                        }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {linkedTask.title}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {linkedTask.startTime} - {linkedTask.endTime} • {linkedTask.targetMinutes} min
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

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {linkedTask && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        linkTaskToPomodoro(null);
                        sounds.playTick();
                      }}
                      title="Desvincular atividade"
                      style={{
                        padding: '3px',
                        borderRadius: '6px',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
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
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 0,
                    right: 0,
                    zIndex: 60,
                    backgroundColor: 'var(--bg-elevated, #18181B)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '14px',
                    boxShadow: '0 16px 40px -8px rgba(0, 0, 0, 0.6)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    padding: '8px',
                    maxHeight: '290px',
                    overflowY: 'auto',
                  }}
                >
                  {/* Opção Desvincular / Foco Avulso */}
                  <div
                    onClick={() => {
                      linkTaskToPomodoro(null);
                      setIsLinkDropdownOpen(false);
                      sounds.playTick();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '9px 12px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      backgroundColor: !pomodoro.linkedTaskId ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                      color: !pomodoro.linkedTaskId ? 'var(--accent-primary, #6366F1)' : 'var(--text-primary)',
                      fontSize: '12px',
                      fontWeight: !pomodoro.linkedTaskId ? 600 : 500,
                      marginBottom: '6px',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Sparkles size={14} />
                      <div>
                        <div>Foco Avulso (Sem vincular)</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 400 }}>
                          Sessão livre sem vincular a nenhuma atividade da rotina
                        </div>
                      </div>
                    </div>
                    {!pomodoro.linkedTaskId && <Check size={14} />}
                  </div>

                  <div
                    style={{
                      height: '1px',
                      background: 'var(--border-subtle)',
                      margin: '4px 6px 8px',
                    }}
                  />

                  <div
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: 'var(--text-muted)',
                      padding: '2px 8px 6px',
                    }}
                  >
                    Atividades da Rotina de Hoje ({todayTasks.length})
                  </div>

                  {todayTasks.length === 0 ? (
                    <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
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
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '9px 12px',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                            color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                            fontSize: '12px',
                            marginBottom: '3px',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
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
                                <span style={{ fontWeight: isSelected ? 700 : 500, color: 'var(--text-primary)' }}>
                                  {t.title}
                                </span>
                                {isTaskCompleted && (
                                  <CheckCircle2 size={12} style={{ color: 'var(--success, #10B981)', flexShrink: 0 }} />
                                )}
                              </div>
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <span>{t.startTime} - {t.endTime}</span>
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

                          {isSelected && <Check size={14} style={{ color: 'var(--accent-primary, #6366F1)', flexShrink: 0 }} />}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Ajustador de Tempo Personalizado (RF-7) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 700 }}>Ajustar Duração do Ciclo</span>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Duração atual: <strong>{Math.floor(pomodoro.totalDurationSeconds / 60)} minutos</strong>
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => adjustMinutes(-5)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                -5 min
              </button>

              <button
                onClick={() => adjustMinutes(5)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                +5 min
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
