import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BacklogView } from '../BacklogView';
import { useFlowStore } from '../../store/useFlowStore';

describe('BacklogView Component', () => {
  beforeEach(() => {
    useFlowStore.setState({
      backlog: [
        {
          id: 'backlog-1',
          title: 'Organizar gavetas do escritório',
          description: 'Descartar papéis antigos',
          categoryId: 'focus',
          targetMinutes: 30,
          tags: ['organização'],
          createdAt: new Date().toISOString(),
        },
      ],
      categories: [
        {
          id: 'focus',
          name: 'Foco Profundo',
          color: '#6366F1',
          icon: 'Brain',
          isDefault: true,
        },
      ],
      tasks: [],
      selectedRoutineTypeId: 'default',
      selectedDate: '2026-09-22',
    });
  });

  it('deve renderizar o cabeçalho e os itens do backlog', () => {
    render(<BacklogView />);

    expect(screen.getByText('Lista de Pendências (Backlog)')).toBeInTheDocument();
    expect(screen.getByText('Organizar gavetas do escritório')).toBeInTheDocument();
    expect(screen.getByText('Descartar papéis antigos')).toBeInTheDocument();
  });

  it('deve abrir o modal de nova pendência ao clicar no botão', () => {
    render(<BacklogView />);

    const newBtn = screen.getByText('Nova Pendência');
    fireEvent.click(newBtn);

    expect(screen.getByText('Guardar Pendência no Backlog')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Ex: Atualizar resumo do LinkedIn com os novos projetos')
    ).toBeInTheDocument();
  });

  it('deve permitir abrir o modal de encaixar na rotina de hoje', () => {
    render(<BacklogView />);

    const pullBtn = screen.getByText('Puxar para Hoje');
    fireEvent.click(pullBtn);

    expect(screen.getByText('Agendar para a Rotina de Hoje')).toBeInTheDocument();
    expect(screen.getByText('Encaixar na Rotina')).toBeInTheDocument();
  });

  it('deve permitir remover um item do backlog', () => {
    render(<BacklogView />);

    const deleteBtn = screen.getByTitle('Remover pendência');
    fireEvent.click(deleteBtn);

    expect(useFlowStore.getState().backlog.length).toBe(0);
    expect(screen.getByText('Seu backlog está limpo!')).toBeInTheDocument();
  });
});
