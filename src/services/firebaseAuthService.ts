// Serviço de Autenticação Firebase (Fase 4, Parte 1)
import {
  signInWithEmailAndPassword as fbSignInWithEmail,
  createUserWithEmailAndPassword as fbCreateUserWithEmail,
  signInAnonymously as fbSignInAnonymously,
  signOut as fbSignOut,
  updateProfile,
  onAuthStateChanged as fbOnAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { getFirebaseAuthInstance, isFirebaseConfigured } from './firebaseConfig';
import { FirebaseUserProfile } from '../types/routine';

export const mapFirebaseUser = (user: User | null): FirebaseUserProfile | null => {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || user.email?.split('@')[0] || (user.isAnonymous ? 'Convidado (Offline/Sync)' : 'Usuário Flow'),
    photoURL: user.photoURL,
    isAnonymous: user.isAnonymous,
    providerId: user.providerData[0]?.providerId || (user.isAnonymous ? 'anonymous' : 'password'),
  };
};

export const firebaseAuthService = {
  /**
   * Verifica se o Firebase está configurado e pronto para autenticar
   */
  isConfigured(): boolean {
    return isFirebaseConfigured();
  },

  /**
   * Obtém o usuário atualmente autenticado
   */
  getCurrentUser(): FirebaseUserProfile | null {
    const auth = getFirebaseAuthInstance();
    if (!auth || !auth.currentUser) return null;
    return mapFirebaseUser(auth.currentUser);
  },

  /**
   * Login com E-mail e Senha
   */
  async signInWithEmail(email: string, password: string): Promise<FirebaseUserProfile> {
    const auth = getFirebaseAuthInstance();
    if (!auth) throw new Error('Firebase Auth não configurado.');
    const userCredential = await fbSignInWithEmail(auth, email.trim(), password);
    const profile = mapFirebaseUser(userCredential.user);
    if (!profile) throw new Error('Não foi possível obter dados do usuário.');
    return profile;
  },

  /**
   * Criação de Conta com E-mail, Senha e Nome Opcional
   */
  async signUpWithEmail(email: string, password: string, displayName?: string): Promise<FirebaseUserProfile> {
    const auth = getFirebaseAuthInstance();
    if (!auth) throw new Error('Firebase Auth não configurado.');
    const userCredential = await fbCreateUserWithEmail(auth, email.trim(), password);
    if (displayName && displayName.trim()) {
      try {
        await updateProfile(userCredential.user, { displayName: displayName.trim() });
      } catch {
        // Ignora erro se updateProfile falhar
      }
    }
    const profile = mapFirebaseUser(userCredential.user);
    if (!profile) throw new Error('Não foi possível obter dados do usuário.');
    return profile;
  },

  /**
   * Login Anônimo / Convidado (permite sincronização imediata em nuvem sem cadastro prévio)
   */
  async signInAnonymously(): Promise<FirebaseUserProfile> {
    const auth = getFirebaseAuthInstance();
    if (!auth) throw new Error('Firebase Auth não configurado.');
    const userCredential = await fbSignInAnonymously(auth);
    const profile = mapFirebaseUser(userCredential.user);
    if (!profile) throw new Error('Não foi possível obter dados do usuário convidado.');
    return profile;
  },

  /**
   * Login com Google via Firebase Popup (funciona nativamente no navegador e Tauri)
   */
  async signInWithGoogle(): Promise<FirebaseUserProfile> {
    const auth = getFirebaseAuthInstance();
    if (!auth) throw new Error('Firebase Auth não configurado.');
    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    const result = await signInWithPopup(auth, provider);
    const profile = mapFirebaseUser(result.user);
    if (!profile) throw new Error('Não foi possível autenticar com o Google via Firebase.');
    return profile;
  },

  /**
   * Encerra a sessão ativa do usuário no Firebase
   */
  async signOut(): Promise<void> {
    const auth = getFirebaseAuthInstance();
    if (!auth) return;
    await fbSignOut(auth);
  },

  /**
   * Observador de alterações no estado de autenticação (onAuthStateChanged)
   */
  onAuthStateChanged(callback: (user: FirebaseUserProfile | null) => void): () => void {
    const auth = getFirebaseAuthInstance();
    if (!auth) {
      callback(null);
      return () => {};
    }
    return fbOnAuthStateChanged(auth, (user) => {
      callback(mapFirebaseUser(user));
    });
  },
};
