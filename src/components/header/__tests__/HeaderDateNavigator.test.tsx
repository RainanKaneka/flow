import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HeaderDateNavigator } from '../HeaderDateNavigator';

describe('HeaderDateNavigator', () => {
  it('deve navegar para o dia anterior ao clicar no botão de recuar', () => {
    const handleDateChange = vi.fn();
    render(<HeaderDateNavigator selectedDate="2026-09-22" onDateChange={handleDateChange} />);

    const prevButton = screen.getByLabelText('Dia anterior');
    fireEvent.click(prevButton);

    expect(handleDateChange).toHaveBeenCalledWith('2026-09-21');
  });

  it('deve navegar para o próximo dia ao clicar no botão de avançar', () => {
    const handleDateChange = vi.fn();
    render(<HeaderDateNavigator selectedDate="2026-09-22" onDateChange={handleDateChange} />);

    const nextButton = screen.getByLabelText('Próximo dia');
    fireEvent.click(nextButton);

    expect(handleDateChange).toHaveBeenCalledWith('2026-09-23');
  });

  it('deve exibir badge HOJE se a data selecionada for a data de hoje', () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;

    render(<HeaderDateNavigator selectedDate={todayStr} onDateChange={vi.fn()} />);

    expect(screen.getByText('HOJE')).toBeInTheDocument();
  });
});
