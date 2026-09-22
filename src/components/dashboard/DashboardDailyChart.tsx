import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export interface DailyAdherenceDay {
  date: string;
  displayDate: string;
  percentage: number;
  completed: number;
  total: number;
  goldenRulesDone: boolean;
}

export interface DashboardDailyChartProps {
  periodDays: DailyAdherenceDay[];
  rangeDescription: string;
  routineTypeName?: string;
  theme: 'light' | 'dark';
}

export const DashboardDailyChart: React.FC<DashboardDailyChartProps> = ({
  periodDays,
  rangeDescription,
  routineTypeName,
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
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Adesão Diária à Rotina
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {rangeDescription} • {routineTypeName}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                color: 'var(--text-secondary)',
              }}
            >
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '3px',
                  background: '#6366F1',
                }}
              />
              <span>% Conclusão</span>
            </span>
          </div>
        </div>

        <div style={{ width: '100%', height: '240px', flex: 1 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={periodDays} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="displayDate"
                tickLine={false}
                axisLine={{ stroke: 'var(--border-subtle)' }}
                tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                interval={
                  periodDays.length > 14
                    ? periodDays.length > 30
                      ? Math.floor(periodDays.length / 8)
                      : 1
                    : 0
                }
              />
              <YAxis
                domain={[0, 100]}
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as DailyAdherenceDay;
                    return (
                      <div
                        style={{
                          background: theme === 'dark' ? '#18181B' : '#FFFFFF',
                          border: '1px solid var(--border-subtle)',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                          fontSize: '12px',
                        }}
                      >
                        <p style={{ fontWeight: 700, marginBottom: '4px' }}>{data.date}</p>
                        <p style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                          Adesão: {data.percentage}%
                        </p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                          {data.completed} de {data.total} tarefas cumpridas
                        </p>
                        {data.goldenRulesDone && (
                          <p
                            style={{
                              color: 'var(--golden-rule)',
                              fontSize: '11px',
                              marginTop: '2px',
                              fontWeight: 600,
                            }}
                          >
                            ⭐ Regras de Ouro Mantidas
                          </p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="percentage" radius={[5, 5, 0, 0]}>
                {periodDays.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.percentage === 100
                        ? '#10B981'
                        : entry.percentage >= 60
                          ? '#6366F1'
                          : entry.percentage > 0
                            ? '#F59E0B'
                            : 'rgba(128, 128, 128, 0.2)'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
