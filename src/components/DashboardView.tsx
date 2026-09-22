'use client';

import React, { useMemo, useState } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { calculateStreakAndMetrics, generateSqlDump, CategoryMetricItem } from '../lib/sqliteService';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import {
  Flame,
  Award,
  TrendingUp,
  Clock,
  Database,
  ShieldCheck,
  CheckCircle2,
  Code2,
  Calendar,
  Sparkles,
  Download,
  PieChart as PieIcon,
  Filter,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const tasks = useFlowStore((s) => s.tasks);
  const logs = useFlowStore((s) => s.logs);
  const backlog = useFlowStore((s) => s.backlog);
  const routineTypes = useFlowStore((s) => s.routineTypes);
  const selectedRoutineTypeId = useFlowStore((s) => s.selectedRoutineTypeId);
  const categories = useFlowStore((s) => s.categories);
  const theme = useFlowStore((s) => s.theme);

  // Filtro de Intervalo Temporal (RF-3 / Update 0.1.6)
  const [selectedRangePreset, setSelectedRangePreset] = useState<number | 'custom'>(14);

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const thirtyDaysAgoStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const [customStartDate, setCustomStartDate] = useState(thirtyDaysAgoStr);
  const [customEndDate, setCustomEndDate] = useState(todayStr);

  const currentRoutineType =
    routineTypes.find((rt) => rt.id === selectedRoutineTypeId) || routineTypes[0];

  const rangeOption = useMemo(() => {
    if (selectedRangePreset === 'custom') {
      return { startDate: customStartDate, endDate: customEndDate };
    }
    return { daysCount: selectedRangePreset };
  }, [selectedRangePreset, customStartDate, customEndDate]);

  // Cálculos de métricas memoizados (vercel-react-best-practices)
  const metrics = useMemo(() => {
    return calculateStreakAndMetrics(tasks, logs, selectedRoutineTypeId, categories, rangeOption);
  }, [tasks, logs, selectedRoutineTypeId, categories, rangeOption]);

  // Média de adesão no período selecionado
  const periodDays = metrics.historyDays || metrics.history14Days;
  const periodAvg = Math.round(
    periodDays.reduce((acc, curr) => acc + curr.percentage, 0) / (periodDays.length || 1)
  );

  // Total de horas focadas cumpridas no período
  const periodFocusedHours = (metrics.totalPeriodMinutes / 60).toFixed(1);

  // Exportar Dump SQLite Relacional
  const handleExportSqlite = () => {
    const dump = generateSqlDump(routineTypes, categories, tasks, logs, backlog);
    const blob = new Blob([dump], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flow_database_dump_${Date.now()}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Avaliação de Consistência Dinâmica
  const getEvolutionCriterion = () => {
    return {
      target: currentRoutineType?.philosophy || `Manter constância no ${currentRoutineType?.name}`,
      progress: `${metrics.currentStreak} dias consecutivos`,
      status:
        metrics.currentStreak >= 14
          ? 'Hábito Consolidado!'
          : metrics.currentStreak >= 7
          ? 'Excelente Consistência!'
          : 'Construindo Consistência Diária',
      isReady: metrics.currentStreak >= 7,
    };
  };

  const evolution = getEvolutionCriterion();

  // Texto explicativo do intervalo
  const rangeDescription =
    selectedRangePreset === 'custom'
      ? `${customStartDate} até ${customEndDate}`
      : `Últimos ${selectedRangePreset} dias`;

  return (
    <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Barra de Filtro de Intervalo Temporal (Update 0.1.6) */}
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
                {rangeDescription} ({periodDays.length} dias avaliados)
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
                  onClick={() => setSelectedRangePreset(p.value)}
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
              onClick={() => setSelectedRangePreset('custom')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: selectedRangePreset === 'custom' ? '1px solid #6366F1' : '1px solid var(--border-subtle)',
                background: selectedRangePreset === 'custom' ? 'rgba(99, 102, 241, 0.18)' : 'var(--bg-primary)',
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
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
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
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
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

      {/* 4 Cards de Métricas no Topo (Double-Bezel) */}
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
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
                {metrics.currentStreak}
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
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
              {metrics.totalPeriodMinutes} min de foco no intervalo
            </p>
          </div>
        </div>

        {/* Total Concluídas */}
        <div className="double-bezel-outer">
          <div className="double-bezel-inner" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
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
                {metrics.totalPeriodCompletedCount}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>check-ins</span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Histórico no período selecionado
            </p>
          </div>
        </div>
      </div>

      {/* Grid de Gráficos: Adesão Temporal + Gráfico de Pizza de Categorias (Update 0.1.6) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
          gap: '20px',
        }}
      >
        {/* Gráfico 1: Evolução da Adesão Diária */}
        <div className="double-bezel-outer">
          <div className="double-bezel-inner" style={{ padding: '24px 28px', height: '100%', display: 'flex', flexDirection: 'column' }}>
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
                  {rangeDescription} • {currentRoutineType?.name}
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
                  <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#6366F1' }} />
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
                    interval={periodDays.length > 14 ? (periodDays.length > 30 ? Math.floor(periodDays.length / 8) : 1) : 0}
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
                        const data = payload[0].payload;
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
                              <p style={{ color: 'var(--golden-rule)', fontSize: '11px', marginTop: '2px', fontWeight: 600 }}>
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

        {/* Gráfico 2: Distribuição por Categorias (Pizza/Donut) */}
        <div className="double-bezel-outer">
          <div className="double-bezel-inner" style={{ padding: '24px 28px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                {metrics.totalPeriodCompletedCount} concluídas
              </span>
            </div>

            {metrics.categoryDistribution.length === 0 ? (
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
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Nenhum check-in registrado neste período</span>
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
                        data={metrics.categoryDistribution}
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
                        {metrics.categoryDistribution.map((entry) => (
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
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: data.color }} />
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
                  {metrics.categoryDistribution.map((cat) => (
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
      </div>

      {/* Critério de Evolução de Nível & SQLite Export */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {/* Avaliação do Plano de Rotina */}
        <div className="double-bezel-outer">
          <div className="double-bezel-inner" style={{ padding: '22px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: evolution.isReady ? 'var(--success-bg)' : 'var(--golden-rule-bg)',
                  color: evolution.isReady ? 'var(--success)' : 'var(--golden-rule)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Award size={18} />
              </div>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 700 }}>
                  Consistência da Rotina
                </h4>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Foco ativo: {currentRoutineType?.name}
                </span>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '14px' }}>
              <strong>Meta:</strong> {evolution.target}
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
              <span style={{ fontWeight: 700, color: evolution.isReady ? 'var(--success)' : 'var(--golden-rule)' }}>
                {evolution.status}
              </span>
            </div>
          </div>
        </div>

        {/* Camada Relacional SQLite */}
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
                <h4 style={{ fontSize: '15px', fontWeight: 700 }}>
                  Banco de Dados SQLite Relacional
                </h4>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Tabelas `tasks`, `task_completions` e `backlog`
                </span>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '14px' }}>
              Todas as atividades, horários e histórico de conclusões são estruturados no schema relacional do SQLite v3.
            </p>

            <button
              onClick={handleExportSqlite}
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
      </div>
    </div>
  );
};
