import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGlobalShortcuts } from '../useGlobalShortcuts';
import { useFlowStore } from '../../store/useFlowStore';

describe('useGlobalShortcuts Hook', () => {
  beforeEach(() => {
    useFlowStore.setState({
      activeView: 'routine',
      isGlobalSearchOpen: false,
      isTaskModalOpen: false,
      isNotificationModalOpen: false,
      isManageRoutinesModalOpen: false,
      isManageCategoriesModalOpen: false,
      selectedTaskIdForDetail: null,
      pomodoro: {
        isActive: false,
        timeLeftSeconds: 1500,
        totalDurationSeconds: 1500,
        mode: 'focus',
        completedSessions: 0,
        linkedTaskId: null,
      },
    });
  });

  it('deve alternar a pesquisa global com Ctrl+K e Cmd+K', () => {
    renderHook(() => useGlobalShortcuts());

    expect(useFlowStore.getState().isGlobalSearchOpen).toBe(false);

    // Dispara Ctrl+K
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })
      );
    });
    expect(useFlowStore.getState().isGlobalSearchOpen).toBe(true);

    // Dispara Cmd+K (MetaKey)
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })
      );
    });
    expect(useFlowStore.getState().isGlobalSearchOpen).toBe(false);
  });

  it('deve abrir modal de nova tarefa com Ctrl+N', () => {
    renderHook(() => useGlobalShortcuts());

    expect(useFlowStore.getState().isTaskModalOpen).toBe(false);

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'n', ctrlKey: true, bubbles: true })
      );
    });
    expect(useFlowStore.getState().isTaskModalOpen).toBe(true);
  });

  it('deve fechar a pesquisa global ao pressionar Escape', () => {
    useFlowStore.setState({ isGlobalSearchOpen: true });
    renderHook(() => useGlobalShortcuts());

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      );
    });
    expect(useFlowStore.getState().isGlobalSearchOpen).toBe(false);
  });

  it('deve navegar entre abas usando as teclas numéricas de 1 a 8', () => {
    renderHook(() => useGlobalShortcuts());

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '2', bubbles: true }));
    });
    expect(useFlowStore.getState().activeView).toBe('pomodoro');

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '3', bubbles: true }));
    });
    expect(useFlowStore.getState().activeView).toBe('notes');

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '7', bubbles: true }));
    });
    expect(useFlowStore.getState().activeView).toBe('timeline');

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '8', bubbles: true }));
    });
    expect(useFlowStore.getState().activeView).toBe('calendar');
  });
});
