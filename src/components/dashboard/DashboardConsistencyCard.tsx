import React from 'react';
import { Award } from 'lucide-react';

export interface DashboardConsistencyCardProps {
  routineTypeName?: string;
  target: string;
  status: string;
  isReady: boolean;
}

export const DashboardConsistencyCard: React.FC<DashboardConsistencyCardProps> = ({
  routineTypeName,
  target,
  status,
  isReady,
}) => {
  return (
    <div className="double-bezel-outer">
      <div className="double-bezel-inner" style={{ padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              background: isReady ? 'var(--success-bg)' : 'var(--golden-rule-bg)',
              color: isReady ? 'var(--success)' : 'var(--golden-rule)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Award size={18} />
          </div>
          <div>
            <h4 style={{ fontSize: '15px', fontWeight: 700 }}>Consistência da Rotina</h4>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Foco ativo: {routineTypeName}
            </span>
          </div>
        </div>

        <p
          style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            marginBottom: '14px',
          }}
        >
          <strong>Meta:</strong> {target}
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderRadius: '12px',
            background: 'var(--bg-elevated)',
            fontSize: '12px',
          }}
        >
          <span style={{ fontWeight: 600 }}>Status Atual:</span>
          <span
            style={{
              fontWeight: 700,
              color: isReady ? 'var(--success)' : 'var(--golden-rule)',
            }}
          >
            {status}
          </span>
        </div>
      </div>
    </div>
  );
};
