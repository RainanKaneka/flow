import { useFlowStore } from '../store/useFlowStore';
import { FirebaseUserProfile, UserProfile } from '../types/routine';
import { userProfileService } from './userProfileService';

const pendingProfiles = new Map<string, Promise<UserProfile | null>>();

/** Usado no primeiro login e na restauração da sessão ao abrir o Flow. */
export const restoreFirebaseAccount = async (user: FirebaseUserProfile | null): Promise<void> => {
  const previous = useFlowStore.getState().firebaseUser;
  useFlowStore.getState().setFirebaseUser(user);
  if (previous?.uid !== user?.uid) {
    useFlowStore
      .getState()
      .setCloudSyncStatus({ error: null, isSyncing: false, lastSyncedAt: null });
  }
  if (!user) return;

  if (previous && previous.uid !== user.uid) {
    useFlowStore.setState({ userProfile: null });
  }
  let loading = pendingProfiles.get(user.uid);
  if (!loading) {
    loading = userProfileService.ensureUserProfileInitialized(user.uid, {
      name: user.displayName || 'Usuário Flow',
      email: user.email || '',
      avatarUrl: user.photoURL || undefined,
    });
    pendingProfiles.set(user.uid, loading);
  }
  try {
    const profile = await loading;
    // Uma leitura de perfil antiga não deve reabrir uma sessão encerrada ou substituída.
    if (useFlowStore.getState().firebaseUser?.uid !== user.uid) return;
    if (!profile) {
      throw new Error(
        'Sua conta foi conectada, mas não foi possível carregar o perfil. Verifique a conexão e tente novamente.'
      );
    }
    useFlowStore.setState({ userProfile: profile });
  } finally {
    if (pendingProfiles.get(user.uid) === loading) pendingProfiles.delete(user.uid);
  }
};
