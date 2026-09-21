'use client';

import React, { useMemo } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { calculateStreakAndMetrics, generateSqlDump } from '../lib/sqliteService';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
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
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const tasks = useFlowStore((s) => s.tasks);
  const logs = useFlowStore((s) => s.logs);
  const backlog = useFlowStore((s) => s.backlog);
  const selectedLevel = useFlowStore((s) => s.selectedLevel);
  const theme = useFlowStore((s) => s.theme);

  // Cálculos de métricas memoizados (vercel-react-best-practices)
  const metrics = useMemo(() => {
    return calculateStreakAndMetrics(tasks, logs, selectedLevel);
  }, [tasks, logs, selectedLevel]);

  // Médias dos últimos 7 dias
  const last7Days = metrics.history14Days.slice(7);
  const weeklyAvg = Math.round(
    last7Days.reduce((acc, curr) => acc + curr.percentage, 0) / (last7Days.length || 1)
  );
  const totalTasksCompleted = Object.values(logs).filter((l) => l.completed).length;

  // Total de horas de programação focadas
  const codingMinutes = metrics.categoryTime['coding']?.minutes || 0;
  const codingHours = (codingMinutes / 60).toFixed(1);

  // Exportar Dump SQLite
  const handleExportSqlite = () => {
    const dump = generateSqlDump(tasks, logs, backlog);
    const blob = new Blob([dump], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flow_database_dump_${Date.now()}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Avaliação de Transição de Nível
  const getEvolutionCriterion = () => {
    if (selectedLevel === 'easy') {
      return {
        target: '10 dias úteis com 45m de código e sem celular na cama',
        progress: `${metrics.currentStreak}/10 dias`,
        status: metrics.currentStreak >= 8 ? 'Pronto para o Nível Médio!' : 'Construindo consistência no Nível Fácil',
        isReady: metrics.currentStreak >= 8,
      };
    }
    if (selectedLevel === 'medium') {
      return {
        target: '3 a 4 semanas mantendo acordar 09:30 e rotação criativa',
        progress: `${metrics.currentStreak}/20 dias`,
        status: metrics.currentStreak >= 16 ? 'Pronto para a Alta Performance!' : 'Consolidando Nível Médio',
        isReady: metrics.currentStreak >= 16,
      };
    }
    return {
      target: 'Estado da Arte: 100% dos hábitos ativos',
      progress: `${metrics.currentStreak} dias consecutivos`,
      status: 'Alta Performance Ativa',
      isReady: true,
    };
  };

  const evolution = getEvolutionCriterion();

  return (
    <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
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

        {/* Média Semanal */}
        <div className="double-bezel-outer">
          <div className="double-bezel-inner" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Adesão Semanal
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
                {weeklyAvg}%
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>média</span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Últimos 7 dias avaliados
            </p>
          </div>
        </div>

        {/* Foco em Programação */}
        <div className="double-bezel-outer">
          <div className="double-bezel-inner" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Estudo de Código
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
                <Code2 size={18} strokeWidth={2.4} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {codingHours}h
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>acumuladas</span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Tempo dedicado a projetos e teoria
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
                {totalTasksCompleted}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>check-ins</span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Histórico total registrado
            </p>
          </div>
        </div>
      </div>

      {/* Gráfico de Evolução dos Últimos 14 Dias (Recharts) */}
      <div className="double-bezel-outer">
        <div className="double-bezel-inner" style={{ padding: '24px 28px' }}>
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
                Adesão Diária à Rotina (Últimos 14 Dias)
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Porcentagem de tarefas executadas por dia no Nível {selectedLevel.toUpperCase()}
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

          <div style={{ width: '100%', height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.history14Days} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="displayDate"
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border-subtle)' }}
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
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
                <Bar dataKey="percentage" radius={[6, 6, 0, 0]}>
                  {metrics.history14Days.map((entry, index) => (
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
                  Critério de Evolução de Nível
                </h4>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Extraído do Plano Oficial de Rotina
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
