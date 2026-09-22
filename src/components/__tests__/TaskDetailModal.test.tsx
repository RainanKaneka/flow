import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskDetailModal } from '../TaskDetailModal';
import { useFlowStore } from '../../store/useFlowStore';

describe('TaskDetailModal Component', () => {
  beforeEach(() => {
    useFlowStore.setState({
      selectedTaskIdForDetail: 'task-1',
      tasks: [
        {
          id: 'task-1',
          routineTypeId: 'default',
          categoryId: 'focus',
          title: 'Aprender Rust & Tauri',
          description: 'Construir apps desktop rápidos',
          startTime: '10:00',
          endTime: '11:30',
          targetMinutes: 90,
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
          checklist: [
            { id: 'sub-1', title: 'Configurar Cargo.toml', completed: true },
            { id: 'sub-2', title: 'Compilar binário nativo', completed: false },
          ],
          attachments: [
            { id: 'att-1', title: 'Tauri Docs', url: 'https://tauri.app', type: 'link' },
          ],
          richContent: 'Roteiro de estudo detalhado.',
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
      logs: {},
      geminiConfig: {
        apiKey: '',
        model: 'gemini-2.5-flash',
        systemPrompt: '',
      },
    });
  });

  it('deve renderizar o título da tarefa, subtarefas e links anexados', () => {
    render(<TaskDetailModal />);

    expect(screen.getByText('Aprender Rust & Tauri')).toBeInTheDocument();
    expect(screen.getByText('Configurar Cargo.toml')).toBeInTheDocument();
    expect(screen.getByText('Compilar binário nativo')).toBeInTheDocument();
    expect(screen.getByText('Tauri Docs')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Roteiro de estudo detalhado.')).toBeInTheDocument();
  });

  it('deve permitir adicionar uma nova subtarefa', () => {
    render(<TaskDetailModal />);

    const input = screen.getByPlaceholderText(
      'Adicionar passo ou subtarefa... (ex: Ler páginas 10-25)'
    );
    fireEvent.change(input, { target: { value: 'Escrever testes unitários' } });

    const addBtn = screen.getByText('Adicionar');
    fireEvent.click(addBtn);

    const taskInStore = useFlowStore.getState().tasks.find((t) => t.id === 'task-1');
    expect(taskInStore?.checklist.length).toBe(3);
    expect(taskInStore?.checklist[2].title).toBe('Escrever testes unitários');
  });

  it('deve alternar a conclusão de uma subtarefa ao clicar', () => {
    render(<TaskDetailModal />);

    const toggleBtn = screen.getByText('Compilar binário nativo');
    fireEvent.click(toggleBtn);

    const taskInStore = useFlowStore.getState().tasks.find((t) => t.id === 'task-1');
    const subtask = taskInStore?.checklist.find((i) => i.id === 'sub-2');
    expect(subtask?.completed).toBe(true);
  });

  it('deve fechar o modal ao clicar no botão de fechar', () => {
    render(<TaskDetailModal />);

    const closeBtn = screen.getByTitle('Fechar detalhes da atividade');
    fireEvent.click(closeBtn);

    expect(useFlowStore.getState().selectedTaskIdForDetail).toBeNull();
  });
});
