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

  it('deve abrir o mini calendário ao clicar no botão de data', () => {
    render(<HeaderDateNavigator selectedDate="2026-09-24" onDateChange={vi.fn()} />);

    const openCalendarBtn = screen.getByLabelText('Abrir seletor de data');
    fireEvent.click(openCalendarBtn);

    const popover = screen.getByTestId('mini-calendar-popover');
    expect(popover).toBeInTheDocument();
    expect(screen.getByText('Setembro 2026')).toBeInTheDocument();
  });

  it('deve navegar entre meses dentro do mini calendário', () => {
    render(<HeaderDateNavigator selectedDate="2026-09-24" onDateChange={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('Abrir seletor de data'));
    expect(screen.getByText('Setembro 2026')).toBeInTheDocument();

    const nextMonthBtn = screen.getByLabelText('Próximo mês');
    fireEvent.click(nextMonthBtn);
    expect(screen.getByText('Outubro 2026')).toBeInTheDocument();

    const prevMonthBtn = screen.getByLabelText('Mês anterior');
    fireEvent.click(prevMonthBtn);
    expect(screen.getByText('Setembro 2026')).toBeInTheDocument();
  });

  it('deve selecionar um dia no mini calendário e fechar o popover', () => {
    const handleDateChange = vi.fn();
    render(<HeaderDateNavigator selectedDate="2026-09-24" onDateChange={handleDateChange} />);

    fireEvent.click(screen.getByLabelText('Abrir seletor de data'));

    const day15Button = screen.getByTitle('2026-09-15');
    fireEvent.click(day15Button);

    expect(handleDateChange).toHaveBeenCalledWith('2026-09-15');
    expect(screen.queryByTestId('mini-calendar-popover')).not.toBeInTheDocument();
  });

  it('deve voltar imediatamente para o dia atual ao clicar no botão "Voltar para hoje"', () => {
    const handleDateChange = vi.fn();
    render(<HeaderDateNavigator selectedDate="2026-01-01" onDateChange={handleDateChange} />);

    fireEvent.click(screen.getByLabelText('Abrir seletor de data'));

    const backToTodayBtn = screen.getByText('Voltar para hoje');
    fireEvent.click(backToTodayBtn);

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    expect(handleDateChange).toHaveBeenCalledWith(todayStr);
    expect(screen.queryByTestId('mini-calendar-popover')).not.toBeInTheDocument();
  });

  it('deve fechar o mini calendário ao pressionar a tecla Escape', () => {
    render(<HeaderDateNavigator selectedDate="2026-09-24" onDateChange={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('Abrir seletor de data'));
    expect(screen.getByTestId('mini-calendar-popover')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('mini-calendar-popover')).not.toBeInTheDocument();
  });
});
