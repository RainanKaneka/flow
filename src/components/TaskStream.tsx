'use client';

import React, { useState } from 'react';
import { Task } from '../types/routine';
import { useFlowStore } from '../store/useFlowStore';
import { TaskCard } from './TaskCard';
import { Sparkles, ArrowUpDown } from 'lucide-react';

interface TaskStreamProps {
  tasks: Task[];
}

export const TaskStream: React.FC<TaskStreamProps> = ({ tasks }) => {
  const reorderTasks = useFlowStore((s) => s.reorderTasks);
  const shiftTaskTime = useFlowStore((s) => s.shiftTaskTime);
  const openTaskModal = useFlowStore((s) => s.openTaskModal);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggingId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', taskId);
    } catch {
      // Fallback para ambientes restritos de teste
    }
  };

  const handleDragOver = (e: React.DragEvent, taskId: string) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    if (dragOverId !== taskId) {
      setDragOverId(taskId);
    }
  };

  const handleDragLeave = (_e: React.DragEvent, taskId: string) => {
    if (dragOverId === taskId) {
      setDragOverId(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    let sourceId = draggingId;
    try {
      const dataId = e.dataTransfer.getData('text/plain');
      if (dataId) sourceId = dataId;
    } catch {
      // Usar draggingId como fallback
    }

    if (sourceId && sourceId !== targetTaskId) {
      const filteredTaskIds = tasks.map((t) => t.id);
      reorderTasks(sourceId, targetTaskId, filteredTaskIds);
    }

    setDraggingId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
  };

  if (!tasks || tasks.length === 0) {
    return (
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
          <div>
            <h4
              style={{
                fontSize: '15px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: '4px',
              }}
            >
              Nenhuma atividade para este dia
            </h4>
            <p
              style={{
                fontSize: '13px',
                color: 'var(--text-muted)',
                maxWidth: '320px',
              }}
            >
              Aproveite para descansar, adicionar novas tarefas ou planejar sua rotina semanal.
            </p>
          </div>
          <button
            onClick={() => openTaskModal()}
            className="btn-primary"
            style={{ marginTop: '8px', fontSize: '13px' }}
          >
            + Criar Primeira Atividade
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="task-stream"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {tasks.length > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '6px',
            padding: '0 4px',
            fontSize: '11px',
            color: 'var(--text-muted)',
          }}
        >
          <ArrowUpDown size={12} />
          <span>Arraste pelo ícone ⋮⋮ para reordenar a sequência e recalcular horários</span>
        </div>
      )}

      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          isDragging={draggingId === task.id}
          isDragOver={dragOverId === task.id && draggingId !== task.id}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          onShiftTime={(delta) => shiftTaskTime(task.id, delta)}
        />
      ))}
    </div>
  );
};
