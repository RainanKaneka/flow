import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import { CategoryMetricItem } from '../../lib/sqliteService';

export interface DashboardCategoryChartProps {
  categoryDistribution: CategoryMetricItem[];
  totalCompletedCount: number;
  theme: 'light' | 'dark';
}

export const DashboardCategoryChart: React.FC<DashboardCategoryChartProps> = ({
  categoryDistribution,
  totalCompletedCount,
  theme,
}) => {
  return (
    <div className="double-bezel-outer">
      <div
        className="double-bezel-inner"
        style={{
          padding: '24px 28px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <div>
            <h3
              style={{
                fontSize: '16px',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <PieIcon size={18} style={{ color: '#6366F1' }} />
              <span>Distribuição por Categorias</span>
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Tempo e tarefas concluídas por categoria no período
            </p>
          </div>

          <span
            style={{
              fontSize: '11px',
              padding: '3px 10px',
              borderRadius: '999px',
              background: 'rgba(99, 102, 241, 0.12)',
              color: '#6366F1',
              fontWeight: 600,
            }}
          >
            {totalCompletedCount} concluídas
          </span>
        </div>

        {categoryDistribution.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '220px',
              color: 'var(--text-muted)',
              textAlign: 'center',
              padding: '20px',
            }}
          >
            <PieIcon size={34} style={{ opacity: 0.25, marginBottom: '10px' }} />
            <span style={{ fontSize: '13px', fontWeight: 600 }}>
              Nenhum check-in registrado neste período
            </span>
            <span style={{ fontSize: '11px', opacity: 0.7, marginTop: '4px' }}>
              Complete tarefas na rotina diária para acompanhar sua distribuição
            </span>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              flexWrap: 'wrap',
              flex: 1,
              justifyContent: 'center',
            }}
          >
            {/* Gráfico Donut */}
            <div style={{ width: '170px', height: '170px', flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryDistribution}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={75}
                    paddingAngle={4}
                    stroke="var(--bg-primary)"
                    strokeWidth={2}
                  >
                    {categoryDistribution.map((entry) => (
                      <Cell key={`donut-${entry.id}`} fill={entry.color || '#6366F1'} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as CategoryMetricItem;
                        return (
                          <div
                            style={{
                              background: theme === 'dark' ? '#18181B' : '#FFFFFF',
                              border: '1px solid var(--border-subtle)',
                              padding: '10px 14px',
                              borderRadius: '12px',
                              boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                              fontSize: '12px',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                marginBottom: '4px',
                              }}
                            >
                              <div
                                style={{
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  background: data.color,
                                }}
                              />
                              <strong style={{ color: 'var(--text-primary)' }}>{data.name}</strong>
                            </div>
                            <p style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                              {data.count} tarefas ({data.percentage}%)
                            </p>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                              {data.hours}h de foco ({data.minutes} min)
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legendas de Categorias */}
            <div
              style={{
                flex: 1,
                minWidth: '160px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                maxHeight: '190px',
                overflowY: 'auto',
                paddingRight: '4px',
              }}
            >
              {categoryDistribution.map((cat) => (
                <div
                  key={cat.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '11px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: cat.color,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {cat.name}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{cat.hours}h</span>
                    <span
                      style={{
                        fontWeight: 700,
                        color: cat.color,
                        minWidth: '32px',
                        textAlign: 'right',
                      }}
                    >
                      {cat.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
