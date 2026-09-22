import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotepadView } from '../NotepadView';
import { useFlowStore } from '../../store/useFlowStore';

describe('NotepadView Component', () => {
  beforeEach(() => {
    useFlowStore.setState({
      notes: [
        {
          id: 'note-1',
          title: 'Anotações da Sprint',
          content: 'Definir metas e prioridades',
          tags: ['trabalho'],
          color: '#6366F1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
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
      routineTypes: [
        {
          id: 'default',
          name: 'Padrão',
          icon: 'Sun',
          isDefault: true,
        },
      ],
      selectedRoutineTypeId: 'default',
      selectedDate: '2026-09-22',
    });
  });

  it('deve renderizar o cabeçalho do Notepad e listar as notas existentes', () => {
    render(<NotepadView />);

    expect(screen.getByText('Bloco de Notas Livre (Notepad)')).toBeInTheDocument();
    expect(screen.getByText('Anotações da Sprint')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Anotações da Sprint')).toBeInTheDocument();
  });

  it('deve permitir criar uma nova anotação', () => {
    render(<NotepadView />);

    const newNoteBtn = screen.getByText('Nova Anotação');
    fireEvent.click(newNoteBtn);

    const storeNotes = useFlowStore.getState().notes;
    expect(storeNotes.length).toBe(2);
    expect(storeNotes[0].title).toBe('Nova Anotação');
  });

  it('deve filtrar anotações pelo campo de busca', () => {
    render(<NotepadView />);

    const searchInput = screen.getByPlaceholderText('Buscar notas por título ou texto...');
    fireEvent.change(searchInput, { target: { value: 'Inexistente' } });

    expect(screen.getByText('Nenhuma anotação encontrada.')).toBeInTheDocument();
  });

  it('deve abrir o modal de conversão de nota em tarefa da rotina', () => {
    render(<NotepadView />);

    const convertBtn = screen.getByText('Virar Tarefa');
    fireEvent.click(convertBtn);

    expect(screen.getByText('Transformar em Tarefa da Rotina')).toBeInTheDocument();
    expect(screen.getByText(/A anotação/)).toBeInTheDocument();
  });
});
