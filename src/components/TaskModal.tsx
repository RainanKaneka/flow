'use client';

import React, { useState, useEffect } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { Task } from '../types/routine';
import { X, Check, Clock, Calendar, Sparkles } from 'lucide-react';

export const TaskModal: React.FC = () => {
  const isOpen = useFlowStore((s) => s.isTaskModalOpen);
  const editingTask = useFlowStore((s) => s.editingTask);
  const routineTypes = useFlowStore((s) => s.routineTypes);
  const selectedRoutineTypeId = useFlowStore((s) => s.selectedRoutineTypeId);
  const categories = useFlowStore((s) => s.categories);
  const closeTaskModal = useFlowStore((s) => s.closeTaskModal);
  const saveTask = useFlowStore((s) => s.saveTask);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('15:00');
  const [routineTypeId, setRoutineTypeId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isGoldenRule, setIsGoldenRule] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description);
      setStartTime(editingTask.startTime);
      setEndTime(editingTask.endTime);
      setRoutineTypeId(editingTask.routineTypeId);
      setCategoryId(editingTask.categoryId);
      setIsGoldenRule(!!editingTask.isGoldenRule);
      setNotes(editingTask.notes || '');
    } else {
      setTitle('');
      setDescription('');
      setStartTime('14:00');
      setEndTime('15:00');
      setRoutineTypeId(selectedRoutineTypeId || routineTypes[0]?.id || '');
      setCategoryId(categories[0]?.id || '');
      setIsGoldenRule(false);
      setNotes('');
    }
  }, [editingTask, selectedRoutineTypeId, routineTypes, categories, isOpen]);

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

    const matchedCat = categories.find((c) => c.id === categoryId);

    saveTask({
      id: editingTask?.id,
      title: title.trim(),
      description: description.trim(),
      startTime,
      endTime,
      routineTypeId: routineTypeId || selectedRoutineTypeId,
      categoryId: categoryId || categories[0]?.id,
      isGoldenRule,
      daysOfWeek: [1, 2, 3, 4, 5],
      targetMinutes: calculateMinutes(startTime, endTime),
      tags: matchedCat ? [matchedCat.name] : [],
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

            {/* Category & Routine Type */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                  Categoria / Área
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
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
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                  Tipo de Rotina
                </label>
                <select
                  value={routineTypeId}
                  onChange={(e) => setRoutineTypeId(e.target.value)}
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
                  {routineTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      {rt.name}
                    </option>
                  ))}
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
                  Regra de Ouro (Hábito Âncora Inegociável)
                </span>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Destaca as tarefas prioritárias que sustentam o seu dia e evitam a quebra de sequência.
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
