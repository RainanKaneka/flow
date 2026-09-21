'use client';

import React from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { Layers, Plus, Tag } from 'lucide-react';

export const CategoryFilter: React.FC = () => {
  const categories = useFlowStore((s) => s.categories);
  const activeCategoryId = useFlowStore((s) => s.activeCategoryIdFilter);
  const setCategoryIdFilter = useFlowStore((s) => s.setCategoryIdFilter);
  const openManageCategoriesModal = useFlowStore((s) => s.openManageCategoriesModal);

  return (
    <div
      style={{
        padding: '4px 28px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        overflowX: 'auto',
        scrollbarWidth: 'none',
      }}
    >
      {/* Botão Todas as Áreas */}
      <button
        onClick={() => setCategoryIdFilter('all')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 14px',
          borderRadius: '9999px',
          fontSize: '12px',
          fontWeight: activeCategoryId === 'all' ? 700 : 500,
          cursor: 'pointer',
          border: '1px solid',
          borderColor: activeCategoryId === 'all' ? 'transparent' : 'var(--border-subtle)',
          backgroundColor: activeCategoryId === 'all' ? 'var(--text-primary)' : 'var(--bg-secondary)',
          color: activeCategoryId === 'all' ? 'var(--bg-primary)' : 'var(--text-secondary)',
          transition: 'all 200ms cubic-bezier(0.32, 0.72, 0, 1)',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        <Layers size={13} />
        <span>Todas as Áreas</span>
      </button>

      {/* Categorias Dinâmicas */}
      {categories.map((cat) => {
        const isActive = activeCategoryId === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => setCategoryIdFilter(cat.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: isActive ? 700 : 500,
              cursor: 'pointer',
              border: '1px solid',
              borderColor: isActive ? 'transparent' : 'var(--border-subtle)',
              backgroundColor: isActive ? 'var(--text-primary)' : 'var(--bg-secondary)',
              color: isActive ? 'var(--bg-primary)' : 'var(--text-secondary)',
              transition: 'all 200ms cubic-bezier(0.32, 0.72, 0, 1)',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: cat.color || '#6366F1',
              }}
            />
            <span>{cat.name}</span>
          </button>
        );
      })}

      {/* Botão Gerenciar Categorias */}
      <button
        onClick={openManageCategoriesModal}
        title="Gerenciar / Criar Categorias"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '6px 12px',
          borderRadius: '9999px',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          border: '1px dashed var(--border-focus)',
          backgroundColor: 'transparent',
          color: 'var(--accent-primary)',
          transition: 'all 200ms cubic-bezier(0.32, 0.72, 0, 1)',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        <Plus size={12} strokeWidth={2.5} />
        <span>Gerenciar Categorias</span>
      </button>
    </div>
  );
};
