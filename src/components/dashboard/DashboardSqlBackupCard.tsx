import React from 'react';
import { Database, Download } from 'lucide-react';

export interface DashboardSqlBackupCardProps {
  onExportSqlite: () => void;
}

export const DashboardSqlBackupCard: React.FC<DashboardSqlBackupCardProps> = ({
  onExportSqlite,
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
              background: 'rgba(14, 165, 233, 0.12)',
              color: '#0EA5E9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Database size={18} />
          </div>
          <div>
            <h4 style={{ fontSize: '15px', fontWeight: 700 }}>Banco de Dados SQLite Relacional</h4>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Tabelas `tasks`, `task_completions` e `backlog`
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
          Todas as atividades, horários e histórico de conclusões são estruturados no schema
          relacional do SQLite v3.
        </p>

        <button
          onClick={onExportSqlite}
          className="btn-island btn-island-primary"
          style={{ width: '100%', justifyContent: 'center' }}
        >
          <span>Exportar Backup SQLite (.sql)</span>
          <div className="btn-circle-icon">
            <Download size={14} strokeWidth={2.6} />
          </div>
        </button>
      </div>
    </div>
  );
};
