import { describe, it, expect, vi, beforeEach } from 'vitest';
import { firebaseAuthService, mapFirebaseUser } from '../firebaseAuthService';
import * as firebaseConfig from '../firebaseConfig';
import * as fbAuth from 'firebase/auth';

vi.mock('../firebaseConfig', () => ({
  getFirebaseAuthInstance: vi.fn(),
  isFirebaseConfigured: vi.fn(),
}));

vi.mock('firebase/auth', () => {
  class MockGoogleAuthProvider {
    addScope = vi.fn();
  }
  return {
    signInWithEmailAndPassword: vi.fn(),
    createUserWithEmailAndPassword: vi.fn(),
    signInAnonymously: vi.fn(),
    signOut: vi.fn(),
    updateProfile: vi.fn(),
    onAuthStateChanged: vi.fn(),
    GoogleAuthProvider: MockGoogleAuthProvider,
    signInWithPopup: vi.fn(),
  };
});

describe('firebaseAuthService', () => {
  const mockFirebaseUser = {
    uid: 'user-uid-123',
    email: 'teste@flow.com',
    displayName: 'Usuário Teste',
    photoURL: 'https://avatar.png',
    isAnonymous: false,
    providerData: [{ providerId: 'password' }],
  };

  const mockAuthInstance = {
    currentUser: mockFirebaseUser,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (firebaseConfig.isFirebaseConfigured as any).mockReturnValue(true);
    (firebaseConfig.getFirebaseAuthInstance as any).mockReturnValue(mockAuthInstance);
  });

  describe('mapFirebaseUser', () => {
    it('retorna null se o usuário for null', () => {
      expect(mapFirebaseUser(null)).toBeNull();
    });

    it('mapeia usuário com valores corretos', () => {
      const mapped = mapFirebaseUser(mockFirebaseUser as any);
      expect(mapped).toEqual({
        uid: 'user-uid-123',
        email: 'teste@flow.com',
        displayName: 'Usuário Teste',
        photoURL: 'https://avatar.png',
        isAnonymous: false,
        providerId: 'password',
      });
    });

    it('fornece displayName padrão para convidados anônimos', () => {
      const anonymousUser = {
        uid: 'anon-123',
        email: null,
        displayName: null,
        photoURL: null,
        isAnonymous: true,
        providerData: [],
      };
      const mapped = mapFirebaseUser(anonymousUser as any);
      expect(mapped?.displayName).toBe('Convidado (Offline/Sync)');
      expect(mapped?.providerId).toBe('anonymous');
    });
  });

  describe('auth methods', () => {
    it('faz login com email e senha com sucesso', async () => {
      (fbAuth.signInWithEmailAndPassword as any).mockResolvedValueOnce({
        user: mockFirebaseUser,
      });

      const user = await firebaseAuthService.signInWithEmail('teste@flow.com', 'senha123');
      expect(fbAuth.signInWithEmailAndPassword).toHaveBeenCalledWith(
        mockAuthInstance,
        'teste@flow.com',
        'senha123'
      );
      expect(user.uid).toBe('user-uid-123');
    });

    it('cria conta com email, senha e nome', async () => {
      (fbAuth.createUserWithEmailAndPassword as any).mockResolvedValueOnce({
        user: mockFirebaseUser,
      });

      const user = await firebaseAuthService.signUpWithEmail(
        'novo@flow.com',
        'senha123',
        'Novo Usuário'
      );
      expect(fbAuth.createUserWithEmailAndPassword).toHaveBeenCalledWith(
        mockAuthInstance,
        'novo@flow.com',
        'senha123'
      );
      expect(fbAuth.updateProfile).toHaveBeenCalledWith(mockFirebaseUser, {
        displayName: 'Novo Usuário',
      });
      expect(user.uid).toBe('user-uid-123');
    });

    it('faz login anônimo para sincronização imediata', async () => {
      const anonUser = { ...mockFirebaseUser, uid: 'anon-999', isAnonymous: true };
      (fbAuth.signInAnonymously as any).mockResolvedValueOnce({
        user: anonUser,
      });

      const user = await firebaseAuthService.signInAnonymously();
      expect(fbAuth.signInAnonymously).toHaveBeenCalledWith(mockAuthInstance);
      expect(user.uid).toBe('anon-999');
    });

    it('faz login com Google popup', async () => {
      (fbAuth.signInWithPopup as any).mockResolvedValueOnce({
        user: mockFirebaseUser,
      });

      const user = await firebaseAuthService.signInWithGoogle();
      expect(fbAuth.signInWithPopup).toHaveBeenCalled();
      expect(user.email).toBe('teste@flow.com');
    });

    it('executa signOut', async () => {
      await firebaseAuthService.signOut();
      expect(fbAuth.signOut).toHaveBeenCalledWith(mockAuthInstance);
    });

    it('registra onAuthStateChanged e cancela subscrição', () => {
      const unsubscribeMock = vi.fn();
      (fbAuth.onAuthStateChanged as any).mockReturnValue(unsubscribeMock);

      const callback = vi.fn();
      const unsub = firebaseAuthService.onAuthStateChanged(callback);

      expect(fbAuth.onAuthStateChanged).toHaveBeenCalled();
      unsub();
      expect(unsubscribeMock).toHaveBeenCalled();
    });

    it('lança erro se o Firebase não estiver configurado', async () => {
      (firebaseConfig.getFirebaseAuthInstance as any).mockReturnValue(null);
      await expect(
        firebaseAuthService.signInWithEmail('email@test.com', 'pwd')
      ).rejects.toThrow('Firebase Auth não configurado.');
    });
  });
});
