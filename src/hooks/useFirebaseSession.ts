'use client';

import { useEffect, useState } from 'react';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { restoreFirebaseAccount } from '../services/firebaseSessionService';
import { useFlowStore } from '../store/useFlowStore';

export const useFirebaseSession = (): boolean => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let disposed = false;
    let revision = 0;
    let bindingId = 0;
    let unsubscribe = () => {};
    const connect = () => {
      const binding = ++bindingId;
      unsubscribe();
      unsubscribe = firebaseAuthService.onAuthStateChanged(async (user) => {
        if (disposed || binding !== bindingId) return;
        const currentRevision = ++revision;
        setIsReady(false);
        try {
          await restoreFirebaseAccount(user);
        } catch (error) {
          if (!disposed && binding === bindingId && currentRevision === revision) {
            useFlowStore.getState().setCloudSyncStatus({
              error:
                error instanceof Error ? error.message : 'Não foi possível carregar seu perfil.',
            });
          }
        } finally {
          if (!disposed && binding === bindingId && currentRevision === revision) setIsReady(true);
        }
      });
    };
    const onConfigChanged = () => {
      setIsReady(false);
      connect();
    };
    connect();
    window.addEventListener('flow:firebase-config-changed', onConfigChanged);
    return () => {
      disposed = true;
      revision++;
      unsubscribe();
      window.removeEventListener('flow:firebase-config-changed', onConfigChanged);
    };
  }, []);

  return isReady;
};
