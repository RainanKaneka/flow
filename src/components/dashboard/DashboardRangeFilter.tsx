import React from 'react';
import { Filter, Calendar } from 'lucide-react';

export interface DashboardRangeFilterProps {
  selectedRangePreset: number | 'custom';
  onSelectPreset: (preset: number | 'custom') => void;
  customStartDate: string;
  customEndDate: string;
  onCustomStartDateChange: (val: string) => void;
  onCustomEndDateChange: (val: string) => void;
  rangeDescription: string;
  evaluatedDaysCount: number;
}

export const DashboardRangeFilter: React.FC<DashboardRangeFilterProps> = ({
  selectedRangePreset,
  onSelectPreset,
  customStartDate,
  customEndDate,
  onCustomStartDateChange,
  onCustomEndDateChange,
  rangeDescription,
  evaluatedDaysCount,
}) => {
  return (
    <div
      className="double-bezel-outer"
      style={{
        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.08)',
      }}
    >
      <div
        className="double-bezel-inner"
        style={{
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(99, 102, 241, 0.12)',
              color: '#6366F1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Filter size={16} />
          </div>
          <div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Intervalo de Análise
            </span>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {rangeDescription} ({evaluatedDaysCount} dias avaliados)
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { label: '7 Dias', value: 7 },
            { label: '14 Dias', value: 14 },
            { label: '30 Dias', value: 30 },
            { label: '90 Dias', value: 90 },
          ].map((p) => {
            const isActive = selectedRangePreset === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => onSelectPreset(p.value)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: isActive ? '1px solid #6366F1' : '1px solid var(--border-subtle)',
                  background: isActive ? 'rgba(99, 102, 241, 0.18)' : 'var(--bg-primary)',
                  color: isActive ? '#818CF8' : 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {p.label}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => onSelectPreset('custom')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border:
                selectedRangePreset === 'custom'
                  ? '1px solid #6366F1'
                  : '1px solid var(--border-subtle)',
              background:
                selectedRangePreset === 'custom' ? 'rgba(99, 102, 241, 0.18)' : 'var(--bg-primary)',
              color: selectedRangePreset === 'custom' ? '#818CF8' : 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: selectedRangePreset === 'custom' ? 700 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <Calendar size={13} />
            <span>Personalizado</span>
          </button>

          {selectedRangePreset === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '6px' }}>
              <input
                type="date"
                aria-label="Data inicial personalizada"
                value={customStartDate}
                onChange={(e) => onCustomStartDateChange(e.target.value)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '11px',
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>até</span>
              <input
                type="date"
                aria-label="Data final personalizada"
                value={customEndDate}
                onChange={(e) => onCustomEndDateChange(e.target.value)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '11px',
                  outline: 'none',
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
