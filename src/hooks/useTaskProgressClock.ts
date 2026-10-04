'use client';

import { useMemo, useSyncExternalStore } from 'react';

// Um único relógio para todos os cards; não cria um intervalo por tarefa.
let timestamp = Date.now();
let interval: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();
const tick = () => {
  timestamp = Date.now();
  listeners.forEach((listener) => listener());
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  if (listeners.size === 1) {
    interval = setInterval(tick, 1000);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', tick);
    tick();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearInterval(interval);
      interval = undefined;
      window.removeEventListener('focus', tick);
      document.removeEventListener('visibilitychange', tick);
    }
  };
};
const getSnapshot = () => timestamp;
const getServerSnapshot = () => 0;

export function useTaskProgressClock(): Date {
  const now = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(() => new Date(now), [now]);
}
