'use client';

import React, { useState, useEffect } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { getTodayDateString } from '../store/slices/uiSlice';
import { timeToMinutes } from '../utils/routineReplan';
import {
  buildTimelineItems,
  calculateTimelineSummary,
  formatDurationHuman,
  TimelineIntervalItem,
} from '../utils/timelineLayout';
import { sounds } from '../utils/audio';
import styles from './TimelineView.module.css';
import {
  Clock,
  Check,
  Play,
  CheckSquare,
  Link2,
  Sparkles,
  Coffee,
  Plus,
  ShieldAlert,
  List,
} from 'lucide-react';

interface TimelineViewProps {
  showViewToggle?: boolean;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ showViewToggle = true }) => {
  const selectedDate = useFlowStore((s) => s.selectedDate);
  const tasks = useFlowStore((s) => s.tasks);
  const logs = useFlowStore((s) => s.logs);
  const categories = useFlowStore((s) => s.categories);
  const activeCategoryIdFilter = useFlowStore((s) => s.activeCategoryIdFilter);
  const toggleTaskCompletion = useFlowStore((s) => s.toggleTaskCompletion);
  const openTaskModal = useFlowStore((s) => s.openTaskModal);
  const openTaskDetail = useFlowStore((s) => s.openTaskDetail);
  const startPomodoro = useFlowStore((s) => s.startPomodoro);
  const shiftTaskTime = useFlowStore((s) => s.shiftTaskTime);
  const routineViewMode = useFlowStore((s) => s.routineViewMode || 'timeline');
  const setRoutineViewMode = useFlowStore((s) => s.setRoutineViewMode);

  // Tempo atual para o marcador "AGORA"
  const [currentNow, setCurrentNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentNow(new Date());
    }, 30000); // Atualiza a cada 30 segundos
    return () => clearInterval(timer);
  }, []);

  const todayStr = getTodayDateString();
  const isToday = selectedDate === todayStr;
  const nowMinutes = isToday
    ? currentNow.getHours() * 60 + currentNow.getMinutes()
    : undefined;
  const nowTimeFormatted = `${String(currentNow.getHours()).padStart(2, '0')}:${String(
    currentNow.getMinutes()
  ).padStart(2, '0')}`;

  // Filtra tarefas do dia selecionado
  const [year, month, day] = selectedDate.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  const dayOfWeek = dateObj.getDay();

  const filteredTasks = tasks.filter((task) => {
    if (activeCategoryIdFilter !== 'all' && task.categoryId !== activeCategoryIdFilter) {
      return false;
    }
    if (task.specificDate) {
      return task.specificDate === selectedDate;
    }
    return task.daysOfWeek.includes(dayOfWeek);
  });

  const timelineItems = buildTimelineItems(
    filteredTasks,
    logs,
    selectedDate,
    nowMinutes
  );
  const summary = calculateTimelineSummary(timelineItems);

  const handleToggleCheck = (taskId: string, currentStatus: string) => {
    if (currentStatus === 'completed') {
      sounds.playUncheck();
    } else {
      sounds.playCheck();
    }
    toggleTaskCompletion(taskId, selectedDate);
  };

  const handleAddInInterval = (interval: TimelineIntervalItem) => {
    openTaskModal({
      id: '',
      title: '',
      description: '',
      startTime: interval.startTime,
      endTime: interval.endTime,
      routineTypeId: 'main',
      categoryId: categories[0]?.id || '',
      daysOfWeek: [dayOfWeek],
      targetMinutes: interval.durationMinutes,
      tags: [],
    });
  };

  return (
    <div className={styles.container} data-testid="timeline-view">
      {/* Header Resumo da Timeline */}
      <div className={styles.overviewCard}>
        <div className={styles.overviewHeader}>
          <div className={styles.titleGroup}>
            <div className={styles.iconCircle}>
              <Clock size={18} />
            </div>
            <div>
              <h3 className={styles.mainTitle}>Cronograma Visual</h3>
              <p className={styles.subtitle}>
                Linha do tempo diária com blocos de tempo e intervalos livres
              </p>
            </div>
          </div>

          {/* Seletor de Modo de Visualização */}
          {showViewToggle && setRoutineViewMode && (
            <div className={styles.viewSwitchGroup} data-testid="timeline-view-switch">
              <button
                type="button"
                onClick={() => setRoutineViewMode('stream')}
                className={`${styles.viewSwitchBtn} ${
                  routineViewMode === 'stream' ? styles.viewSwitchBtnActive : ''
                }`}
                title="Visualização em Lista / Fluxo de Tarefas"
              >
                <List size={13} />
                <span>Lista</span>
              </button>
              <button
                type="button"
                onClick={() => setRoutineViewMode('timeline')}
                className={`${styles.viewSwitchBtn} ${
                  routineViewMode === 'timeline' ? styles.viewSwitchBtnActive : ''
                }`}
                title="Visualização em Cronograma / Linha do Tempo"
              >
                <Clock size={13} />
                <span>Cronograma</span>
              </button>
            </div>
          )}
        </div>

        {/* Linha de Estatísticas do Dia */}
        <div className={styles.statsRow}>
          <div className={styles.statBadge}>
            <Clock size={13} color="var(--accent-primary)" />
            <span>
              Planejado: <strong>{formatDurationHuman(summary.totalPlannedMinutes)}</strong>
            </span>
          </div>

          <div className={styles.statBadge}>
            <Check size={13} color="var(--success)" />
            <span>
              Concluídas:{' '}
              <strong>
                {summary.completedTasks}/{summary.totalTasks} ({summary.completionRate}%)
              </strong>
            </span>
          </div>

          {summary.freeMinutes > 0 && (
            <div className={styles.statBadge}>
              <Coffee size={13} color="#F59E0B" />
              <span>
                Intervalos: <strong>{formatDurationHuman(summary.freeMinutes)}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Barra de Progresso da Conclusão */}
        <div className={styles.progressBarContainer}>
          <div
            className={styles.progressBarFill}
            style={{ width: `${summary.completionRate}%` }}
          />
        </div>
      </div>

      {/* Conteúdo da Timeline */}
      {timelineItems.length === 0 ? (
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
              <Sparkles size={24} />
            </div>
            <h4 style={{ fontSize: '15px', fontWeight: 700 }}>
              Nenhuma atividade agendada neste cronograma
            </h4>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '320px' }}>
              Crie atividades para visualizar sua linha do tempo contínua no eixo vertical.
            </p>
            <button
              onClick={() => openTaskModal()}
              className="btn-primary"
              style={{ marginTop: '8px', fontSize: '13px' }}
            >
              + Criar Primeira Atividade
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.timelineTrack} data-testid="timeline-spine">
          {/* Eixo Vertical Contínuo */}
          <div className={styles.verticalSpine} />

          {/* Marcador AGORA se o horário for antes da primeira atividade */}
          {isToday &&
            nowMinutes !== undefined &&
            timelineItems.length > 0 &&
            nowMinutes < timeToMinutes(timelineItems[0].startTime) && (
              <div className={styles.nowMarkerRow} data-testid="now-marker">
                <div className={styles.nowTimeBadge}>{nowTimeFormatted}</div>
                <div className={styles.nowDot} />
                <div className={styles.nowLine} />
                <span className={styles.nowLabel}>Agora</span>
              </div>
            )}

          {/* Itens Cronológicos da Timeline */}
          {timelineItems.map((item, idx) => {
            if (item.type === 'interval') {
              return (
                <div
                  key={item.id}
                  className={styles.intervalRow}
                  data-testid={`timeline-interval-${idx}`}
                >
                  <div className={styles.intervalTimeCol}>
                    <span>{item.startTime}</span>
                  </div>

                  <div className={styles.intervalNode} />

                  <div
                    className={`${styles.intervalCard} ${
                      item.isCurrent ? styles.intervalCardActive : ''
                    }`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Coffee size={14} color="#F59E0B" />
                      <span>
                        Intervalo Livre • <strong>{formatDurationHuman(item.durationMinutes)}</strong>{' '}
                        ({item.startTime} - {item.endTime})
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddInInterval(item)}
                      className={styles.addInIntervalBtn}
                      title="Agendar nova atividade neste horário livre"
                    >
                      <Plus size={12} />
                      <span>Agendar</span>
                    </button>
                  </div>
                </div>
              );
            }

            // Task Item
            const task = item.task;
            const category = categories.find((c) => c.id === task.categoryId) || {
              id: task.categoryId,
              name: 'Geral',
              color: '#6366F1',
            };
            const checklist = task.checklist || [];
            const completedPassos = checklist.filter((p) => p.completed).length;
            const attachments = task.attachments || [];

            return (
              <React.Fragment key={item.id}>
                {/* Marcador AGORA se cair exatamente entre itens */}
                {isToday &&
                  nowMinutes !== undefined &&
                  idx > 0 &&
                  timelineItems[idx - 1].type === 'task' &&
                  nowMinutes >= timeToMinutes(timelineItems[idx - 1].endTime) &&
                  nowMinutes < timeToMinutes(item.startTime) && (
                    <div className={styles.nowMarkerRow} data-testid="now-marker">
                      <div className={styles.nowTimeBadge}>{nowTimeFormatted}</div>
                      <div className={styles.nowDot} />
                      <div className={styles.nowLine} />
                      <span className={styles.nowLabel}>Agora</span>
                    </div>
                  )}

                <div
                  className={styles.timelineRow}
                  data-testid={`timeline-task-${task.id}`}
                >
                  {/* Coluna de Horário */}
                  <div className={styles.timeCol}>
                    <span className={styles.timeStart}>{item.startTime}</span>
                    <span className={styles.timeEnd}>{item.endTime}</span>
                    <span className={styles.timeDuration}>
                      {formatDurationHuman(item.durationMinutes)}
                    </span>
                  </div>

                  {/* Nó Conector no Eixo Vertical */}
                  <div
                    className={`${styles.spineNode} ${
                      item.status === 'completed'
                        ? styles.spineNodeCompleted
                        : item.isCurrent
                          ? styles.spineNodeActive
                          : ''
                    }`}
                  />

                  {/* Card da Tarefa na Linha do Tempo */}
                  <div
                    className={`${styles.timelineCard} ${
                      item.status === 'completed'
                        ? styles.timelineCardCompleted
                        : item.isCurrent
                          ? styles.timelineCardActive
                          : ''
                    }`}
                  >
                    {/* Faixa lateral com cor da categoria */}
                    <div
                      className={styles.categoryColorStripe}
                      style={{ backgroundColor: category.color }}
                    />

                    {/* Detalhes da Atividade */}
                    <div style={{ flex: 1, paddingLeft: '4px' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          flexWrap: 'wrap',
                          marginBottom: '6px',
                        }}
                      >
                        {/* Categoria Pill */}
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: category.color,
                            backgroundColor: 'var(--bg-elevated)',
                            padding: '1px 7px',
                            borderRadius: '9999px',
                            border: `1px solid ${category.color}40`,
                          }}
                        >
                          {category.name}
                        </span>

                        {/* Regra de Ouro */}
                        {task.isGoldenRule && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '1px 6px',
                              borderRadius: '9999px',
                              fontSize: '10px',
                              fontWeight: 700,
                              color: 'var(--golden-rule)',
                              backgroundColor: 'var(--golden-rule-bg)',
                            }}
                          >
                            <ShieldAlert size={10} />
                            REGRA DE OURO
                          </span>
                        )}

                        {/* Status Em Andamento / Agora */}
                        {item.isCurrent && item.status !== 'completed' && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 800,
                              letterSpacing: '0.04em',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: 'var(--accent-primary)',
                              color: '#FFFFFF',
                            }}
                          >
                            EM ANDAMENTO
                          </span>
                        )}
                      </div>

                      {/* Título (clicável para abrir detalhes) */}
                      <h4
                        onClick={() => openTaskDetail(task.id)}
                        title="Abrir especificações da atividade"
                        style={{
                          fontSize: '14px',
                          fontWeight: 700,
                          color:
                            item.status === 'completed'
                              ? 'var(--text-muted)'
                              : 'var(--text-primary)',
                          textDecoration:
                            item.status === 'completed' ? 'line-through' : 'none',
                          cursor: 'pointer',
                          marginBottom: '4px',
                        }}
                      >
                        {task.title}
                      </h4>

                      {/* Descrição */}
                      {task.description && (
                        <p
                          style={{
                            fontSize: '12px',
                            color: 'var(--text-secondary)',
                            lineHeight: 1.4,
                            marginBottom: '6px',
                          }}
                        >
                          {task.description}
                        </p>
                      )}

                      {/* Badges de Subtarefas & Anexos */}
                      {(checklist.length > 0 || attachments.length > 0) && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginTop: '6px',
                          }}
                        >
                          {checklist.length > 0 && (
                            <span
                              onClick={() => openTaskDetail(task.id)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '10px',
                                fontWeight: 600,
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                              }}
                            >
                              <CheckSquare size={11} />
                              <span>
                                {completedPassos}/{checklist.length} passos
                              </span>
                            </span>
                          )}

                          {attachments.length > 0 && (
                            <span
                              onClick={() => openTaskDetail(task.id)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '10px',
                                fontWeight: 600,
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                              }}
                            >
                              <Link2 size={11} />
                              <span>{attachments.length} links</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Ações Rápidas no Card */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: '8px',
                        flexShrink: 0,
                      }}
                    >
                      {/* Checkbox Tátil */}
                      <button
                        type="button"
                        onClick={() => handleToggleCheck(task.id, item.status)}
                        title={
                          item.status === 'completed'
                            ? 'Marcar como pendente'
                            : 'Marcar como concluída'
                        }
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '8px',
                          border:
                            item.status === 'completed'
                              ? 'none'
                              : '2px solid var(--border-focus)',
                          backgroundColor:
                            item.status === 'completed' ? 'var(--success)' : 'transparent',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 180ms ease',
                          boxShadow:
                            item.status === 'completed'
                              ? '0 2px 8px rgba(16, 185, 129, 0.4)'
                              : 'none',
                        }}
                      >
                        {item.status === 'completed' && <Check size={14} strokeWidth={3} />}
                      </button>

                      {/* Botão de Iniciar Pomodoro */}
                      {item.status !== 'completed' && (
                        <button
                          type="button"
                          onClick={() => startPomodoro(task.id)}
                          title="Iniciar Pomodoro nesta atividade"
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-subtle)',
                            background: 'var(--bg-elevated)',
                            color: 'var(--text-secondary)',
                            fontSize: '11px',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                            transition: 'all 150ms ease',
                          }}
                        >
                          <Play size={10} fill="currentColor" />
                          <span>Foco</span>
                        </button>
                      )}

                      {/* Ajuste rápido de horário */}
                      {item.status !== 'completed' && (
                        <div style={{ display: 'inline-flex', gap: '3px' }}>
                          <button
                            type="button"
                            onClick={() => shiftTaskTime(task.id, -15)}
                            title="Adiantar 15 minutos"
                            style={{
                              padding: '1px 5px',
                              fontSize: '10px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-subtle)',
                              background: 'var(--bg-elevated)',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                            }}
                          >
                            -15m
                          </button>
                          <button
                            type="button"
                            onClick={() => shiftTaskTime(task.id, 15)}
                            title="Atrasar 15 minutos"
                            style={{
                              padding: '1px 5px',
                              fontSize: '10px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-subtle)',
                              background: 'var(--bg-elevated)',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                            }}
                          >
                            +15m
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};
