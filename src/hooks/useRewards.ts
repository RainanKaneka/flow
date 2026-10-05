'use client';
import { useEffect } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { disposeRewards, initializeRewards } from '../services/rewards/runtime';

export function useRewards(enabled: boolean) {
  const uid = useFlowStore((state) => state.firebaseUser?.uid ?? null);
  const equipped = useFlowStore((state) => state.rewards?.preferences.equipped);
  const owned = useFlowStore((state) => state.rewards?.wallet.owned);
  useEffect(() => {
    if (!enabled) return;
    void initializeRewards(uid);
    return disposeRewards;
  }, [enabled, uid]);
  useEffect(() => {
    if (!enabled) return;
    const flush = () => { void useFlowStore.getState().flushRewards(); };
    const offline = () => { if (useFlowStore.getState().rewardOwner !== 'guest') useFlowStore.setState({ rewardStatus: 'offline', fishingStatus: 'offline', aquaticStatus: 'offline' }); };
    const timer = setInterval(flush, 1000);
    window.addEventListener('online', flush);
    window.addEventListener('offline',offline);
    return () => { clearInterval(timer); window.removeEventListener('online', flush); window.removeEventListener('offline',offline); };
  }, [enabled]);
  useEffect(() => {
    const root = document.documentElement;
    for (const slot of ['theme', 'accent', 'frame'] as const) {
      const id = equipped?.[slot];
      if (id && owned?.includes(id)) root.dataset[`reward${slot[0].toUpperCase()}${slot.slice(1)}`] = id;
      else delete root.dataset[`reward${slot[0].toUpperCase()}${slot.slice(1)}`];
    }
  }, [equipped, owned]);
}
