'use client';

import React, { useState } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { X, Plus, Trash2, Tag } from 'lucide-react';

export const ManageCategoriesModal: React.FC = () => {
  const isOpen = useFlowStore((s) => s.isManageCategoriesModalOpen);
  const close = useFlowStore((s) => s.closeManageCategoriesModal);
  const categories = useFlowStore((s) => s.categories);
  const addCategory = useFlowStore((s) => s.addCategory);
  const deleteCategory = useFlowStore((s) => s.deleteCategory);

  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366F1');

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addCategory({
      name: name.trim(),
      color,
    });

    setName('');
  };

  const presetColors = [
    '#6366F1',
    '#10B981',
    '#F59E0B',
    '#8B5CF6',
    '#EC4899',
    '#0EA5E9',
    '#F43F5E',
    '#14B8A6',
    '#84CC16',
  ];

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
        style={{
          width: '100%',
          maxWidth: '460px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="double-bezel-inner" style={{ padding: '24px', overflowY: 'auto' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '18px',
            }}
          >
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 800 }}>Gerenciar Categorias & Tags</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Organize suas atividades em áreas temáticas personalizadas
              </p>
            </div>
            <button
              onClick={close}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Categorias Existentes */}
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
              }}
            >
              Categorias Cadastradas ({categories.length})
            </span>
            {categories.map((c) => (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: c.color,
                    }}
                  />
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>{c.name}</span>
                </div>

                {categories.length > 1 && (
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          `Excluir categoria "${c.name}"? As tarefas atribuídas a ela serão migradas para a primeira categoria.`
                        )
                      ) {
                        deleteCategory(c.id);
                      }
                    }}
                    title="Excluir categoria"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Adicionar Categoria */}
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
            <span style={{ fontSize: '12px', fontWeight: 700 }}>Nova Categoria</span>

            <div>
              <label
                style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}
              >
                Nome da Categoria *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Treino, Faculdade, Leitura, Finanças"
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
              <label
                style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '6px' }}
              >
                Cor
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {presetColors.map((pc) => (
                  <button
                    key={pc}
                    type="button"
                    onClick={() => setColor(pc)}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: pc,
                      border: color === pc ? '2px solid var(--text-primary)' : 'none',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="btn-island btn-island-primary"
              style={{ marginTop: '6px', justifyContent: 'center' }}
            >
              <span>Adicionar Categoria</span>
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
