import { useEffect, useRef } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { cloudSyncService, CloudSyncPayload } from '../services/cloudSyncService';

export const useCloudSync = (isDbReady: boolean) => {
  const isPullingRef = useRef(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get reactive states for the effect dependencies
  const firebaseUser = useFlowStore((s) => s.firebaseUser);
  const autoSyncEnabled = useFlowStore((s) => s.cloudSyncStatus.autoSyncEnabled);
  const setCloudSyncStatus = useFlowStore((s) => s.setCloudSyncStatus);

  // 1. Subscribe to remote changes
  useEffect(() => {
    if (!isDbReady || !firebaseUser || !autoSyncEnabled) return;

    const unsubscribeRemote = cloudSyncService.subscribeToCloudChanges(
      firebaseUser.uid,
      (cloudPayload: CloudSyncPayload) => {
        // Prevent local subscription from triggering a push back
        isPullingRef.current = true;
        
        setCloudSyncStatus({ isSyncing: true, error: null });

        useFlowStore.setState({
          tasks: cloudPayload.tasks || [],
          routineTypes: cloudPayload.routineTypes || [],
          categories: cloudPayload.categories || [],
          logs: cloudPayload.logs || {},
          backlog: cloudPayload.backlog || [],
          notes: cloudPayload.notes || [],
        });
        
        // Reminder and Backup settings might be undefined in payload, only update if present
        if (cloudPayload.reminderSettings) {
          useFlowStore.setState({ reminderSettings: cloudPayload.reminderSettings });
        }
        if (cloudPayload.backupSettings) {
          useFlowStore.setState({ backupSettings: cloudPayload.backupSettings });
        }

        setCloudSyncStatus({ 
          isSyncing: false, 
          lastSyncedAt: new Date().toISOString(),
          error: null 
        });

        // Allow a small tick before enabling local pushes again
        setTimeout(() => {
          isPullingRef.current = false;
        }, 100);
      }
    );

    return () => {
      unsubscribeRemote();
    };
  }, [isDbReady, firebaseUser?.uid, autoSyncEnabled, setCloudSyncStatus]);

  // 2. Subscribe to local changes
  useEffect(() => {
    if (!isDbReady) return;

    const unsubscribeLocal = useFlowStore.subscribe(
      (state) => ({
        tasks: state.tasks,
        routineTypes: state.routineTypes,
        categories: state.categories,
        logs: state.logs,
        backlog: state.backlog,
        notes: state.notes,
        reminderSettings: state.reminderSettings,
        backupSettings: state.backupSettings,
        firebaseUser: state.firebaseUser,
        cloudSyncStatus: state.cloudSyncStatus,
      }),
      (next, prev) => {
        if (isPullingRef.current) return;
        
        if (!next.firebaseUser || !next.cloudSyncStatus.autoSyncEnabled) return;

        // Check if actual data changed (ignore user/status changes)
        if (
          next.tasks === prev.tasks &&
          next.routineTypes === prev.routineTypes &&
          next.categories === prev.categories &&
          next.logs === prev.logs &&
          next.backlog === prev.backlog &&
          next.notes === prev.notes &&
          next.reminderSettings === prev.reminderSettings &&
          next.backupSettings === prev.backupSettings
        ) {
          return;
        }

        const userId = next.firebaseUser.uid;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        
        debounceRef.current = setTimeout(async () => {
          try {
            next.cloudSyncStatus.isSyncing = true;
            useFlowStore.getState().setCloudSyncStatus({ isSyncing: true, error: null });
            
            const payload: CloudSyncPayload = {
              tasks: next.tasks,
              routineTypes: next.routineTypes,
              categories: next.categories,
              logs: next.logs,
              backlog: next.backlog,
              notes: next.notes,
              reminderSettings: next.reminderSettings,
              backupSettings: next.backupSettings,
            };
            
            await cloudSyncService.pushToCloud(userId, payload);
            
            useFlowStore.getState().setCloudSyncStatus({ 
              isSyncing: false, 
              lastSyncedAt: new Date().toISOString(),
              error: null 
            });
          } catch (err: any) {
            useFlowStore.getState().setCloudSyncStatus({ isSyncing: false, error: err.message });
          }
        }, 1500); // 1.5 seconds debounce for pushing
      }
    );

    return () => {
      unsubscribeLocal();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [isDbReady]);
};
