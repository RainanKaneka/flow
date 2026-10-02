import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCloudSync } from '../useCloudSync';
import { useFlowStore } from '../../store/useFlowStore';
import { cloudSyncService } from '../../services/cloudSyncService';

vi.mock('../../services/cloudSyncService', () => ({
  cloudSyncService: {
    subscribeToCloudChanges: vi.fn(),
    pushToCloud: vi.fn(),
  },
}));

describe('useCloudSync Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    useFlowStore.setState({
      firebaseUser: { uid: 'user_123', email: 'test@test.com' } as any,
      cloudSyncStatus: { autoSyncEnabled: true, isSyncing: false, error: null, lastSyncedAt: null },
      tasks: [],
      notes: [],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('deve subscrever às mudanças da nuvem quando isDbReady for true', () => {
    const unsubscribeMock = vi.fn();
    vi.mocked(cloudSyncService.subscribeToCloudChanges).mockReturnValue(unsubscribeMock);

    const { unmount } = renderHook(() => useCloudSync(true));

    expect(cloudSyncService.subscribeToCloudChanges).toHaveBeenCalledWith(
      'user_123',
      expect.any(Function)
    );

    unmount();
    expect(unsubscribeMock).toHaveBeenCalled();
  });

  it('não deve subscrever se o isDbReady for false', () => {
    renderHook(() => useCloudSync(false));
    expect(cloudSyncService.subscribeToCloudChanges).not.toHaveBeenCalled();
  });

  it('deve disparar pushToCloud após debounce quando houver mudança local', async () => {
    vi.mocked(cloudSyncService.subscribeToCloudChanges).mockReturnValue(vi.fn());
    vi.mocked(cloudSyncService.pushToCloud).mockResolvedValue(true);

    renderHook(() => useCloudSync(true));

    // Modificar estado local
    useFlowStore.setState({
      tasks: [{ id: 'task_1', title: 'Test Task' } as any],
    });

    // Avançar tempo além do debounce (1500ms)
    vi.advanceTimersByTime(2000);

    // O pushToCloud já deve ter sido chamado devido ao debounce setTimeout async 
    // É preciso resolver promises para vitest
    await vi.runAllTimersAsync();

    expect(cloudSyncService.pushToCloud).toHaveBeenCalledWith(
      'user_123',
      expect.objectContaining({
        tasks: [{ id: 'task_1', title: 'Test Task' }],
      })
    );
  });
});
