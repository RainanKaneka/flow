import React from 'react';
import { RoutineType } from '../../types/routine';
import { Plus } from 'lucide-react';

export interface HeaderRoutineSelectorProps {
  routineTypes: RoutineType[];
  selectedRoutineTypeId: string;
  onSelectRoutineType: (id: string) => void;
  onOpenManageModal: () => void;
}

export const HeaderRoutineSelector: React.FC<HeaderRoutineSelectorProps> = ({
  routineTypes,
  selectedRoutineTypeId,
  onSelectRoutineType,
  onOpenManageModal,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        background: 'var(--bg-secondary)',
        padding: '3px 6px 3px 4px',
        borderRadius: '9999px',
        border: '1px solid var(--border-subtle)',
        gap: '4px',
      }}
    >
      {routineTypes.map((rt) => {
        const active = selectedRoutineTypeId === rt.id;
        return (
          <button
            key={rt.id}
            onClick={() => onSelectRoutineType(rt.id)}
            title={rt.description}
            style={{
              padding: '5px 12px',
              borderRadius: '9999px',
              border: 'none',
              fontSize: '11px',
              fontWeight: active ? 700 : 500,
              cursor: 'pointer',
              backgroundColor: active ? 'var(--text-primary)' : 'transparent',
              color: active ? 'var(--bg-primary)' : 'var(--text-secondary)',
              transition: 'all 200ms var(--bezier-haptic)',
            }}
          >
            {rt.name}
          </button>
        );
      })}

      {/* Botão para gerenciar / criar tipos de rotina */}
      <button
        onClick={onOpenManageModal}
        title="Gerenciar ou Criar Tipos de Rotina"
        style={{
          width: '24px',
          height: '24px',
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
        <Plus size={12} strokeWidth={2.5} />
      </button>
    </div>
  );
};
