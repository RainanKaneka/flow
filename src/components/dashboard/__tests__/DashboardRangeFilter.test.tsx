import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DashboardRangeFilter } from '../DashboardRangeFilter';

describe('DashboardRangeFilter', () => {
  it('deve renderizar os botões de preset de intervalo', () => {
    render(
      <DashboardRangeFilter
        selectedRangePreset={14}
        onSelectPreset={vi.fn()}
        customStartDate="2026-08-22"
        customEndDate="2026-09-22"
        onCustomStartDateChange={vi.fn()}
        onCustomEndDateChange={vi.fn()}
        rangeDescription="Últimos 14 dias"
        evaluatedDaysCount={14}
      />
    );

    expect(screen.getByText('7 Dias')).toBeInTheDocument();
    expect(screen.getByText('14 Dias')).toBeInTheDocument();
    expect(screen.getByText('30 Dias')).toBeInTheDocument();
    expect(screen.getByText('90 Dias')).toBeInTheDocument();
    expect(screen.getByText('Personalizado')).toBeInTheDocument();
    expect(screen.getByText('Últimos 14 dias (14 dias avaliados)')).toBeInTheDocument();
  });

  it('deve chamar onSelectPreset com o valor do preset clicado', () => {
    const handleSelectPreset = vi.fn();
    render(
      <DashboardRangeFilter
        selectedRangePreset={14}
        onSelectPreset={handleSelectPreset}
        customStartDate="2026-08-22"
        customEndDate="2026-09-22"
        onCustomStartDateChange={vi.fn()}
        onCustomEndDateChange={vi.fn()}
        rangeDescription="Últimos 14 dias"
        evaluatedDaysCount={14}
      />
    );

    fireEvent.click(screen.getByText('30 Dias'));
    expect(handleSelectPreset).toHaveBeenCalledWith(30);

    fireEvent.click(screen.getByText('Personalizado'));
    expect(handleSelectPreset).toHaveBeenCalledWith('custom');
  });

  it('deve exibir os inputs de data quando o preset for "custom"', () => {
    const handleStartDateChange = vi.fn();
    const handleEndDateChange = vi.fn();

    render(
      <DashboardRangeFilter
        selectedRangePreset="custom"
        onSelectPreset={vi.fn()}
        customStartDate="2026-08-01"
        customEndDate="2026-09-01"
        onCustomStartDateChange={handleStartDateChange}
        onCustomEndDateChange={handleEndDateChange}
        rangeDescription="2026-08-01 até 2026-09-01"
        evaluatedDaysCount={32}
      />
    );

    const startInput = screen.getByLabelText('Data inicial personalizada') as HTMLInputElement;
    const endInput = screen.getByLabelText('Data final personalizada') as HTMLInputElement;

    expect(startInput.value).toBe('2026-08-01');
    expect(endInput.value).toBe('2026-09-01');

    fireEvent.change(startInput, { target: { value: '2026-08-10' } });
    expect(handleStartDateChange).toHaveBeenCalledWith('2026-08-10');
  });
});
