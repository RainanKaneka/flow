'use client';

import React, { useState } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { X, Plus, Trash2, Layers, Check } from 'lucide-react';

export const ManageRoutinesModal: React.FC = () => {
  const isOpen = useFlowStore((s) => s.isManageRoutinesModalOpen);
  const close = useFlowStore((s) => s.closeManageRoutinesModal);
  const routineTypes = useFlowStore((s) => s.routineTypes);
  const addRoutineType = useFlowStore((s) => s.addRoutineType);
  const deleteRoutineType = useFlowStore((s) => s.deleteRoutineType);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [philosophy, setPhilosophy] = useState('');
  const [color, setColor] = useState('#6366F1');

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addRoutineType({
      name: name.trim(),
      description: description.trim() || 'Tipo de rotina personalizado',
      philosophy: philosophy.trim() || undefined,
      color,
    });

    setName('');
    setDescription('');
    setPhilosophy('');
  };

  const presetColors = ['#6366F1', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#0EA5E9', '#14B8A6'];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 55,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={close}
    >
      <div
        className="double-bezel-outer"
        style={{ width: '100%', maxWidth: '520px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="double-bezel-inner" style={{ padding: '24px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 800 }}>Gerenciar Tipos de Rotina</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Crie focos, níveis ou momentos diferentes para a sua semana
              </p>
            </div>
            <button
              onClick={close}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Lista de Rotinas Existentes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '22px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Tipos Ativos ({routineTypes.length})
            </span>
            {routineTypes.map((rt) => (
              <div
                key={rt.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: rt.color || '#6366F1',
                    }}
                  />
                  <div>
                    <h5 style={{ fontSize: '13px', fontWeight: 700 }}>{rt.name}</h5>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{rt.description}</p>
                  </div>
                </div>

                {routineTypes.length > 1 && (
                  <button
                    onClick={() => {
                      if (window.confirm(`Deseja excluir "${rt.name}" e suas atividades associadas?`)) {
                        deleteRoutineType(rt.id);
                      }
                    }}
                    title="Excluir tipo de rotina"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Formulário: Criar Novo Tipo */}
          <form
            onSubmit={handleAdd}
            style={{
              padding: '16px',
              borderRadius: '14px',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-primary)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 700 }}>Criar Novo Tipo de Rotina</span>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>
                Nome do Tipo / Foco *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Fim de Semana, Foco em Projetos, Rotina Noturna"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>
                Descrição
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Rotina leve focada em lazer e descanso"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>
                Frase / Filosofia de Inspiração
              </label>
              <input
                type="text"
                value={philosophy}
                onChange={(e) => setPhilosophy(e.target.value)}
                placeholder="Ex: O descanso também faz parte do progresso."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>

            {/* Presets de Cor */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '6px' }}>
                Cor de Destaque
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {presetColors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: c,
                      border: color === c ? '2px solid var(--text-primary)' : 'none',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="btn-island btn-island-primary"
              style={{ marginTop: '8px', justifyContent: 'center' }}
            >
              <span>Salvar Tipo de Rotina</span>
              <div className="btn-circle-icon">
                <Plus size={14} strokeWidth={2.6} />
              </div>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
