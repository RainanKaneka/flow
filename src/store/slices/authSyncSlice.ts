import { StateCreator } from 'zustand';
import { FlowStore, FirebaseUserProfile, CloudSyncStatus } from '../../types/routine';

export interface AuthSyncSliceState {
  firebaseUser: FirebaseUserProfile | null;
  cloudSyncStatus: CloudSyncStatus;
  isAuthSyncModalOpen: boolean;
}

export interface AuthSyncSliceActions {
  setFirebaseUser: (user: FirebaseUserProfile | null) => void;
  setCloudSyncStatus: (status: Partial<CloudSyncStatus>) => void;
  openAuthSyncModal: () => void;
  closeAuthSyncModal: () => void;
}

export type AuthSyncSlice = AuthSyncSliceState & AuthSyncSliceActions;

export const createAuthSyncSlice: StateCreator<
  FlowStore,
  [['zustand/subscribeWithSelector', never], ['zustand/persist', unknown]],
  [],
  AuthSyncSlice
> = (set) => ({
  firebaseUser: null,
  cloudSyncStatus: {
    isSyncing: false,
    lastSyncedAt: null,
    error: null,
    autoSyncEnabled: true,
  },
  isAuthSyncModalOpen: false,

  setFirebaseUser: (user) => set({ firebaseUser: user }),
  setCloudSyncStatus: (status) =>
    set((state) => ({
      cloudSyncStatus: {
        ...state.cloudSyncStatus,
        ...status,
      },
    })),
  openAuthSyncModal: () => set({ isAuthSyncModalOpen: true }),
  closeAuthSyncModal: () => set({ isAuthSyncModalOpen: false }),
});
