import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PomodoroView } from '../PomodoroView';
import { useFlowStore } from '../../store/useFlowStore';

describe('PomodoroView Component', () => {
  beforeEach(() => {
    useFlowStore.setState({
      pomodoro: {
        mode: 'focus',
        timeLeftSeconds: 25 * 60,
        totalDurationSeconds: 25 * 60,
        isActive: false,
        completedSessions: 3,
        linkedTaskId: null,
      },
      tasks: [
        {
          id: 'task-test-1',
          routineTypeId: 'default',
          categoryId: 'focus',
          title: 'Estudar TypeScript',
          description: 'Aprofundar em tipos',
          startTime: '09:00',
          endTime: '10:00',
          targetMinutes: 60,
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
          checklist: [],
          attachments: [],
        },
      ],
      selectedRoutineTypeId: 'default',
      selectedDate: '2026-09-22',
      logs: {},
      categories: [
        {
          id: 'focus',
          name: 'Foco Profundo',
          color: '#6366F1',
          icon: 'Brain',
          isDefault: true,
        },
      ],
    });
  });

  it('deve renderizar o título, o tempo inicial de 25:00 e os blocos cumpridos', () => {
    render(<PomodoroView />);

    expect(screen.getByText('Pomodoro de Alta Performance')).toBeInTheDocument();
    expect(screen.getByText('25:00')).toBeInTheDocument();
    expect(screen.getByText('3 Blocos Cumpridos')).toBeInTheDocument();
    expect(screen.getByText('Foco (25m)')).toBeInTheDocument();
    expect(screen.getByText('Pausa Curta (5m)')).toBeInTheDocument();
    expect(screen.getByText('Pausa Longa (15m)')).toBeInTheDocument();
  });

  it('deve permitir alternar para o modo Pausa Curta e Pausa Longa', () => {
    render(<PomodoroView />);

    const shortBreakBtn = screen.getByText('Pausa Curta (5m)');
    fireEvent.click(shortBreakBtn);

    const storeState = useFlowStore.getState().pomodoro;
    expect(storeState.mode).toBe('shortBreak');
  });

  it('deve permitir iniciar o timer de foco', () => {
    render(<PomodoroView />);

    const startBtn = screen.getByText('Iniciar Foco');
    fireEvent.click(startBtn);

    const storeState = useFlowStore.getState().pomodoro;
    expect(storeState.isActive).toBe(true);
  });

  it('deve permitir ajustar duração com botões +5 min e -5 min', () => {
    render(<PomodoroView />);

    const plusBtn = screen.getByText('+5 min');
    fireEvent.click(plusBtn);

    const storeState = useFlowStore.getState().pomodoro;
    expect(storeState.totalDurationSeconds).toBe(30 * 60);
  });

  it('deve abrir o seletor de tarefas e permitir vincular uma atividade', () => {
    render(<PomodoroView />);

    const dropdownTrigger = screen.getByText('Nenhuma atividade vinculada (Foco Avulso)');
    fireEvent.click(dropdownTrigger);

    // Deve exibir a tarefa disponível
    expect(screen.getByText('Estudar TypeScript')).toBeInTheDocument();

    // Clicar na tarefa
    fireEvent.click(screen.getByText('Estudar TypeScript'));

    const storeState = useFlowStore.getState().pomodoro;
    expect(storeState.linkedTaskId).toBe('task-test-1');
  });
});
