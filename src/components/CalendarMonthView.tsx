'use client';

import React, { useState } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { getTodayDateString } from '../store/slices/uiSlice';
import { Task } from '../types/routine';
import {
  buildMonthCalendarDays,
  calculateMonthSummary,
  getPrevMonth,
  getNextMonth,
  WEEKDAY_NAMES_PT,
  CalendarDayData,
} from '../utils/calendarMonth';
import { sounds } from '../utils/audio';
import styles from './CalendarMonthView.module.css';
import { MoveToBacklogModal } from './MoveToBacklogModal';
import { DeleteTaskConfirmModal } from './DeleteTaskConfirmModal';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  Plus,
  Check,
  Star,
  Target,
  Inbox,
  Trash2,
} from 'lucide-react';

export const CalendarMonthView: React.FC = () => {
  const selectedDate = useFlowStore((s) => s.selectedDate);
  const setDate = useFlowStore((s) => s.setDate);
  const tasks = useFlowStore((s) => s.tasks);
  const logs = useFlowStore((s) => s.logs);
  const categories = useFlowStore((s) => s.categories);
  const setActiveView = useFlowStore((s) => s.setActiveView);
  const toggleTaskCompletion = useFlowStore((s) => s.toggleTaskCompletion);
  const openTaskModal = useFlowStore((s) => s.openTaskModal);
  const openTaskDetail = useFlowStore((s) => s.openTaskDetail);
  const selectedRoutineTypeId = useFlowStore((s) => s.selectedRoutineTypeId);
  const routineTypes = useFlowStore((s) => s.routineTypes);
  const deleteTask = useFlowStore((s) => s.deleteTask);
  const moveTaskToBacklog = useFlowStore((s) => s.moveTaskToBacklog);

  const [backlogTargetTask, setBacklogTargetTask] = useState<Task | null>(null);
  const [deleteTargetTask, setDeleteTargetTask] = useState<Task | null>(null);

  const todayStr = getTodayDateString();

  // Estado de navegação de Mês/Ano (iniciado a partir de selectedDate)
  const [initYear, initMonth] = selectedDate.split('-').map(Number);
  const [viewState, setViewState] = useState<{ year: number; month: number }>({
    year: initYear || new Date().getFullYear(),
    month: (initMonth ? initMonth - 1 : new Date().getMonth()),
  });

  const handlePrevMonth = () => {
    sounds.playTick();
    setViewState((prev) => getPrevMonth(prev.year, prev.month));
  };

  const handleNextMonth = () => {
    sounds.playTick();
    setViewState((prev) => getNextMonth(prev.year, prev.month));
  };

  const handleToday = () => {
    sounds.playTick();
    const today = new Date();
    setViewState({ year: today.getFullYear(), month: today.getMonth() });
    setDate(todayStr);
  };

  const days = buildMonthCalendarDays(
    viewState.year,
    viewState.month,
    selectedDate,
    todayStr,
    tasks,
    logs,
    categories
  );

  const summary = calculateMonthSummary(days, viewState.year, viewState.month);

  const selectedDay = days.find((d) => d.dateStr === selectedDate) || days[0];

  const handleSelectDay = (day: CalendarDayData) => {
    sounds.playTick();
    setDate(day.dateStr);
  };

  const handleCheck = (taskId: string, isCompleted: boolean) => {
    if (!isCompleted) {
      sounds.playCheck();
    } else {
      sounds.playUncheck();
    }
    toggleTaskCompletion(taskId, selectedDate);
  };

  const handleOpenNewTask = () => {
    sounds.playTick();
    const [y, m, d] = (selectedDate || todayStr).split('-').map(Number);
    const dayOfWeek = new Date(y, (m || 1) - 1, d || 1).getDay();

    openTaskModal({
      id: '',
      title: '',
      description: '',
      startTime: '09:00',
      endTime: '10:00',
      routineTypeId: selectedRoutineTypeId || routineTypes[0]?.id || '',
      categoryId: categories[0]?.id || '',
      isGoldenRule: false,
      daysOfWeek: [dayOfWeek],
      targetMinutes: 60,
      tags: [],
      specificDate: selectedDate,
    } as Task);
  };

  // Formata o dia selecionado por extenso
  const formatSelectedDateFull = (dateStr: string): string => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className={styles.container} data-testid="calendar-month-view">
      {/* Header de Controle de Mês e Métricas */}
      <div className={styles.headerCard}>
        <div className={styles.topControls}>
          <div className={styles.navGroup}>
            <div className={styles.monthTitle}>
              {summary.monthName} de {summary.year}
            </div>

            <button
              type="button"
              onClick={handlePrevMonth}
              className={styles.navBtn}
              title="Mês anterior"
              aria-label="Mês anterior"
            >
              <ChevronLeft size={16} />
            </button>

            <button
              type="button"
              onClick={handleNextMonth}
              className={styles.navBtn}
              title="Próximo mês"
              aria-label="Próximo mês"
            >
              <ChevronRight size={16} />
            </button>

            <button
              type="button"
              onClick={handleToday}
              className={styles.todayBtn}
              title="Ir para o mês atual"
            >
              Hoje
            </button>
          </div>

          {/* Resumo Consolidado do Mês */}
          <div className={styles.monthStatsRow}>
            <div className={styles.statBadge}>
              <Target size={13} color="var(--accent-primary)" />
              <span>
                Adesão:{' '}
                <strong>{summary.averageCompletionRate}%</strong>
              </span>
            </div>

            <div className={styles.statBadge}>
              <CheckCircle2 size={13} color="var(--success)" />
              <span>
                Concluídas:{' '}
                <strong>
                  {summary.totalCompletedTasks}/{summary.totalScheduledTasks}
                </strong>
              </span>
            </div>

            {summary.perfectDaysCount > 0 && (
              <div className={styles.statBadge}>
                <Star size={13} color="#F59E0B" fill="#F59E0B" />
                <span>
                  Dias 100%:{' '}
                  <strong>{summary.perfectDaysCount}</strong>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grade Mensal de 7 Colunas */}
      <div className={styles.calendarGridContainer} data-testid="calendar-grid">
        {/* Cabeçalho dos Dias da Semana */}
        <div className={styles.weekdayHeader}>
          {WEEKDAY_NAMES_PT.map((w, idx) => (
            <div key={idx} className={styles.weekdayLabel}>
              {w}
            </div>
          ))}
        </div>

        {/* Células de cada dia do mês */}
        <div className={styles.daysGrid}>
          {days.map((day) => {
            const hasTasks = day.totalTasks > 0;
            const progressColor =
              day.completionRate === 100
                ? 'var(--success)'
                : day.completionRate > 0
                  ? 'var(--accent-primary)'
                  : 'var(--text-muted)';

            return (
              <div
                key={day.dateStr}
                onClick={() => handleSelectDay(day)}
                className={`${styles.dayCell} ${
                  !day.isCurrentMonth ? styles.dayCellOtherMonth : ''
                } ${day.isToday ? styles.dayCellToday : ''} ${
                  day.isSelected ? styles.dayCellSelected : ''
                }`}
                data-testid={`calendar-day-${day.dateStr}`}
              >
                {/* Linha superior: Número do dia e badges */}
                <div className={styles.cellTopRow}>
                  <span className={styles.dayNumber}>{day.dayNumber}</span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    {day.isToday && (
                      <span className={styles.todayIndicatorBadge}>Hoje</span>
                    )}
                    {day.isPerfectDay && (
                      <span title="100% concluído" style={{ display: 'inline-flex' }}>
                        <Star size={10} color="#F59E0B" fill="#F59E0B" />
                      </span>
                    )}
                  </div>
                </div>

                {/* Linha de progresso e completude */}
                {hasTasks && (
                  <div>
                    <div className={styles.dayProgressRow}>
                      <span>
                        {day.completedTasks}/{day.totalTasks}
                      </span>
                      <span style={{ fontWeight: 700, color: progressColor }}>
                        {day.completionRate}%
                      </span>
                    </div>

                    <div className={styles.miniProgressBar}>
                      <div
                        className={styles.miniProgressFill}
                        style={{
                          width: `${day.completionRate}%`,
                          backgroundColor: progressColor,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Prévia das Tarefas */}
                <div className={styles.taskListPreview}>
                  {day.tasks.slice(0, 3).map((task) => {
                    const isDone = !!logs[`${day.dateStr}_${task.id}`]?.completed;
                    const cat = categories.find((c) => c.id === task.categoryId) || {
                      id: task.categoryId,
                      name: 'Geral',
                      color: '#6366F1',
                    };

                    return (
                      <div
                        key={task.id}
                        className={`${styles.taskPill} ${isDone ? styles.taskPillCompleted : ''}`}
                        title={`${task.title} (${task.startTime} - ${task.endTime})`}
                      >
                        <div
                          className={styles.taskDot}
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className={styles.taskPillText}>
                          {task.title}
                        </span>
                      </div>
                    );
                  })}

                  {day.tasks.length > 3 && (
                    <div className={styles.moreTasksText}>
                      +{day.tasks.length - 3} mais
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Painel Inspetor do Dia Selecionado */}
      <div className={styles.selectedDayInspector} data-testid="selected-day-inspector">
        <div className={styles.inspectorHeader}>
          <div>
            <h4 className={styles.inspectorTitle}>
              {formatSelectedDateFull(selectedDate)}
            </h4>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {selectedDay.totalTasks > 0
                ? `${selectedDay.completedTasks} de ${selectedDay.totalTasks} tarefas concluídas (${selectedDay.completionRate}%)`
                : 'Nenhuma atividade programada para este dia'}
            </span>
          </div>

          <div className={styles.inspectorActions}>
            <button
              type="button"
              onClick={() => setActiveView('routine')}
              className={styles.actionBtnSecondary}
              title="Abrir este dia no fluxo diário da Rotina"
            >
              <CheckCircle2 size={13} />
              <span>Abrir na Rotina</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('timeline')}
              className={styles.actionBtnSecondary}
              title="Abrir este dia no Cronograma Visual"
            >
              <Clock size={13} />
              <span>Abrir Cronograma</span>
            </button>

            <button
              type="button"
              onClick={handleOpenNewTask}
              className={styles.actionBtnPrimary}
              title="Criar nova atividade para esta data"
            >
              <Plus size={13} strokeWidth={2.5} />
              <span>Nova Atividade</span>
            </button>
          </div>
        </div>

        {/* Lista de Atividades do Dia Selecionado */}
        {selectedDay.tasks.length > 0 ? (
          <div className={styles.inspectorTasksList}>
            {selectedDay.tasks.map((task) => {
              const isDone = !!logs[`${selectedDate}_${task.id}`]?.completed;
              const cat = categories.find((c) => c.id === task.categoryId) || {
                id: task.categoryId,
                name: 'Geral',
                color: '#6366F1',
              };

              return (
                <div key={task.id} className={styles.inspectorTaskItem}>
                  <div className={styles.inspectorTaskInfo}>
                    <button
                      type="button"
                      onClick={() => handleCheck(task.id, isDone)}
                      title={isDone ? 'Marcar como pendente' : 'Marcar como concluída'}
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '6px',
                        border: isDone ? 'none' : '2px solid var(--border-focus)',
                        backgroundColor: isDone ? 'var(--success)' : 'transparent',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      {isDone && <Check size={13} strokeWidth={3} />}
                    </button>

                    <div>
                      <div
                        onClick={() => openTaskDetail(task.id)}
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: isDone ? 'var(--text-muted)' : 'var(--text-primary)',
                          textDecoration: isDone ? 'line-through' : 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {task.title}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginTop: '2px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            color: cat.color,
                          }}
                        >
                          {cat.name}
                        </span>
                        <span className={styles.inspectorTaskTime}>
                          {task.startTime} - {task.endTime} ({task.targetMinutes}m)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Ações da Tarefa: Mover para o Backlog e Excluir */}
                  <div className={styles.inspectorTaskActions}>
                    <button
                      type="button"
                      onClick={() => setBacklogTargetTask(task)}
                      title="Mover para o Backlog"
                      className={styles.rowActionBtn}
                      data-testid={`calendar-move-backlog-${task.id}`}
                    >
                      <Inbox size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteTargetTask(task)}
                      title="Excluir atividade"
                      className={`${styles.rowActionBtn} ${styles.rowActionBtnDanger}`}
                      data-testid={`calendar-delete-${task.id}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              padding: '28px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              Aproveite este dia livre ou clique no botão abaixo para planejar novas tarefas.
            </p>
            <button
              type="button"
              onClick={handleOpenNewTask}
              className={styles.actionBtnPrimary}
            >
              <Plus size={13} strokeWidth={2.5} />
              <span>Adicionar Atividade neste Dia</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal de Confirmação para Mover para o Backlog */}
      <MoveToBacklogModal
        isOpen={!!backlogTargetTask}
        taskTitle={backlogTargetTask?.title || ''}
        onConfirm={() => {
          if (backlogTargetTask) {
            moveTaskToBacklog(backlogTargetTask.id, selectedDate);
            setBacklogTargetTask(null);
          }
        }}
        onCancel={() => setBacklogTargetTask(null)}
      />

      {/* Modal de Confirmação para Excluir Atividade */}
      <DeleteTaskConfirmModal
        isOpen={!!deleteTargetTask}
        taskTitle={deleteTargetTask?.title || ''}
        onConfirm={() => {
          if (deleteTargetTask) {
            deleteTask(deleteTargetTask.id);
            setDeleteTargetTask(null);
          }
        }}
        onCancel={() => setDeleteTargetTask(null)}
      />
    </div>
  );
};
