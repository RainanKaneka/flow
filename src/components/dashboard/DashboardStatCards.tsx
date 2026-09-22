import React from 'react';
import { Flame, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';

export interface DashboardStatCardsProps {
  currentStreak: number;
  periodAvg: number;
  rangeDescription: string;
  periodFocusedHours: string;
  totalPeriodMinutes: number;
  totalPeriodCompletedCount: number;
}

export const DashboardStatCards: React.FC<DashboardStatCardsProps> = ({
  currentStreak,
  periodAvg,
  rangeDescription,
  periodFocusedHours,
  totalPeriodMinutes,
  totalPeriodCompletedCount,
}) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '16px',
      }}
    >
      {/* Streak */}
      <div className="double-bezel-outer">
        <div className="double-bezel-inner" style={{ padding: '18px 20px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Sequência Atual
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: 'var(--golden-rule-bg)',
                color: 'var(--golden-rule)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Flame size={18} strokeWidth={2.4} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {currentStreak}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>dias seguidos</span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Sem quebrar as Regras de Ouro
          </p>
        </div>
      </div>

      {/* Média Semanal / Período */}
      <div className="double-bezel-outer">
        <div className="double-bezel-inner" style={{ padding: '18px 20px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Adesão no Período
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: 'var(--accent-soft)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TrendingUp size={18} strokeWidth={2.4} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {periodAvg}%
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>média</span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {rangeDescription}
          </p>
        </div>
      </div>

      {/* Tempo Focado */}
      <div className="double-bezel-outer">
        <div className="double-bezel-inner" style={{ padding: '18px 20px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Tempo Focado
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: 'rgba(99, 102, 241, 0.12)',
                color: '#6366F1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Clock size={18} strokeWidth={2.4} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {periodFocusedHours}h
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>acumuladas</span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {totalPeriodMinutes} min de foco no intervalo
          </p>
        </div>
      </div>

      {/* Total Concluídas */}
      <div className="double-bezel-outer">
        <div className="double-bezel-inner" style={{ padding: '18px 20px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Metas Concluídas
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: 'var(--success-bg)',
                color: 'var(--success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle2 size={18} strokeWidth={2.4} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {totalPeriodCompletedCount}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>check-ins</span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Histórico no período selecionado
          </p>
        </div>
      </div>
    </div>
  );
};
