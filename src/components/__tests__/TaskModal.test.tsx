import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskModal } from '../TaskModal';
import { useFlowStore } from '../../store/useFlowStore';

describe('TaskModal Component', () => {
  beforeEach(() => {
    useFlowStore.setState({
      isTaskModalOpen: false,
      editingTask: null,
      tasks: [
        {
          id: 'task-existing',
          title: 'Tarefa Existente',
          description: 'Descrição existente',
          startTime: '08:00',
          endTime: '09:00',
          routineTypeId: 'default',
          categoryId: 'cat-1',
          daysOfWeek: [1, 2, 3, 4, 5],
          targetMinutes: 60,
          tags: ['Trabalho'],
        },
      ],
      categories: [
        { id: 'cat-1', name: 'Trabalho', color: '#6366F1' },
        { id: 'cat-2', name: 'Saúde', color: '#10B981' },
      ],
      routineTypes: [
        { id: 'default', name: 'Padrão', description: 'Rotina padrão' },
      ],
      selectedRoutineTypeId: 'default',
      selectedDate: '2026-09-24',
    });
  });

  it('não deve renderizar nada quando isTaskModalOpen for false', () => {
    const { container } = render(<TaskModal />);
    expect(container).toBeEmptyDOMElement();
  });

  it('deve abrir em modo de criação limpo sem crash de trim ou controlled/uncontrolled', () => {
    useFlowStore.setState({ isTaskModalOpen: true, editingTask: null });
    render(<TaskModal />);

    expect(screen.getByText('Nova Atividade da Rotina')).toBeInTheDocument();
    const titleInput = screen.getByPlaceholderText(/Estudo de Rust/i) as HTMLInputElement;
    expect(titleInput.value).toBe('');

    fireEvent.change(titleInput, { target: { value: 'Minha Nova Tarefa' } });
    expect(titleInput.value).toBe('Minha Nova Tarefa');
  });

  it('deve lidar com tarefa rascunho com specificDate (vindo do calendário) sem erros', () => {
    useFlowStore.setState({
      isTaskModalOpen: true,
      editingTask: { specificDate: '2026-09-24' } as any,
    });

    render(<TaskModal />);

    expect(screen.getByText('Nova Atividade no Calendário')).toBeInTheDocument();
    expect(
      screen.getByText(/Agendando atividade para o dia 2026-09-24/i)
    ).toBeInTheDocument();

    const titleInput = screen.getByPlaceholderText(/Estudo de Rust/i) as HTMLInputElement;
    expect(titleInput.value).toBe('');

    fireEvent.change(titleInput, { target: { value: 'Tarefa do Dia 24' } });

    const submitBtn = screen.getByRole('button', { name: /Salvar Atividade/i });
    fireEvent.click(submitBtn);

    const tasks = useFlowStore.getState().tasks;
    const createdTask = tasks.find((t) => t.title === 'Tarefa do Dia 24');
    expect(createdTask).toBeDefined();
    expect(createdTask?.specificDate).toBe('2026-09-24');
    expect(useFlowStore.getState().isTaskModalOpen).toBe(false);
  });

  it('deve abrir em modo de edição quando houver editingTask com id', () => {
    const existing = useFlowStore.getState().tasks[0];
    useFlowStore.setState({
      isTaskModalOpen: true,
      editingTask: existing,
    });

    render(<TaskModal />);

    expect(screen.getByText('Editar Atividade')).toBeInTheDocument();
    const titleInput = screen.getByPlaceholderText(/Estudo de Rust/i) as HTMLInputElement;
    expect(titleInput.value).toBe('Tarefa Existente');

    fireEvent.change(titleInput, { target: { value: 'Tarefa Modificada' } });

    const submitBtn = screen.getByRole('button', { name: /Atualizar Atividade/i });
    fireEvent.click(submitBtn);

    const updatedTask = useFlowStore.getState().tasks.find((t) => t.id === 'task-existing');
    expect(updatedTask?.title).toBe('Tarefa Modificada');
  });

  it('não deve submeter ou quebrar se o título for vazio ou apenas espaços', () => {
    useFlowStore.setState({ isTaskModalOpen: true, editingTask: null });
    render(<TaskModal />);

    const submitBtn = screen.getByRole('button', { name: /Salvar Atividade/i });
    fireEvent.click(submitBtn);

    // Modal deve permanecer aberto
    expect(useFlowStore.getState().isTaskModalOpen).toBe(true);
  });

  it('deve permitir escolher entre "Só para o dia" e "Para todos os dias"', () => {
    useFlowStore.setState({ isTaskModalOpen: true, editingTask: null, selectedDate: '2026-09-24' });
    render(<TaskModal />);

    expect(screen.getByText('Frequência da Atividade *')).toBeInTheDocument();
    const singleDayBtn = screen.getByTestId('freq-single-day-btn');
    const allDaysBtn = screen.getByTestId('freq-all-days-btn');

    expect(singleDayBtn).toBeInTheDocument();
    expect(allDaysBtn).toBeInTheDocument();

    // 1. Criar tarefa com "Para todos os dias"
    const titleInput = screen.getByPlaceholderText(/Estudo de Rust/i) as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: 'Hábito Diário' } });
    fireEvent.click(allDaysBtn);

    const submitBtn = screen.getByRole('button', { name: /Salvar Atividade/i });
    fireEvent.click(submitBtn);

    const createdTask = useFlowStore.getState().tasks.find((t) => t.title === 'Hábito Diário');
    expect(createdTask).toBeDefined();
    expect(createdTask?.specificDate).toBeUndefined();
    expect(createdTask?.daysOfWeek).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('deve salvar com data específica ao escolher "Só para o dia"', () => {
    useFlowStore.setState({ isTaskModalOpen: true, editingTask: null, selectedDate: '2026-09-24' });
    render(<TaskModal />);

    const singleDayBtn = screen.getByTestId('freq-single-day-btn');
    fireEvent.click(singleDayBtn);

    const titleInput = screen.getByPlaceholderText(/Estudo de Rust/i) as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: 'Compromisso Pontual' } });

    const submitBtn = screen.getByRole('button', { name: /Salvar Atividade/i });
    fireEvent.click(submitBtn);

    const createdTask = useFlowStore.getState().tasks.find((t) => t.title === 'Compromisso Pontual');
    expect(createdTask).toBeDefined();
    expect(createdTask?.specificDate).toBe('2026-09-24');
    // 2026-09-24 foi quinta-feira (4)
    expect(createdTask?.daysOfWeek).toEqual([4]);
  });
});
