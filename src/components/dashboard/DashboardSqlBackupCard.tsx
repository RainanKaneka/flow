import React from 'react';
import { Database, Download, FileSpreadsheet, ArrowUpRight } from 'lucide-react';
import { useFlowStore } from '../../store/useFlowStore';

export interface DashboardSqlBackupCardProps {
  onExportSqlite: () => void;
  onOpenExportHub?: () => void;
}

export const DashboardSqlBackupCard: React.FC<DashboardSqlBackupCardProps> = ({
  onExportSqlite,
  onOpenExportHub,
}) => {
  const openBackupModal = useFlowStore((s) => s.openBackupModal);

  const handleOpenHub = () => {
    if (onOpenExportHub) {
      onOpenExportHub();
    } else {
      openBackupModal('export');
    }
  };

  return (
    <div className="double-bezel-outer">
      <div className="double-bezel-inner" style={{ padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
              <h4 style={{ fontSize: '15px', fontWeight: 700 }}>Dados & Persistência Relacional</h4>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                SQLite Nativo • Exportação JSON, CSV e SQL
              </span>
            </div>
          </div>

          <span
            style={{
              fontSize: '10px',
              fontWeight: 600,
              color: '#10B981',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              padding: '2px 8px',
              borderRadius: '9999px',
            }}
          >
            Fase 2
          </span>
        </div>

        <p
          style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            marginBottom: '14px',
          }}
        >
          Seus dados estão protegidos no banco de dados local <code>flow.db</code>. Exporte todo o ecossistema em JSON, planilhas CSV para o Excel ou scripts SQL.
        </p>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onExportSqlite}
            className="btn-island"
            style={{ flex: 1, justifyContent: 'center', fontSize: '12px' }}
            title="Baixar dump com DDL e DML SQL"
          >
            <span>Dump SQL (.sql)</span>
            <div className="btn-circle-icon">
              <Download size={13} strokeWidth={2.6} />
            </div>
          </button>

          <button
            onClick={handleOpenHub}
            className="btn-island btn-island-primary"
            style={{ flex: 1, justifyContent: 'center', fontSize: '12px' }}
            title="Abrir modal para exportar em JSON, CSV ou importar dados"
          >
            <FileSpreadsheet size={14} />
            <span>Exportar JSON / CSV</span>
            <ArrowUpRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
