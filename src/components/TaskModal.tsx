'use client';

import React, { useState, useEffect } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { Task } from '../types/routine';
import { X, Check, Calendar, RotateCw } from 'lucide-react';

export const TaskModal: React.FC = () => {
  const isOpen = useFlowStore((s) => s.isTaskModalOpen);
  const editingTask = useFlowStore((s) => s.editingTask);
  const selectedDate = useFlowStore((s) => s.selectedDate);
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
  const [frequencyScope, setFrequencyScope] = useState<'single_day' | 'all_days'>('single_day');
  const [targetDate, setTargetDate] = useState<string>('');

  useEffect(() => {
    const initialDate = editingTask?.specificDate || selectedDate;
    setTargetDate(initialDate);

    if (editingTask && editingTask.id) {
      setTitle(editingTask.title ?? '');
      setDescription(editingTask.description ?? '');
      setStartTime(editingTask.startTime || '14:00');
      setEndTime(editingTask.endTime || '15:00');
      setRoutineTypeId(editingTask.routineTypeId || selectedRoutineTypeId || routineTypes[0]?.id || '');
      setCategoryId(editingTask.categoryId || categories[0]?.id || '');
      setIsGoldenRule(!!editingTask.isGoldenRule);
      setNotes(editingTask.notes || '');

      if (editingTask.specificDate) {
        setFrequencyScope('single_day');
        setTargetDate(editingTask.specificDate);
      } else if (editingTask.daysOfWeek && editingTask.daysOfWeek.length === 7) {
        setFrequencyScope('all_days');
      } else {
        setFrequencyScope('all_days');
      }
    } else if (editingTask) {
      setTitle(editingTask.title ?? '');
      setDescription(editingTask.description ?? '');
      setStartTime(editingTask.startTime || '09:00');
      setEndTime(editingTask.endTime || '10:00');
      setRoutineTypeId(editingTask.routineTypeId || selectedRoutineTypeId || routineTypes[0]?.id || '');
      setCategoryId(editingTask.categoryId || categories[0]?.id || '');
      setIsGoldenRule(!!editingTask.isGoldenRule);
      setNotes(editingTask.notes || '');

      if (editingTask.specificDate) {
        setFrequencyScope('single_day');
        setTargetDate(editingTask.specificDate);
      } else {
        setFrequencyScope('single_day');
      }
    } else {
      setTitle('');
      setDescription('');
      setStartTime('14:00');
      setEndTime('15:00');
      setRoutineTypeId(selectedRoutineTypeId || routineTypes[0]?.id || '');
      setCategoryId(categories[0]?.id || '');
      setIsGoldenRule(false);
      setNotes('');
      setFrequencyScope('single_day');
      setTargetDate(selectedDate);
    }
  }, [editingTask, selectedRoutineTypeId, routineTypes, categories, isOpen, selectedDate]);

  if (!isOpen) return null;

  const formatFriendlyDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const weekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' });
    const dayAndMonth = dateObj.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });
    return `${weekday.toUpperCase()}, ${dayAndMonth}`;
  };

  // Calcular targetMinutes
  const calculateMinutes = (start: string, end: string) => {
    const [h1, m1] = (start || '09:00').split(':').map(Number);
    const [h2, m2] = (end || '10:00').split(':').map(Number);
    let diff = h2 * 60 + m2 - (h1 * 60 + m1);
    if (diff < 0) diff += 24 * 60; // atravessando meia noite
    return diff > 0 ? diff : 30;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = (title || '').trim();
    if (!cleanTitle) return;

    const matchedCat = categories.find((c) => c.id === categoryId);

    // Determina os dias da semana e data específica
    let finalDaysOfWeek: number[];
    let finalSpecificDate: string | undefined;

    if (frequencyScope === 'single_day') {
      const dateToUse = targetDate || selectedDate;
      finalSpecificDate = dateToUse;
      const [y, m, d] = dateToUse.split('-').map(Number);
      const dayOfWeek = new Date(y, m - 1, d).getDay();
      finalDaysOfWeek = [dayOfWeek];
    } else {
      // Para todos os dias
      finalSpecificDate = undefined;
      finalDaysOfWeek = [0, 1, 2, 3, 4, 5, 6];
    }

    saveTask({
      id: editingTask?.id || undefined,
      title: cleanTitle,
      description: (description || '').trim(),
      startTime: startTime || '09:00',
      endTime: endTime || '10:00',
      routineTypeId: routineTypeId || selectedRoutineTypeId || routineTypes[0]?.id || '',
      categoryId: categoryId || categories[0]?.id || '',
      isGoldenRule: !!isGoldenRule,
      daysOfWeek: finalDaysOfWeek,
      targetMinutes: calculateMinutes(startTime, endTime),
      tags: matchedCat ? [matchedCat.name] : (editingTask?.tags || []),
      notes: (notes || '').trim() || undefined,
      specificDate: finalSpecificDate,
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
                {editingTask?.id
                  ? 'Editar Atividade'
                  : editingTask?.specificDate
                    ? 'Nova Atividade no Calendário'
                    : 'Nova Atividade da Rotina'}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {editingTask?.specificDate
                  ? `Agendando atividade para o dia ${editingTask.specificDate}`
                  : 'Organize seu dia em blocos claros de foco'}
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
          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            {/* Title */}
            <div>
              <label
                style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}
              >
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
              <label
                style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}
              >
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

            {/* Frequência da Atividade: Só para este dia vs Para todos os dias */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '6px',
                  color: 'var(--text-primary)',
                }}
              >
                Frequência da Atividade *
              </label>
              <div
                data-testid="task-frequency-selector"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setFrequencyScope('single_day')}
                  data-testid="freq-single-day-btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    border: '1px solid',
                    borderColor:
                      frequencyScope === 'single_day'
                        ? 'var(--accent-primary)'
                        : 'var(--border-subtle)',
                    background:
                      frequencyScope === 'single_day'
                        ? 'rgba(99, 102, 241, 0.12)'
                        : 'var(--bg-primary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Calendar
                    size={16}
                    color={
                      frequencyScope === 'single_day'
                        ? 'var(--accent-primary)'
                        : 'var(--text-secondary)'
                    }
                  />
                  <div>
                    <span
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: 700,
                        color:
                          frequencyScope === 'single_day'
                            ? 'var(--accent-primary)'
                            : 'var(--text-primary)',
                      }}
                    >
                      Só para o dia
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                      {targetDate ? formatFriendlyDate(targetDate) : 'Data específica'}
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFrequencyScope('all_days')}
                  data-testid="freq-all-days-btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    border: '1px solid',
                    borderColor:
                      frequencyScope === 'all_days'
                        ? 'var(--accent-primary)'
                        : 'var(--border-subtle)',
                    background:
                      frequencyScope === 'all_days'
                        ? 'rgba(99, 102, 241, 0.12)'
                        : 'var(--bg-primary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <RotateCw
                    size={16}
                    color={
                      frequencyScope === 'all_days'
                        ? 'var(--accent-primary)'
                        : 'var(--text-secondary)'
                    }
                  />
                  <div>
                    <span
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: 700,
                        color:
                          frequencyScope === 'all_days'
                            ? 'var(--accent-primary)'
                            : 'var(--text-primary)',
                      }}
                    >
                      Para todos os dias
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                      Repete diariamente
                    </span>
                  </div>
                </button>
              </div>

              {/* Ajuste de data caso "Só para o dia" esteja selecionado */}
              {frequencyScope === 'single_day' && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '8px',
                    padding: '6px 12px',
                    background: 'var(--bg-elevated)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Aplicar na data:
                  </span>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      fontFamily: 'var(--font-sans)',
                      fontWeight: 600,
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  />
                </div>
              )}
            </div>

            {/* Times */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    marginBottom: '6px',
                  }}
                >
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
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    marginBottom: '6px',
                  }}
                >
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
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    marginBottom: '6px',
                  }}
                >
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
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    marginBottom: '6px',
                  }}
                >
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
                  Destaca as tarefas prioritárias que sustentam o seu dia e evitam a quebra de
                  sequência.
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

              <button type="submit" className="btn-island btn-island-primary">
                <span>{editingTask?.id ? 'Atualizar Atividade' : 'Salvar Atividade'}</span>
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
