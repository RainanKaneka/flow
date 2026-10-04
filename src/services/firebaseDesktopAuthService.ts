import { GoogleAuthProvider, signInWithCredential, UserCredential } from 'firebase/auth';
import { getActiveFirebaseConfig, getFirebaseAuthInstance } from './firebaseConfig';
import { openExternalUrl } from '../utils/browser';

/** O navegador obtém a identidade Google; o SDK do desktop valida a credencial. */
export const signInWithGoogleOnDesktop = async (): Promise<UserCredential> => {
  const config = getActiveFirebaseConfig();
  const auth = getFirebaseAuthInstance();
  if (!config || !auth) throw new Error('O login do Flow ainda não está configurado.');

  const origin = `https://${config.projectId}.web.app`;
  const state = Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('');
  const { invoke } = await import('@tauri-apps/api/core');
  const { port } = await invoke<{ port: number }>('start_firebase_google_auth', { origin, state });

  try {
    const url = new URL(origin);
    url.searchParams.set('state', state);
    url.searchParams.set('port', String(port));
    if (!(await openExternalUrl(url.toString()))) {
      throw new Error('Não foi possível abrir o navegador. Tente novamente.');
    }

    const deadline = Date.now() + 300000;
    while (Date.now() < deadline) {
      const idToken = await invoke<string | null>('poll_firebase_google_auth', { state });
      if (idToken) {
        return await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error(
      'O tempo de login terminou. Clique em Continuar com Google para tentar novamente.'
    );
  } finally {
    await invoke('cancel_firebase_google_auth', { state }).catch(() => {});
  }
};
