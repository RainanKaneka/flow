import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cloudSyncService, CloudSyncPayload } from '../cloudSyncService';
import * as firebaseConfig from '../firebaseConfig';
import * as firestore from 'firebase/firestore';

vi.mock('../firebaseConfig', () => ({
  getFirebaseFirestoreInstance: vi.fn(),
  isFirebaseConfigured: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn().mockReturnValue('mock-doc-ref'),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  onSnapshot: vi.fn(),
  serverTimestamp: vi.fn().mockReturnValue('mock-timestamp'),
}));

describe('cloudSyncService', () => {
  const mockDbInstance = { type: 'firestore' };

  const samplePayload: CloudSyncPayload = {
    tasks: [
      {
        id: 'task-1',
        title: 'Tarefa 1',
        description: '',
        startTime: '08:00',
        endTime: '09:00',
        routineTypeId: 'rt-1',
        categoryId: 'cat-1',
        daysOfWeek: [1, 2, 3],
        targetMinutes: 60,
        tags: [],
      },
    ],
    routineTypes: [{ id: 'rt-1', name: 'Rotina Teste' }],
    categories: [{ id: 'cat-1', name: 'Foco', color: '#6366F1' }],
    logs: {
      'log-1': { id: 'log-1', taskId: 'task-1', date: '2026-09-25', completed: true },
    },
    backlog: [],
    notes: [
      {
        id: 'note-1',
        title: 'Nota 1',
        content: 'Conteúdo',
        tags: [],
        createdAt: '2026-09-25T10:00:00.000Z',
        updatedAt: '2026-09-25T10:00:00.000Z',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (firebaseConfig.isFirebaseConfigured as any).mockReturnValue(true);
    (firebaseConfig.getFirebaseFirestoreInstance as any).mockReturnValue(mockDbInstance);
  });

  it('lança erro se Firestore não estiver configurado ao fazer push', async () => {
    (firebaseConfig.getFirebaseFirestoreInstance as any).mockReturnValue(null);
    await expect(cloudSyncService.pushToCloud('user-1', samplePayload)).rejects.toThrow(
      'Firestore não configurado.'
    );
  });

  it('faz push dos dados com setDoc e merge: true', async () => {
    (firestore.setDoc as any).mockResolvedValueOnce(undefined);

    const success = await cloudSyncService.pushToCloud('user-123', samplePayload);
    expect(success).toBe(true);
    expect(firestore.doc).toHaveBeenCalledWith(mockDbInstance, 'users', 'user-123', 'sync', 'state');
    expect(firestore.setDoc).toHaveBeenCalledWith(
      'mock-doc-ref',
      expect.objectContaining({
        tasks: samplePayload.tasks,
        routineTypes: samplePayload.routineTypes,
        categories: samplePayload.categories,
      }),
      { merge: true }
    );
  });

  it('puxa dados do Firestore com pullFromCloud quando documento existe', async () => {
    (firestore.getDoc as any).mockResolvedValueOnce({
      exists: () => true,
      data: () => samplePayload,
    });

    const pulled = await cloudSyncService.pullFromCloud('user-123');
    expect(pulled).not.toBeNull();
    expect(pulled?.tasks.length).toBe(1);
    expect(pulled?.tasks[0].id).toBe('task-1');
  });

  it('retorna null em pullFromCloud quando documento não existe', async () => {
    (firestore.getDoc as any).mockResolvedValueOnce({
      exists: () => false,
    });

    const pulled = await cloudSyncService.pullFromCloud('user-123');
    expect(pulled).toBeNull();
  });

  it('executa sincronização inicial push quando a nuvem está vazia', async () => {
    // Nuvem vazia
    (firestore.getDoc as any).mockResolvedValueOnce({
      exists: () => false,
    });
    (firestore.setDoc as any).mockResolvedValueOnce(undefined);

    const result = await cloudSyncService.syncBidirectional('user-123', samplePayload);
    expect(result.success).toBe(true);
    expect(result.action).toBe('pushed_to_cloud');
    expect(firestore.setDoc).toHaveBeenCalled();
  });

  it('mescla dados locais e remotos de forma inteligente', async () => {
    const cloudPayload: CloudSyncPayload = {
      tasks: [
        {
          id: 'task-cloud',
          title: 'Tarefa Nuvem',
          description: '',
          startTime: '10:00',
          endTime: '11:00',
          routineTypeId: 'rt-1',
          categoryId: 'cat-1',
          daysOfWeek: [1, 2],
          targetMinutes: 60,
          tags: [],
        },
      ],
      routineTypes: [{ id: 'rt-1', name: 'Rotina Teste' }],
      categories: [{ id: 'cat-1', name: 'Foco', color: '#6366F1' }],
      logs: {},
      backlog: [],
      notes: [
        {
          id: 'note-1',
          title: 'Nota Antiga',
          content: 'Conteúdo Antigo',
          tags: [],
          createdAt: '2026-09-25T08:00:00.000Z',
          updatedAt: '2026-09-25T08:00:00.000Z',
        },
      ],
    };

    (firestore.getDoc as any).mockResolvedValueOnce({
      exists: () => true,
      data: () => cloudPayload,
    });
    (firestore.setDoc as any).mockResolvedValueOnce(undefined);

    const result = await cloudSyncService.syncBidirectional('user-123', samplePayload);
    expect(result.success).toBe(true);
    expect(result.action).toBe('pulled_from_cloud');
    expect(result.cloudData).toBeDefined();

    // Contém ambas as tarefas (task-1 e task-cloud)
    const taskIds = result.cloudData?.tasks.map((t) => t.id);
    expect(taskIds).toContain('task-1');
    expect(taskIds).toContain('task-cloud');

    // Nota local mais recente prevalece sobre nota mais antiga
    const note = result.cloudData?.notes.find((n) => n.id === 'note-1');
    expect(note?.title).toBe('Nota 1');
  });

  it('inscreve no onSnapshot com subscribeToCloudChanges', () => {
    const unsubMock = vi.fn();
    (firestore.onSnapshot as any).mockReturnValue(unsubMock);

    const callback = vi.fn();
    const unsub = cloudSyncService.subscribeToCloudChanges('user-123', callback);

    expect(firestore.onSnapshot).toHaveBeenCalled();
    unsub();
    expect(unsubMock).toHaveBeenCalled();
  });
});
