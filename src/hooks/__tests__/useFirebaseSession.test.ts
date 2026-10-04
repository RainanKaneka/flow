import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFirebaseSession } from '../useFirebaseSession';
import { firebaseAuthService } from '../../services/firebaseAuthService';
import { restoreFirebaseAccount } from '../../services/firebaseSessionService';
import { FirebaseUserProfile } from '../../types/routine';

vi.mock('../../services/firebaseAuthService', () => ({
  firebaseAuthService: { onAuthStateChanged: vi.fn() },
}));
vi.mock('../../services/firebaseSessionService', () => ({ restoreFirebaseAccount: vi.fn() }));

describe('useFirebaseSession', () => {
  let callback: (user: FirebaseUserProfile | null) => void;
  const unsubscribe = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(restoreFirebaseAccount).mockResolvedValue(undefined);
    vi.mocked(firebaseAuthService.onAuthStateChanged).mockImplementation((listener) => {
      callback = listener;
      return unsubscribe;
    });
  });

  it('aguarda o SDK restaurar a sessão antes de liberar a sincronização', async () => {
    const { result, unmount } = renderHook(() => useFirebaseSession());
    expect(result.current).toBe(false);
    await act(async () => {
      callback(null);
    });
    await waitFor(() => expect(result.current).toBe(true));
    expect(restoreFirebaseAccount).toHaveBeenCalledWith(null);
    unmount();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it('desliga o listener anterior quando a configuração muda', async () => {
    const { result } = renderHook(() => useFirebaseSession());
    await act(async () => {
      callback(null);
    });
    expect(result.current).toBe(true);
    act(() => {
      window.dispatchEvent(new Event('flow:firebase-config-changed'));
    });
    expect(result.current).toBe(false);
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(firebaseAuthService.onAuthStateChanged).toHaveBeenCalledTimes(2);
  });
});
