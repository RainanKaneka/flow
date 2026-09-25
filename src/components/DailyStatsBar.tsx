'use client';

import React from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { Award, Flame, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';

export const DailyStatsBar: React.FC = () => {
  const tasks = useFlowStore((s) => s.tasks);
  const routineTypes = useFlowStore((s) => s.routineTypes);
  const selectedRoutineTypeId = useFlowStore((s) => s.selectedRoutineTypeId);
  const selectedDate = useFlowStore((s) => s.selectedDate);
  const logs = useFlowStore((s) => s.logs);

  const currentType = routineTypes.find((rt) => rt.id === selectedRoutineTypeId) || routineTypes[0];

  // Filtrar tarefas aplicáveis ao dia e tipo de rotina selecionado
  const [year, month, day] = selectedDate.split('-').map(Number);
  const currentDayOfWeek = new Date(year, month - 1, day).getDay(); // 0 = Domingo, 1 = Segunda...

  const dayTasks = tasks.filter((t) => {
    const matchesRoutine = t.routineTypeId === selectedRoutineTypeId;
    const matchesDay = t.specificDate
      ? t.specificDate === selectedDate
      : t.daysOfWeek.includes(currentDayOfWeek);
    return matchesRoutine && matchesDay;
  });

  const total = dayTasks.length;
  const completed = dayTasks.filter((t) => logs[`${selectedDate}_${t.id}`]?.completed).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Regras de Ouro
  const goldenRules = dayTasks.filter((t) => t.isGoldenRule);
  const goldenRulesCompleted = goldenRules.filter(
    (t) => logs[`${selectedDate}_${t.id}`]?.completed
  ).length;
  const allGoldenRulesDone = goldenRules.length > 0 && goldenRulesCompleted === goldenRules.length;

  // Feedback do dia
  const getDailyStatus = () => {
    if (percentage === 100) {
      return {
        label: 'Dia Épico (100%)',
        desc: 'Todas as atividades concluídas com maestria.',
        color: 'var(--success)',
      };
    }
    if (percentage >= 60) {
      return {
        label: 'Bom Progresso',
        desc: 'Consistência sustentável. Continue firme no ritmo!',
        color: 'var(--accent-primary)',
      };
    }
    return {
      label: 'Construindo Consistência',
      desc: currentType?.philosophy || 'Foque nas atividades essenciais para manter seu ritmo.',
      color: 'var(--golden-rule)',
    };
  };

  const status = getDailyStatus();

  return (
    <div
      className="double-bezel-outer"
      style={{
        margin: '24px var(--content-padding-x, 28px) 16px',
      }}
    >
      <div
        className="double-bezel-inner"
        style={{
          padding: '18px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
          }}
        >
          {/* Status e Meta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: percentage === 100 ? 'var(--success-bg)' : 'var(--accent-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: percentage === 100 ? 'var(--success)' : 'var(--accent-primary)',
                flexShrink: 0,
              }}
            >
              {percentage === 100 ? (
                <Award size={22} strokeWidth={2.4} />
              ) : (
                <Flame size={22} strokeWidth={2.4} />
              )}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3
                  style={{
                    fontSize: '15px',
                    fontWeight: 700,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {status.label}
                </h3>
                <span
                  className="badge-eyebrow"
                  style={{
                    background: 'var(--bg-elevated)',
                    color: currentType?.color || 'var(--accent-primary)',
                  }}
                >
                  {currentType?.name.toUpperCase() || 'ROTINA'}
                </span>
              </div>
              <p
                style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  marginTop: '2px',
                }}
              >
                {status.desc}
              </p>
            </div>
          </div>

          {/* Metas Numéricas */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            {/* Regras de ouro */}
            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  justifyContent: 'flex-end',
                }}
              >
                <ShieldAlert size={14} color="var(--golden-rule)" />
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Regras de Ouro
                </span>
              </div>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: allGoldenRulesDone ? 'var(--success)' : 'var(--golden-rule)',
                }}
              >
                {goldenRulesCompleted}/{goldenRules.length} Cumpridas
              </span>
            </div>

            {/* Total tasks */}
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
                Tarefas do Dia
              </span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '4px',
                  justifyContent: 'flex-end',
                }}
              >
                <span style={{ fontSize: '19px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {completed}
                </span>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>/{total}</span>
              </div>
            </div>

            {/* % Pill */}
            <div
              style={{
                fontSize: '15px',
                fontWeight: 800,
                padding: '6px 14px',
                borderRadius: '9999px',
                background: percentage === 100 ? 'var(--success)' : 'var(--text-primary)',
                color: 'var(--bg-primary)',
                minWidth: '58px',
                textAlign: 'center',
                letterSpacing: '-0.02em',
              }}
            >
              {percentage}%
            </div>
          </div>
        </div>

        {/* Barra de Progresso com Gradiente Haptic */}
        <div
          style={{
            width: '100%',
            height: '6px',
            backgroundColor: 'var(--bg-elevated)',
            borderRadius: '9999px',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: `${percentage}%`,
              height: '100%',
              borderRadius: '9999px',
              background:
                percentage === 100
                  ? 'linear-gradient(90deg, #10B981, #059669)'
                  : 'linear-gradient(90deg, #6366F1, #818CF8)',
              transition: 'width 600ms cubic-bezier(0.32, 0.72, 0, 1)',
            }}
          />
        </div>
      </div>
    </div>
  );
};
