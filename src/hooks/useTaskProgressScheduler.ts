'use client';

import { useEffect } from 'react';
import { useFlowStore } from '../store/useFlowStore';

/** Usa o relógio real, independentemente do dia/rotina consultado na interface. */
export function useTaskProgressScheduler(isDbReady: boolean): void {
  const tasks = useFlowStore((state) => state.tasks);
  const logs = useFlowStore((state) => state.logs);
  const refreshTaskProgress = useFlowStore((state) => state.refreshTaskProgress);

  useEffect(() => {
    if (!isDbReady) return;
    const refresh = () => refreshTaskProgress(new Date());
    refresh();
    const interval = setInterval(refresh, 1000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [isDbReady, tasks, logs, refreshTaskProgress]);
}
