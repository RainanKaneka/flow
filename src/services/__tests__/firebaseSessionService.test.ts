import { describe, it, expect, vi, beforeEach } from 'vitest';
import { restoreFirebaseAccount } from '../firebaseSessionService';
import { userProfileService } from '../userProfileService';
import { useFlowStore } from '../../store/useFlowStore';
import { FirebaseUserProfile, UserProfile } from '../../types/routine';

vi.mock('../userProfileService', () => ({
  userProfileService: { ensureUserProfileInitialized: vi.fn() },
}));

const googleUser: FirebaseUserProfile = {
  uid: 'google-uid',
  email: 'user@example.com',
  displayName: 'Conta Google',
  photoURL: 'https://example.com/avatar.png',
  isAnonymous: false,
  providerId: 'google.com',
};
const cloudProfile: UserProfile = { name: 'Meu perfil', objective: 'Estudar', avatarPreset: 'zen' };

describe('restoreFirebaseAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFlowStore.setState({ firebaseUser: null, userProfile: null });
    vi.mocked(userProfileService.ensureUserProfileInitialized).mockResolvedValue(cloudProfile);
  });

  it('cria/carrega o perfil com a identidade Google e preserva as personalizações da nuvem', async () => {
    await restoreFirebaseAccount(googleUser);
    expect(userProfileService.ensureUserProfileInitialized).toHaveBeenCalledWith('google-uid', {
      name: 'Conta Google',
      email: 'user@example.com',
      avatarUrl: googleUser.photoURL,
    });
    expect(useFlowStore.getState().firebaseUser).toEqual(googleUser);
    expect(useFlowStore.getState().userProfile).toEqual(cloudProfile);
  });

  it('usa uma única inicialização quando listener e formulário terminam o mesmo login', async () => {
    await Promise.all([restoreFirebaseAccount(googleUser), restoreFirebaseAccount(googleUser)]);
    expect(userProfileService.ensureUserProfileInitialized).toHaveBeenCalledTimes(1);
  });

  it('não aplica um perfil recebido depois de sair da conta', async () => {
    let resolve!: (profile: UserProfile) => void;
    vi.mocked(userProfileService.ensureUserProfileInitialized).mockReturnValue(
      new Promise((done) => {
        resolve = done;
      })
    );
    const loading = restoreFirebaseAccount(googleUser);
    await restoreFirebaseAccount(null);
    resolve(cloudProfile);
    await loading;
    expect(useFlowStore.getState().firebaseUser).toBeNull();
    expect(useFlowStore.getState().userProfile).toBeNull();
  });

  it('não combina o perfil de uma conta anterior com a conta nova', async () => {
    useFlowStore.setState({
      firebaseUser: { ...googleUser, uid: 'previous' },
      userProfile: { name: 'Outra pessoa', objective: 'Trabalhar', bio: 'Dados da conta anterior' },
    });
    await restoreFirebaseAccount(googleUser);
    expect(useFlowStore.getState().userProfile).toEqual(cloudProfile);
    expect(useFlowStore.getState().userProfile?.bio).toBeUndefined();
  });

  it('informa falha ao carregar o perfil sem inventar sucesso de sincronização', async () => {
    vi.mocked(userProfileService.ensureUserProfileInitialized).mockResolvedValue(null);
    await expect(restoreFirebaseAccount(googleUser)).rejects.toThrow(
      'não foi possível carregar o perfil'
    );
  });
});
