// Serviço de Configuração e Inicialização do Firebase (Fase 4, Parte 1 & Fase 4.3)
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, Firestore } from 'firebase/firestore';

export interface FirebaseCustomConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

const STORAGE_KEY = 'flow_firebase_custom_config';

/**
 * Verifica se o modo Firebase Emulator está ativado via variável de ambiente
 */
export const isEmulatorEnabled = (): boolean => {
  return process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true';
};

/**
 * Retorna o host configurado para o Firebase Emulator (padrão: 127.0.0.1)
 */
export const getEmulatorHost = (): string => {
  return process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST || '127.0.0.1';
};

/**
 * Retorna as credenciais ativas do Firebase (prioridade: custom salva no app > variáveis de ambiente > mock emulador)
 */
export const getActiveFirebaseConfig = (): FirebaseCustomConfig | null => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.apiKey && parsed.projectId) {
          return parsed;
        }
      }
    } catch {
      // Ignora falha de parsing do localStorage
    }
  }

  // Fallback para variáveis de ambiente Next.js
  const envApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const envProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (envApiKey && envProjectId) {
    return {
      apiKey: envApiKey,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || `${envProjectId}.firebaseapp.com`,
      projectId: envProjectId,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${envProjectId}.appspot.com`,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
    };
  }

  // Se o emulador estiver explicitamente habilitado, fornece credenciais de desenvolvimento local
  if (isEmulatorEnabled()) {
    const devProjId = envProjectId || 'flow-app-dev';
    return {
      apiKey: envApiKey || 'dev-emulator-api-key-12345',
      authDomain: `${devProjId}.firebaseapp.com`,
      projectId: devProjId,
      storageBucket: `${devProjId}.appspot.com`,
      messagingSenderId: '000000000000',
      appId: '1:000000000000:web:0000000000000000',
    };
  }

  return null;
};

/**
 * Salva ou limpa uma configuração customizada do Firebase informada pelo usuário
 */
export const saveCustomFirebaseConfig = (config: FirebaseCustomConfig | null): void => {
  if (typeof window === 'undefined') return;
  if (!config) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }
};

/**
 * Retorna se o Firebase está pronto para uso (tem credenciais configuradas ou emulador ativo)
 */
export const isFirebaseConfigured = (): boolean => {
  return getActiveFirebaseConfig() !== null;
};

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;
let cachedDb: Firestore | null = null;
let authEmulatorConnected = false;
let firestoreEmulatorConnected = false;

/**
 * Reseta o cache de instâncias (utilitário para testes)
 */
export const _resetEmulatorConnectionsForTesting = (): void => {
  cachedApp = null;
  cachedAuth = null;
  cachedDb = null;
  authEmulatorConnected = false;
  firestoreEmulatorConnected = false;
};

/**
 * Obtém a instância inicializada do FirebaseApp (singleton)
 */
export const getFirebaseAppInstance = (): FirebaseApp | null => {
  const config = getActiveFirebaseConfig();
  if (!config) return null;

  try {
    if (getApps().length > 0) {
      cachedApp = getApp();
    } else {
      cachedApp = initializeApp(config);
    }
    return cachedApp;
  } catch (error) {
    console.error('Falha ao inicializar FirebaseApp:', error);
    return null;
  }
};

/**
 * Obtém a instância do Firebase Auth com suporte a emulador local
 */
export const getFirebaseAuthInstance = (): Auth | null => {
  const app = getFirebaseAppInstance();
  if (!app) return null;
  try {
    if (!cachedAuth) {
      cachedAuth = getAuth(app);
    }
    if (isEmulatorEnabled() && !authEmulatorConnected) {
      const host = getEmulatorHost();
      connectAuthEmulator(cachedAuth, `http://${host}:9099`, { disableWarnings: true });
      authEmulatorConnected = true;
      console.info(`[FirebaseConfig] Firebase Auth conectado ao emulador em http://${host}:9099`);
    }
    return cachedAuth;
  } catch (error) {
    console.error('Falha ao inicializar FirebaseAuth:', error);
    return null;
  }
};

/**
 * Obtém a instância do Cloud Firestore com suporte a emulador local
 */
export const getFirebaseFirestoreInstance = (): Firestore | null => {
  const app = getFirebaseAppInstance();
  if (!app) return null;
  try {
    if (!cachedDb) {
      cachedDb = getFirestore(app);
    }
    if (isEmulatorEnabled() && !firestoreEmulatorConnected) {
      const host = getEmulatorHost();
      connectFirestoreEmulator(cachedDb, host, 8080);
      firestoreEmulatorConnected = true;
      console.info(`[FirebaseConfig] Cloud Firestore conectado ao emulador em ${host}:8080`);
    }
    return cachedDb;
  } catch (error) {
    console.error('Falha ao inicializar FirebaseFirestore:', error);
    return null;
  }
};
