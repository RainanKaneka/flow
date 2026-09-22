'use client';

import React, { useMemo, useState } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { calculateStreakAndMetrics, generateSqlDump } from '../lib/sqliteService';
import { DashboardRangeFilter } from './dashboard/DashboardRangeFilter';
import { DashboardStatCards } from './dashboard/DashboardStatCards';
import { DashboardDailyChart } from './dashboard/DashboardDailyChart';
import { DashboardCategoryChart } from './dashboard/DashboardCategoryChart';
import { DashboardConsistencyCard } from './dashboard/DashboardConsistencyCard';
import { DashboardSqlBackupCard } from './dashboard/DashboardSqlBackupCard';

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
      <DashboardRangeFilter
        selectedRangePreset={selectedRangePreset}
        onSelectPreset={setSelectedRangePreset}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        onCustomStartDateChange={setCustomStartDate}
        onCustomEndDateChange={setCustomEndDate}
        rangeDescription={rangeDescription}
        evaluatedDaysCount={periodDays.length}
      />

      {/* 4 Cards de Métricas no Topo (Double-Bezel) */}
      <DashboardStatCards
        currentStreak={metrics.currentStreak}
        periodAvg={periodAvg}
        rangeDescription={rangeDescription}
        periodFocusedHours={periodFocusedHours}
        totalPeriodMinutes={metrics.totalPeriodMinutes}
        totalPeriodCompletedCount={metrics.totalPeriodCompletedCount}
      />

      {/* Grid de Gráficos: Adesão Temporal + Gráfico de Pizza de Categorias (Update 0.1.6) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
          gap: '20px',
        }}
      >
        <DashboardDailyChart
          periodDays={periodDays}
          rangeDescription={rangeDescription}
          routineTypeName={currentRoutineType?.name}
          theme={theme}
        />
        <DashboardCategoryChart
          categoryDistribution={metrics.categoryDistribution}
          totalCompletedCount={metrics.totalPeriodCompletedCount}
          theme={theme}
        />
      </div>

      {/* Critério de Evolução de Nível & SQLite Export */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '16px',
        }}
      >
        <DashboardConsistencyCard
          routineTypeName={currentRoutineType?.name}
          target={evolution.target}
          status={evolution.status}
          isReady={evolution.isReady}
        />
        <DashboardSqlBackupCard onExportSqlite={handleExportSqlite} />
      </div>
    </div>
  );
};
