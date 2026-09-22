import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardStatCards } from '../DashboardStatCards';

describe('DashboardStatCards', () => {
  it('deve renderizar as métricas de streak, adesão, tempo focado e check-ins corretamente', () => {
    render(
      <DashboardStatCards
        currentStreak={12}
        periodAvg={85}
        rangeDescription="Últimos 14 dias"
        periodFocusedHours="24.5"
        totalPeriodMinutes={1470}
        totalPeriodCompletedCount={48}
      />
    );

    // Streak
    expect(screen.getByText('Sequência Atual')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('dias seguidos')).toBeInTheDocument();

    // Adesão
    expect(screen.getByText('Adesão no Período')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();

    // Tempo Focado
    expect(screen.getByText('Tempo Focado')).toBeInTheDocument();
    expect(screen.getByText('24.5h')).toBeInTheDocument();
    expect(screen.getByText('1470 min de foco no intervalo')).toBeInTheDocument();

    // Metas Concluídas
    expect(screen.getByText('Metas Concluídas')).toBeInTheDocument();
    expect(screen.getByText('48')).toBeInTheDocument();
    expect(screen.getByText('check-ins')).toBeInTheDocument();
  });
});
