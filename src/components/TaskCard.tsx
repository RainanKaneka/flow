'use client';

import React from 'react';
import { Task } from '../types/routine';
import { useFlowStore } from '../store/useFlowStore';
import { sounds } from '../utils/audio';
import {
  Check,
  Clock,
  CheckCircle2,
  ShieldAlert,
  Edit2,
  Trash2,
  Inbox,
} from 'lucide-react';

interface TaskCardProps {
  task: Task;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  const selectedDate = useFlowStore((s) => s.selectedDate);
  const logs = useFlowStore((s) => s.logs);
  const categories = useFlowStore((s) => s.categories);
  const toggleTaskCompletion = useFlowStore((s) => s.toggleTaskCompletion);
  const openTaskModal = useFlowStore((s) => s.openTaskModal);
  const deleteTask = useFlowStore((s) => s.deleteTask);
  const moveTaskToBacklog = useFlowStore((s) => s.moveTaskToBacklog);

  const category = categories.find((c) => c.id === task.categoryId) || {
    id: task.categoryId,
    name: 'Geral',
    color: '#6366F1',
  };

  const key = `${selectedDate}_${task.id}`;
  const log = logs[key];
  const isCompleted = !!log?.completed;
  const completedAt = log?.completedAt;

  const handleCheck = () => {
    if (!isCompleted) {
      sounds.playCheck();
    } else {
      sounds.playUncheck();
    }
    toggleTaskCompletion(task.id, selectedDate);
  };

  return (
    <div
      className="double-bezel-outer"
      style={{
        transition: 'all 280ms cubic-bezier(0.32, 0.72, 0, 1)',
        opacity: isCompleted ? 0.75 : 1,
        borderColor: task.isGoldenRule && !isCompleted ? 'rgba(245, 158, 11, 0.25)' : undefined,
      }}
    >
      <div
        className="double-bezel-inner"
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '16px',
          backgroundColor: isCompleted ? 'var(--bg-elevated)' : 'var(--bg-secondary)',
        }}
      >
        {/* Left Checkbox & Time Indicator */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1 }}>
          {/* Haptic Checkbox */}
          <button
            onClick={handleCheck}
            title={isCompleted ? 'Marcar como pendente' : 'Marcar como concluída'}
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '8px',
              border: isCompleted
                ? 'none'
                : task.isGoldenRule
                ? '2px solid var(--golden-rule)'
                : '2px solid var(--border-focus)',
              backgroundColor: isCompleted ? 'var(--success)' : 'transparent',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              marginTop: '2px',
              transition: 'all 200ms cubic-bezier(0.32, 0.72, 0, 1)',
              boxShadow: isCompleted ? '0 2px 8px rgba(16, 185, 129, 0.35)' : 'none',
            }}
          >
            {isCompleted && <Check size={16} strokeWidth={3} />}
          </button>

          {/* Details */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
              {/* Category Pill Dinâmica */}
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: category.color,
                  backgroundColor: 'var(--bg-elevated)',
                  border: `1px solid ${category.color}40`,
                }}
              >
                <div
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: category.color,
                  }}
                />
                <span>{category.name}</span>
              </span>

              {/* Golden Rule Badge */}
              {task.isGoldenRule && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    color: 'var(--golden-rule)',
                    backgroundColor: 'var(--golden-rule-bg)',
                  }}
                >
                  <ShieldAlert size={11} />
                  REGRA DE OURO
                </span>
              )}

              {/* Custom Task Tag */}
              {task.isCustom && (
                <span
                  style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-muted)',
                    fontWeight: 600,
                  }}
                >
                  CUSTOM
                </span>
              )}
            </div>

            {/* Title */}
            <h4
              style={{
                fontSize: '15px',
                fontWeight: 700,
                color: isCompleted ? 'var(--text-muted)' : 'var(--text-primary)',
                textDecoration: isCompleted ? 'line-through' : 'none',
                letterSpacing: '-0.01em',
                marginBottom: '4px',
              }}
            >
              {task.title}
            </h4>

            {/* Description */}
            <p
              style={{
                fontSize: '13px',
                lineHeight: 1.45,
                color: 'var(--text-secondary)',
                marginBottom: '8px',
              }}
            >
              {task.description}
            </p>

            {/* Notes se houver */}
            {task.notes && (
              <p
                style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  fontStyle: 'italic',
                  marginBottom: '8px',
                }}
              >
                💡 {task.notes}
              </p>
            )}

            {/* Timings (RF-4: Horário Previsto e Horário Real Concluído) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                flexWrap: 'wrap',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {/* Horário Previsto */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-secondary)' }}>
                <Clock size={13} color="var(--accent-primary)" />
                <span>
                  Previsto: <strong>{task.startTime} - {task.endTime}</strong> ({task.targetMinutes}m)
                </span>
              </div>

              {/* Horário Real de Conclusão */}
              {isCompleted && completedAt && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    color: 'var(--success)',
                    fontWeight: 600,
                  }}
                >
                  <CheckCircle2 size={13} />
                  <span>Concluído às {completedAt}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {!isCompleted && (
            <button
              onClick={() => {
                if (window.confirm(`Mover "${task.title}" para a lista de pendências (Backlog)?`)) {
                  moveTaskToBacklog(task.id, selectedDate);
                }
              }}
              title="Mover para o Backlog (tarefa pendente)"
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--bg-elevated)',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 200ms',
              }}
            >
              <Inbox size={13} />
            </button>
          )}

          <button
            onClick={() => openTaskModal(task)}
            title="Editar atividade"
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 200ms',
            }}
          >
            <Edit2 size={13} />
          </button>

          {task.isCustom && (
            <button
              onClick={() => deleteTask(task.id)}
              title="Excluir atividade customizada"
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                border: 'none',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 200ms',
              }}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
