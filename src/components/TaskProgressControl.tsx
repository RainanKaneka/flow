'use client';

import React from 'react';
import { CheckCircle2, CircleDot, Play } from 'lucide-react';
import { Task, TaskLog } from '../types/routine';
import { useFlowStore } from '../store/useFlowStore';
import { canStartTask, getTaskProgressStatus } from '../utils/taskProgress';
import styles from './TaskProgressControl.module.css';

interface TaskProgressBadgeProps {
  status: 'pending' | 'in_progress' | 'completed';
}

export const TaskProgressBadge: React.FC<TaskProgressBadgeProps> = ({ status }) => {
  if (status === 'pending') return null;

  const isCompleted = status === 'completed';
  const Icon = isCompleted ? CheckCircle2 : CircleDot;

  return (
    <span
      className={`${styles.badge} ${isCompleted ? styles.completed : styles.inProgress}`}
      role="status"
    >
      <Icon size={12} aria-hidden="true" />
      {isCompleted ? 'Concluída' : 'Em andamento'}
    </span>
  );
};

interface TaskStartButtonProps {
  task: Task;
  date: string;
  log?: TaskLog;
  now: Date;
  compact?: boolean;
}

export const TaskStartButton: React.FC<TaskStartButtonProps> = ({
  task,
  date,
  log,
  now,
  compact = false,
}) => {
  const startTask = useFlowStore((s) => s.startTask);
  const status = getTaskProgressStatus(task, log, date, now);

  if (status !== 'pending') return null;

  const canStart = canStartTask(task, date, now);

  return (
    <button
      type="button"
      className={`${styles.startButton} ${compact ? styles.compact : ''}`}
      disabled={!canStart}
      aria-label="Iniciar tarefa"
      title={
        canStart ? 'Iniciar tarefa' : 'Disponível na data da tarefa, antes do horário de término'
      }
      onClick={(event) => {
        event.stopPropagation();
        if (canStartTask(task, date, new Date())) startTask(task.id, date);
      }}
    >
      <Play size={compact ? 12 : 14} aria-hidden="true" />
      {!compact && <span>Iniciar tarefa</span>}
    </button>
  );
};
