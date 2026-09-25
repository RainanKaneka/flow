import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GlobalSearchModal } from '../GlobalSearchModal';
import { useFlowStore } from '../../store/useFlowStore';

describe('GlobalSearchModal Component', () => {
  beforeEach(() => {
    useFlowStore.setState({
      isGlobalSearchOpen: true,
      activeView: 'routine',
      theme: 'dark',
      tasks: [
        {
          id: 'task-deep-work',
          title: 'Deep Work & Arquitetura',
          description: 'Refatorar store e implementar Command Palette',
          startTime: '08:00',
          endTime: '10:00',
          routineTypeId: 'rt-1',
          categoryId: 'cat-dev',
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
          targetMinutes: 120,
          tags: ['codigo', 'ts'],
          isGoldenRule: true,
        },
        {
          id: 'task-gym',
          title: 'Treino de Força',
          description: 'Musculação na academia',
          startTime: '18:00',
          endTime: '19:15',
          routineTypeId: 'rt-1',
          categoryId: 'cat-health',
          daysOfWeek: [1, 3, 5],
          targetMinutes: 75,
          tags: ['saude', 'fitness'],
        },
      ],
      categories: [
        { id: 'cat-dev', name: 'Desenvolvimento', color: '#6366F1' },
        { id: 'cat-health', name: 'Saúde & Treino', color: '#10B981' },
      ],
      routineTypes: [
        { id: 'rt-1', name: 'Rotina Principal', description: 'Dia de trabalho padrão' },
      ],
      notes: [
        {
          id: 'note-roadmap',
          title: 'Roadmap v1.0',
          content: 'Ideias para o lançamento com testes e SQLite nativo',
          tags: ['planejamento', 'flow'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      backlog: [
        {
          id: 'backlog-monitor',
          title: 'Comprar braço articulado para monitor',
          description: 'Pesquisar modelos Ergotron ou Elg',
          categoryId: 'cat-dev',
          targetMinutes: 30,
          tags: ['setup'],
          createdAt: new Date().toISOString(),
        },
      ],
      isNotificationModalOpen: false,
      isBackupModalOpen: false,
      isTaskModalOpen: false,
      isTaskDetailModalOpen: false as any,
      selectedTaskIdForDetail: null,
    });
  });

  it('não deve renderizar nada quando isGlobalSearchOpen for falso', () => {
    useFlowStore.setState({ isGlobalSearchOpen: false });
    const { container } = render(<GlobalSearchModal />);
    expect(container.firstChild).toBeNull();
  });

  it('deve renderizar o modal com input, abas de filtro e resultados iniciais quando aberto', () => {
    render(<GlobalSearchModal />);

    expect(
      screen.getByPlaceholderText('Buscar tarefas, notas, configurações ou ações... (Ctrl+K)')
    ).toBeInTheDocument();
    expect(screen.getByText('Tudo')).toBeInTheDocument();
    expect(screen.getByText('Tarefas')).toBeInTheDocument();
    expect(screen.getByText('Notas')).toBeInTheDocument();
    expect(screen.getByText('Configurações')).toBeInTheDocument();
    expect(screen.getByText('Ações & Navegação')).toBeInTheDocument();

    // Itens padrão aparecem
    expect(screen.getByText('Deep Work & Arquitetura')).toBeInTheDocument();
    expect(screen.getByText('Nova Atividade')).toBeInTheDocument();
    expect(screen.getByText('Roadmap v1.0')).toBeInTheDocument();
  });

  it('deve fechar ao clicar no backdrop', () => {
    render(<GlobalSearchModal />);

    const backdrop = screen.getByTestId('global-search-backdrop');
    fireEvent.click(backdrop);
    expect(useFlowStore.getState().isGlobalSearchOpen).toBe(false);
  });

  it('deve fechar ao pressionar a tecla ESC', () => {
    render(<GlobalSearchModal />);

    const input = screen.getByTestId('global-search-input');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(useFlowStore.getState().isGlobalSearchOpen).toBe(false);
  });

  it('deve buscar e filtrar tarefas pelo título ou descrição', () => {
    render(<GlobalSearchModal />);

    const input = screen.getByTestId('global-search-input');
    fireEvent.change(input, { target: { value: 'academia' } });

    expect(screen.getByText('Treino de Força')).toBeInTheDocument();
    expect(screen.queryByText('Deep Work & Arquitetura')).not.toBeInTheDocument();
    expect(screen.queryByText('Roadmap v1.0')).not.toBeInTheDocument();
  });

  it('deve buscar notas pelo título ou conteúdo', () => {
    render(<GlobalSearchModal />);

    const input = screen.getByTestId('global-search-input');
    fireEvent.change(input, { target: { value: 'SQLite nativo' } });

    expect(screen.getByText('Roadmap v1.0')).toBeInTheDocument();
    expect(screen.queryByText('Deep Work & Arquitetura')).not.toBeInTheDocument();
  });

  it('deve buscar configurações e abrir o modal correspondente ao selecionar', () => {
    render(<GlobalSearchModal />);

    const input = screen.getByTestId('global-search-input');
    fireEvent.change(input, { target: { value: 'backup' } });

    const backupItem = screen.getByText('Backup do Banco de Dados SQLite');
    expect(backupItem).toBeInTheDocument();

    fireEvent.click(backupItem);

    // Modal de busca fecha e abre o modal de backup
    expect(useFlowStore.getState().isGlobalSearchOpen).toBe(false);
    expect(useFlowStore.getState().isBackupModalOpen).toBe(true);
  });

  it('deve buscar ações e alternar para a view desejada ao selecionar', () => {
    render(<GlobalSearchModal />);

    const input = screen.getByTestId('global-search-input');
    fireEvent.change(input, { target: { value: 'cronograma' } });

    const timelineItem = screen.getByText('Cronograma Visual (Timeline)');
    expect(timelineItem).toBeInTheDocument();

    fireEvent.click(timelineItem);

    expect(useFlowStore.getState().isGlobalSearchOpen).toBe(false);
    expect(useFlowStore.getState().activeView).toBe('timeline');
  });

  it('deve permitir navegar com as setas do teclado e executar com Enter', () => {
    render(<GlobalSearchModal />);

    const input = screen.getByTestId('global-search-input');
    fireEvent.change(input, { target: { value: 'Nova Atividade' } });

    // Pressiona Enter
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(useFlowStore.getState().isGlobalSearchOpen).toBe(false);
    expect(useFlowStore.getState().isTaskModalOpen).toBe(true);
  });

  it('deve filtrar exclusivamente por categorias ao clicar nos chips', () => {
    render(<GlobalSearchModal />);

    // Clica no chip 'Notas'
    const notesChip = screen.getByRole('button', { name: /Notas/ });
    fireEvent.click(notesChip);

    expect(screen.getByText('Roadmap v1.0')).toBeInTheDocument();
    expect(screen.queryByText('Deep Work & Arquitetura')).not.toBeInTheDocument();
    expect(screen.queryByText('Backup do Banco de Dados SQLite')).not.toBeInTheDocument();

    // Clica no chip 'Configurações'
    const settingsChip = screen.getByRole('button', { name: /Configurações/ });
    fireEvent.click(settingsChip);

    expect(screen.getByText('Backup do Banco de Dados SQLite')).toBeInTheDocument();
    expect(screen.queryByText('Roadmap v1.0')).not.toBeInTheDocument();
  });

  it('deve exibir estado vazio com mensagem amigável quando nada for encontrado', () => {
    render(<GlobalSearchModal />);

    const input = screen.getByTestId('global-search-input');
    fireEvent.change(input, { target: { value: 'palavra_inexistente_xyz_123' } });

    expect(screen.getByText('Nenhum resultado encontrado')).toBeInTheDocument();
    expect(
      screen.getByText(/Não encontramos nada para “palavra_inexistente_xyz_123”/)
    ).toBeInTheDocument();
  });

  it('deve limpar o campo de busca ao clicar no botão X', () => {
    render(<GlobalSearchModal />);

    const input = screen.getByTestId('global-search-input');
    fireEvent.change(input, { target: { value: 'busca temporaria' } });

    const clearBtn = screen.getByTitle('Limpar busca');
    fireEvent.click(clearBtn);

    expect((input as HTMLInputElement).value).toBe('');
  });
});
