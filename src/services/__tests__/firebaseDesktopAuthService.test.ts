import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signInWithGoogleOnDesktop } from '../firebaseDesktopAuthService';
import { invoke } from '@tauri-apps/api/core';
import { openExternalUrl } from '../../utils/browser';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('../../utils/browser', () => ({ openExternalUrl: vi.fn() }));
vi.mock('../firebaseConfig', () => ({
  getActiveFirebaseConfig: vi.fn(() => ({ projectId: 'flow-test' })),
  getFirebaseAuthInstance: vi.fn(() => ({ name: 'desktop-auth' })),
}));
vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: { credential: vi.fn(() => ({ providerId: 'google.com' })) },
  signInWithCredential: vi.fn(),
}));

describe('login Google no desktop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(openExternalUrl).mockResolvedValue(true);
    vi.mocked(invoke).mockImplementation(async (command) => {
      if (command === 'start_firebase_google_auth') return { port: 45678 } as never;
      if (command === 'poll_firebase_google_auth') return 'header.payload.signature' as never;
      return undefined as never;
    });
    vi.mocked(signInWithCredential).mockResolvedValue({ user: { uid: 'google-uid' } } as never);
  });

  it('usa o navegador externo e valida a identidade pelo SDK sem tokens na URL', async () => {
    await signInWithGoogleOnDesktop();
    const url = new URL(vi.mocked(openExternalUrl).mock.calls[0][0]);
    expect(url.origin).toBe('https://flow-test.web.app');
    expect(url.searchParams.get('state')).toMatch(/^[a-f0-9]{64}$/);
    expect(url.searchParams.get('port')).toBe('45678');
    expect(url.searchParams.has('id_token')).toBe(false);
    expect(GoogleAuthProvider.credential).toHaveBeenCalledWith('header.payload.signature');
    expect(signInWithCredential).toHaveBeenCalled();
    expect(invoke).toHaveBeenLastCalledWith('cancel_firebase_google_auth', {
      state: url.searchParams.get('state'),
    });
  });

  it('libera o listener quando o navegador não pode ser aberto', async () => {
    vi.mocked(openExternalUrl).mockResolvedValue(false);
    await expect(signInWithGoogleOnDesktop()).rejects.toThrow('Não foi possível abrir o navegador');
    expect(invoke).toHaveBeenLastCalledWith('cancel_firebase_google_auth', expect.any(Object));
    expect(signInWithCredential).not.toHaveBeenCalled();
  });
});
