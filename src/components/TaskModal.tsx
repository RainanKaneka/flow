'use client';

import React, { useState, useEffect } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { Task, TaskCategory, RoutineLevel } from '../types/routine';
import { X, Check, Clock, Calendar, Sparkles } from 'lucide-react';

export const TaskModal: React.FC = () => {
  const isOpen = useFlowStore((s) => s.isTaskModalOpen);
  const editingTask = useFlowStore((s) => s.editingTask);
  const selectedLevel = useFlowStore((s) => s.selectedLevel);
  const closeTaskModal = useFlowStore((s) => s.closeTaskModal);
  const saveTask = useFlowStore((s) => s.saveTask);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('15:00');
  const [level, setLevel] = useState<RoutineLevel>('easy');
  const [category, setCategory] = useState<TaskCategory>('coding');
  const [isGoldenRule, setIsGoldenRule] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description);
      setStartTime(editingTask.startTime);
      setEndTime(editingTask.endTime);
      setLevel(editingTask.level);
      setCategory(editingTask.category);
      setIsGoldenRule(!!editingTask.isGoldenRule);
      setNotes(editingTask.notes || '');
    } else {
      setTitle('');
      setDescription('');
      setStartTime('14:00');
      setEndTime('15:00');
      setLevel(selectedLevel);
      setCategory('coding');
      setIsGoldenRule(false);
      setNotes('');
    }
  }, [editingTask, selectedLevel, isOpen]);

  if (!isOpen) return null;

  // Calcular targetMinutes
  const calculateMinutes = (start: string, end: string) => {
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (diff < 0) diff += 24 * 60; // atravessando meia noite
    return diff > 0 ? diff : 30;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    saveTask({
      id: editingTask?.id,
      title: title.trim(),
      description: description.trim(),
      startTime,
      endTime,
      level,
      category,
      isGoldenRule,
      daysOfWeek: [1, 2, 3, 4, 5],
      targetMinutes: calculateMinutes(startTime, endTime),
      tags: [category],
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={closeTaskModal}
    >
      <div
        className="double-bezel-outer"
        style={{
          width: '100%',
          maxWidth: '520px',
          boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.4)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="double-bezel-inner"
          style={{
            padding: '24px 28px',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
            }}
          >
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em' }}>
                {editingTask ? 'Editar Atividade' : 'Nova Atividade da Rotina'}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Organize seu dia em blocos claros de foco
              </p>
            </div>
            <button
              onClick={closeTaskModal}
              style={{
                width: '32px',
                height: '32px',
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
              <X size={16} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Title */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                Nome da Atividade *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Estudo de Rust / Projetos"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  fontFamily: 'var(--font-sans)',
                  outline: 'none',
                }}
              />
            </div>

            {/* Description */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                Instruções Práticas / Descrição
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="O que você deve fazer especificamente nessa janela de tempo..."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontFamily: 'var(--font-sans)',
                  outline: 'none',
                  resize: 'none',
                }}
              />
            </div>

            {/* Times */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                  Horário Início
                </label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontFamily: 'var(--font-mono)',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                  Horário Fim
                </label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontFamily: 'var(--font-mono)',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Category & Level */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                  Categoria
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as TaskCategory)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontFamily: 'var(--font-sans)',
                    outline: 'none',
                  }}
                >
                  <option value="coding">Programação</option>
                  <option value="routine">Rotina & Hábitos</option>
                  <option value="health">Saúde & Sono</option>
                  <option value="relationship">Call Namorada</option>
                  <option value="college">Faculdade</option>
                  <option value="creative">Arte & RPG</option>
                  <option value="leisure">Lazer Livre</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                  Nível de Dificuldade
                </label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value as RoutineLevel)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontFamily: 'var(--font-sans)',
                    outline: 'none',
                  }}
                >
                  <option value="easy">Nível Fácil</option>
                  <option value="medium">Nível Médio</option>
                  <option value="hard">Nível Difícil</option>
                </select>
              </div>
            </div>

            {/* Regra de Ouro Toggle */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                padding: '8px 12px',
                borderRadius: '10px',
                background: isGoldenRule ? 'var(--golden-rule-bg)' : 'var(--bg-elevated)',
                border: '1px solid',
                borderColor: isGoldenRule ? 'var(--golden-rule)' : 'var(--border-subtle)',
                marginTop: '4px',
              }}
            >
              <input
                type="checkbox"
                checked={isGoldenRule}
                onChange={(e) => setIsGoldenRule(e.target.checked)}
                style={{ accentColor: 'var(--golden-rule)', width: '16px', height: '16px' }}
              />
              <div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--golden-rule)' }}>
                  Regra de Ouro (Inegociável)
                </span>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Destaca hábitos vitais que evitam a procrastinação (ex: não ficar na cama).
                </p>
              </div>
            </label>

            {/* Actions */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '10px',
                marginTop: '12px',
              }}
            >
              <button
                type="button"
                onClick={closeTaskModal}
                style={{
                  padding: '8px 16px',
                  borderRadius: '9999px',
                  border: '1px solid var(--border-subtle)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="btn-island btn-island-primary"
              >
                <span>{editingTask ? 'Atualizar Atividade' : 'Salvar Atividade'}</span>
                <div className="btn-circle-icon">
                  <Check size={14} strokeWidth={2.8} />
                </div>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
