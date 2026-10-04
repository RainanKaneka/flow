// Serviço de Sincronização em Nuvem via Firebase Firestore (Fase 4, Parte 1)
import { doc, setDoc, getDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { getFirebaseFirestoreInstance, isFirebaseConfigured } from './firebaseConfig';
import { toFirestoreData } from '../utils/firebaseData';
import {
  Task,
  RoutineType,
  Category,
  TaskLog,
  BacklogItem,
  Note,
  ReminderSettings,
  BackupSettings,
} from '../types/routine';

export interface CloudSyncPayload {
  tasks: Task[];
  routineTypes: RoutineType[];
  categories: Category[];
  logs: Record<string, TaskLog>;
  backlog: BacklogItem[];
  notes: Note[];
  reminderSettings?: ReminderSettings;
  backupSettings?: BackupSettings;
  lastUpdatedClient?: string;
  version?: number;
}

export interface CloudSyncResult {
  success: boolean;
  syncedAt: string;
  action: 'pushed_to_cloud' | 'pulled_from_cloud' | 'already_in_sync';
  cloudData?: CloudSyncPayload;
  error?: string;
}

export const cloudSyncService = {
  isConfigured(): boolean {
    return isFirebaseConfigured();
  },

  /**
   * Envia os dados locais para a partição do usuário no Firestore
   */
  async pushToCloud(userId: string, data: CloudSyncPayload): Promise<boolean> {
    const db = getFirebaseFirestoreInstance();
    if (!db) throw new Error('Firestore não configurado.');
    if (!userId) throw new Error('ID de usuário obrigatório para sincronização.');

    try {
      const userSyncDocRef = doc(db, 'users', userId, 'sync', 'state');
      const nowIso = new Date().toISOString();

      await setDoc(
        userSyncDocRef,
        {
          ...toFirestoreData(data),
          lastUpdatedClient: nowIso,
          serverTimestamp: serverTimestamp(),
        },
        { merge: true }
      );

      return true;
    } catch (error) {
      console.error('Erro ao enviar dados para a nuvem:', error);
      throw error;
    }
  },

  /**
   * Puxa os dados mais recentes salvos na nuvem para o usuário
   */
  async pullFromCloud(userId: string): Promise<CloudSyncPayload | null> {
    const db = getFirebaseFirestoreInstance();
    if (!db) throw new Error('Firestore não configurado.');
    if (!userId) throw new Error('ID de usuário obrigatório para sincronização.');

    try {
      const userSyncDocRef = doc(db, 'users', userId, 'sync', 'state');
      const snapshot = await getDoc(userSyncDocRef);

      if (!snapshot.exists()) {
        return null;
      }

      const data = snapshot.data();
      return {
        tasks: Array.isArray(data.tasks) ? data.tasks : [],
        routineTypes: Array.isArray(data.routineTypes) ? data.routineTypes : [],
        categories: Array.isArray(data.categories) ? data.categories : [],
        logs: data.logs && typeof data.logs === 'object' ? data.logs : {},
        backlog: Array.isArray(data.backlog) ? data.backlog : [],
        notes: Array.isArray(data.notes) ? data.notes : [],
        reminderSettings: data.reminderSettings,
        backupSettings: data.backupSettings,
        lastUpdatedClient: data.lastUpdatedClient,
      };
    } catch (error) {
      console.error('Erro ao baixar dados da nuvem:', error);
      throw error;
    }
  },

  /**
   * Sincronização inteligente bidirecional (Cloud Sync)
   * Se a nuvem não tiver dados, faz o upload inicial.
   * Se ambos existirem, combina as coleções com base nos IDs mais recentes.
   */
  async syncBidirectional(userId: string, localData: CloudSyncPayload): Promise<CloudSyncResult> {
    const cloud = await this.pullFromCloud(userId);
    const nowIso = new Date().toISOString();

    if (!cloud) {
      // Nenhum dado na nuvem ainda -> Primeiro push
      await this.pushToCloud(userId, localData);
      return {
        success: true,
        syncedAt: nowIso,
        action: 'pushed_to_cloud',
      };
    }

    // Mesclagem inteligente das coleções
    const mergedTasksMap = new Map<string, Task>();
    cloud.tasks.forEach((t) => mergedTasksMap.set(t.id, t));
    localData.tasks.forEach((t) => mergedTasksMap.set(t.id, t));

    const mergedNotesMap = new Map<string, Note>();
    cloud.notes.forEach((n) => mergedNotesMap.set(n.id, n));
    localData.notes.forEach((n) => {
      const existing = mergedNotesMap.get(n.id);
      if (!existing || new Date(n.updatedAt).getTime() >= new Date(existing.updatedAt).getTime()) {
        mergedNotesMap.set(n.id, n);
      }
    });

    const mergedBacklogMap = new Map<string, BacklogItem>();
    cloud.backlog.forEach((b) => mergedBacklogMap.set(b.id, b));
    localData.backlog.forEach((b) => mergedBacklogMap.set(b.id, b));

    const mergedLogs = { ...cloud.logs, ...localData.logs };

    const mergedPayload: CloudSyncPayload = {
      tasks: Array.from(mergedTasksMap.values()),
      routineTypes: localData.routineTypes.length > 0 ? localData.routineTypes : cloud.routineTypes,
      categories: localData.categories.length > 0 ? localData.categories : cloud.categories,
      logs: mergedLogs,
      backlog: Array.from(mergedBacklogMap.values()),
      notes: Array.from(mergedNotesMap.values()),
      reminderSettings: localData.reminderSettings || cloud.reminderSettings,
      backupSettings: localData.backupSettings || cloud.backupSettings,
      lastUpdatedClient: nowIso,
    };

    // Atualiza a nuvem com os dados combinados
    await this.pushToCloud(userId, mergedPayload);

    return {
      success: true,
      syncedAt: nowIso,
      action: 'pulled_from_cloud',
      cloudData: mergedPayload,
    };
  },

  /**
   * Listener em tempo real para sincronização instantânea multi-dispositivo
   */
  subscribeToCloudChanges(
    userId: string,
    onRemoteChange: (payload: CloudSyncPayload) => void
  ): () => void {
    const db = getFirebaseFirestoreInstance();
    if (!db || !userId) return () => {};

    try {
      const userSyncDocRef = doc(db, 'users', userId, 'sync', 'state');
      return onSnapshot(userSyncDocRef, (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.data();
        if (data) {
          onRemoteChange({
            tasks: Array.isArray(data.tasks) ? data.tasks : [],
            routineTypes: Array.isArray(data.routineTypes) ? data.routineTypes : [],
            categories: Array.isArray(data.categories) ? data.categories : [],
            logs: data.logs && typeof data.logs === 'object' ? data.logs : {},
            backlog: Array.isArray(data.backlog) ? data.backlog : [],
            notes: Array.isArray(data.notes) ? data.notes : [],
            reminderSettings: data.reminderSettings,
            backupSettings: data.backupSettings,
            lastUpdatedClient: data.lastUpdatedClient,
          });
        }
      });
    } catch (error) {
      console.error('Erro ao subscrever listener do Firestore:', error);
      return () => {};
    }
  },
};
