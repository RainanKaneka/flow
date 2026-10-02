import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getActiveFirebaseConfig,
  saveCustomFirebaseConfig,
  isFirebaseConfigured,
  getFirebaseAppInstance,
  getFirebaseAuthInstance,
  getFirebaseFirestoreInstance,
  isEmulatorEnabled,
  getEmulatorHost,
  _resetEmulatorConnectionsForTesting,
  FirebaseCustomConfig,
} from '../firebaseConfig';
import * as firebaseApp from 'firebase/app';
import * as firebaseAuth from 'firebase/auth';
import * as firebaseFirestore from 'firebase/firestore';

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn().mockReturnValue({ name: '[DEFAULT]' }),
  getApps: vi.fn().mockReturnValue([]),
  getApp: vi.fn().mockReturnValue({ name: '[DEFAULT]' }),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn().mockReturnValue({ currentUser: null }),
  connectAuthEmulator: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn().mockReturnValue({ type: 'firestore' }),
  connectFirestoreEmulator: vi.fn(),
}));

describe('firebaseConfig Service', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    _resetEmulatorConnectionsForTesting();
    delete process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    delete process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR;
    delete process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    _resetEmulatorConnectionsForTesting();
  });

  it('retorna null e isFirebaseConfigured falso quando não há configuração', () => {
    expect(getActiveFirebaseConfig()).toBeNull();
    expect(isFirebaseConfigured()).toBe(false);
  });

  it('salva e recupera configuração personalizada no localStorage', () => {
    const config: FirebaseCustomConfig = {
      apiKey: 'test-api-key-123',
      projectId: 'flow-test-project',
      authDomain: 'flow-test-project.firebaseapp.com',
    };

    saveCustomFirebaseConfig(config);
    expect(isFirebaseConfigured()).toBe(true);

    const loaded = getActiveFirebaseConfig();
    expect(loaded).toEqual(config);
  });

  it('limpa configuração quando chamada com null', () => {
    saveCustomFirebaseConfig({
      apiKey: 'key',
      projectId: 'proj',
      authDomain: 'proj.firebaseapp.com',
    });
    expect(isFirebaseConfigured()).toBe(true);

    saveCustomFirebaseConfig(null);
    expect(getActiveFirebaseConfig()).toBeNull();
    expect(isFirebaseConfigured()).toBe(false);
  });

  it('usa variáveis de ambiente como fallback quando não há localStorage', () => {
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'env-api-key';
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'env-project-id';
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'env-project-id.firebaseapp.com';

    const loaded = getActiveFirebaseConfig();
    expect(loaded).not.toBeNull();
    expect(loaded?.apiKey).toBe('env-api-key');
    expect(loaded?.projectId).toBe('env-project-id');
    expect(isFirebaseConfigured()).toBe(true);
  });

  it('inicializa instâncias singleton de FirebaseApp, Auth e Firestore', () => {
    saveCustomFirebaseConfig({
      apiKey: 'key-abc',
      projectId: 'proj-xyz',
      authDomain: 'proj-xyz.firebaseapp.com',
    });

    const app = getFirebaseAppInstance();
    expect(app).not.toBeNull();
    expect(firebaseApp.initializeApp).toHaveBeenCalled();

    const auth = getFirebaseAuthInstance();
    expect(auth).not.toBeNull();
    expect(firebaseAuth.getAuth).toHaveBeenCalled();

    const db = getFirebaseFirestoreInstance();
    expect(db).not.toBeNull();
    expect(firebaseFirestore.getFirestore).toHaveBeenCalled();
  });

  describe('Suporte ao Firebase Emulator local', () => {
    it('isEmulatorEnabled deve respeitar NEXT_PUBLIC_USE_FIREBASE_EMULATOR', () => {
      expect(isEmulatorEnabled()).toBe(false);

      process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR = 'true';
      expect(isEmulatorEnabled()).toBe(true);

      process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR = 'false';
      expect(isEmulatorEnabled()).toBe(false);
    });

    it('getEmulatorHost deve retornar host configurado ou padrão 127.0.0.1', () => {
      expect(getEmulatorHost()).toBe('127.0.0.1');

      process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST = '192.168.1.50';
      expect(getEmulatorHost()).toBe('192.168.1.50');
    });

    it('getActiveFirebaseConfig deve prover credenciais mock de dev quando emulador estiver ativo', () => {
      process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR = 'true';

      const config = getActiveFirebaseConfig();
      expect(config).not.toBeNull();
      expect(config?.projectId).toBe('flow-app-dev');
      expect(config?.apiKey).toBe('dev-emulator-api-key-12345');
      expect(isFirebaseConfigured()).toBe(true);
    });

    it('getFirebaseAuthInstance deve conectar ao emulador Auth quando ativado', () => {
      process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR = 'true';

      const auth = getFirebaseAuthInstance();
      expect(auth).not.toBeNull();
      expect(firebaseAuth.connectAuthEmulator).toHaveBeenCalledWith(
        auth,
        'http://127.0.0.1:9099',
        { disableWarnings: true }
      );
    });

    it('getFirebaseFirestoreInstance deve conectar ao emulador Firestore quando ativado', () => {
      process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR = 'true';

      const db = getFirebaseFirestoreInstance();
      expect(db).not.toBeNull();
      expect(firebaseFirestore.connectFirestoreEmulator).toHaveBeenCalledWith(
        db,
        '127.0.0.1',
        8080
      );
    });
  });
});
