'use client';

import React from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { TaskCategory } from '../types/routine';
import {
  Code2,
  Heart,
  Activity,
  GraduationCap,
  Sparkles,
  Gamepad2,
  Clock,
  Layers,
} from 'lucide-react';

export const CategoryFilter: React.FC = () => {
  const activeCategory = useFlowStore((s) => s.activeCategoryFilter);
  const setCategoryFilter = useFlowStore((s) => s.setCategoryFilter);

  const categories: { id: TaskCategory | 'all'; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'Todas as Áreas', icon: <Layers size={13} /> },
    { id: 'coding', label: 'Programação', icon: <Code2 size={13} /> },
    { id: 'health', label: 'Saúde & Sono', icon: <Activity size={13} /> },
    { id: 'relationship', label: 'Call Namorada', icon: <Heart size={13} /> },
    { id: 'routine', label: 'Rotina Matinal/Tarde', icon: <Clock size={13} /> },
    { id: 'college', label: 'Faculdade', icon: <GraduationCap size={13} /> },
    { id: 'creative', label: 'Arte & RPG', icon: <Sparkles size={13} /> },
    { id: 'leisure', label: 'Lazer Livre', icon: <Gamepad2 size={13} /> },
  ];

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
      {categories.map((cat) => {
        const isActive = activeCategory === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => setCategoryFilter(cat.id)}
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
            {cat.icon}
            <span>{cat.label}</span>
          </button>
        );
      })}
    </div>
  );
};
