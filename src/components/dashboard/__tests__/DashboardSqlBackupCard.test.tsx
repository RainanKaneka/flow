import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DashboardSqlBackupCard } from '../DashboardSqlBackupCard';
import { useFlowStore } from '../../../store/useFlowStore';

describe('DashboardSqlBackupCard Component', () => {
  it('deve renderizar o título e informações do SQLite', () => {
    render(<DashboardSqlBackupCard onExportSqlite={vi.fn()} />);

    expect(screen.getByText(/dados & persistência relacional/i)).toBeInTheDocument();
    expect(screen.getByText(/sqlite nativo • exportação json, csv e sql/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dump sql \(\.sql\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /exportar json \/ csv/i })).toBeInTheDocument();
  });

  it('deve chamar onExportSqlite ao clicar no botão de Dump SQL', () => {
    const handleSql = vi.fn();
    render(<DashboardSqlBackupCard onExportSqlite={handleSql} />);

    const sqlBtn = screen.getByRole('button', { name: /dump sql \(\.sql\)/i });
    fireEvent.click(sqlBtn);

    expect(handleSql).toHaveBeenCalledTimes(1);
  });

  it('deve abrir o modal de exportação ao clicar no botão de Exportar JSON / CSV', () => {
    useFlowStore.setState({ isBackupModalOpen: false });

    render(<DashboardSqlBackupCard onExportSqlite={vi.fn()} />);

    const exportBtn = screen.getByRole('button', { name: /exportar json \/ csv/i });
    fireEvent.click(exportBtn);

    expect(useFlowStore.getState().isBackupModalOpen).toBe(true);
    expect(useFlowStore.getState().backupModalTab).toBe('export');
  });

  it('deve chamar callback customizado se onOpenExportHub for fornecido', () => {
    const customHub = vi.fn();
    render(<DashboardSqlBackupCard onExportSqlite={vi.fn()} onOpenExportHub={customHub} />);

    const exportBtn = screen.getByRole('button', { name: /exportar json \/ csv/i });
    fireEvent.click(exportBtn);

    expect(customHub).toHaveBeenCalledTimes(1);
  });
});
