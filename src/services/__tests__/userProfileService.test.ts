import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateStreakDays,
  calculateProfileStats,
  getPresetById,
  AVATAR_PRESETS,
  userProfileService,
} from '../userProfileService';
import { Task, TaskLog, PomodoroSession, Category } from '../../types/routine';

// Mock do Firebase Firestore
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  serverTimestamp: vi.fn(() => 'MOCK_TIMESTAMP'),
}));

vi.mock('../firebaseConfig', () => ({
  getFirebaseFirestoreInstance: vi.fn(),
  isFirebaseConfigured: vi.fn(),
}));

describe('userProfileService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AVATAR_PRESETS & getPresetById', () => {
    it('deve listar os 8 avatares predefinidos', () => {
      expect(AVATAR_PRESETS.length).toBe(8);
      expect(AVATAR_PRESETS.map((p) => p.id)).toContain('spark');
      expect(AVATAR_PRESETS.map((p) => p.id)).toContain('zen');
      expect(AVATAR_PRESETS.map((p) => p.id)).toContain('rocket');
    });

    it('deve retornar o preset correto pelo id ou fallback para spark', () => {
      const zen = getPresetById('zen');
      expect(zen.id).toBe('zen');
      expect(zen.emoji).toBe('🧘');

      const fallback = getPresetById('inexistente');
      expect(fallback.id).toBe('spark');
    });
  });

  describe('calculateStreakDays', () => {
    it('deve retornar 0 quando não houver logs ou tarefas concluídas', () => {
      expect(calculateStreakDays({})).toBe(0);
      expect(
        calculateStreakDays({
          log1: { id: '1', taskId: 't1', date: '2026-09-25', completed: false },
        })
      ).toBe(0);
    });

    it('deve calcular streak consecutivo corretamente para hoje e dias anteriores', () => {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];

      const logs: Record<string, TaskLog> = {
        l1: { id: '1', taskId: 't1', date: todayStr, completed: true },
        l2: { id: '2', taskId: 't2', date: yesterdayStr, completed: true },
        l3: { id: '3', taskId: 't3', date: twoDaysAgoStr, completed: true },
      };

      expect(calculateStreakDays(logs)).toBe(3);
    });

    it('deve zerar o streak se houver intervalo de mais de 1 dia sem tarefas', () => {
      const fourDaysAgo = new Date();
      fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
      const fourDaysAgoStr = fourDaysAgo.toISOString().split('T')[0];

      const logs: Record<string, TaskLog> = {
        l1: { id: '1', taskId: 't1', date: fourDaysAgoStr, completed: true },
      };

      expect(calculateStreakDays(logs)).toBe(0);
    });
  });

  describe('calculateProfileStats', () => {
    const mockCategories: Category[] = [
      { id: 'cat_work', name: 'Trabalho', color: '#6366F1' },
      { id: 'cat_study', name: 'Estudo', color: '#10B981' },
    ];

    const mockTasks: Task[] = [
      {
        id: 't1',
        title: 'Programar app Flow',
        description: '',
        startTime: '09:00',
        endTime: '10:00',
        targetMinutes: 60,
        categoryId: 'cat_work',
        routineTypeId: 'dev',
        daysOfWeek: [1, 2, 3, 4, 5],
        tags: [],
      },
      {
        id: 't2',
        title: 'Estudo de Algoritmos',
        description: '',
        startTime: '10:00',
        endTime: '10:30',
        targetMinutes: 30,
        categoryId: 'cat_study',
        routineTypeId: 'dev',
        daysOfWeek: [1, 2, 3, 4, 5],
        tags: [],
      },
    ];

    const mockPomodoro: PomodoroSession = {
      isActive: false,
      timeLeftSeconds: 1500,
      totalDurationSeconds: 1500,
      mode: 'focus',
      linkedTaskId: null,
      completedSessions: 2, // 2 sessões = 50 min
    };

    it('deve agregar métricas de tarefas, foco e categoria predominante', () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const logs: Record<string, TaskLog> = {
        l1: { id: '1', taskId: 't1', date: todayStr, completed: true, timeSpentMinutes: 20 },
        l2: { id: '2', taskId: 't1', date: todayStr, completed: true, timeSpentMinutes: 10 },
        l3: { id: '3', taskId: 't2', date: todayStr, completed: false },
      };

      const stats = calculateProfileStats(mockTasks, logs, mockPomodoro, mockCategories);

      expect(stats.totalTasksCompleted).toBe(2);
      // Pomodoro: 2 * 25 min = 50 min + 30 min de logs = 80 min
      expect(stats.totalPomodoroMinutes).toBe(80);
      expect(stats.efficiencyRate).toBe(67); // 2 de 3 = 67%
      expect(stats.topCategory?.name).toBe('Trabalho');
      expect(stats.topCategory?.count).toBe(2);
    });

    it('deve calcular nível de produtividade, XP e progresso percentual', () => {
      const logs: Record<string, TaskLog> = {};
      const pomodoroEmpty: PomodoroSession = {
        isActive: false,
        timeLeftSeconds: 1500,
        totalDurationSeconds: 1500,
        mode: 'focus',
        linkedTaskId: null,
        completedSessions: 0,
      };

      const stats = calculateProfileStats([], logs, pomodoroEmpty, []);
      expect(stats.productivityLevel.levelNumber).toBe(1);
      expect(stats.productivityLevel.title).toBe('Iniciante Consciente');
      expect(stats.productivityLevel.points).toBe(0);
      expect(stats.productivityLevel.progressPercentage).toBe(0);
    });

    it('deve atualizar status das conquistas (achievements)', () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const logs: Record<string, TaskLog> = {
        l1: { id: '1', taskId: 't1', date: todayStr, completed: true },
      };

      const stats = calculateProfileStats(mockTasks, logs, mockPomodoro, mockCategories);

      const firstStep = stats.achievements.find((a) => a.id === 'first_step');
      expect(firstStep?.unlocked).toBe(true);

      const pomodoroHero = stats.achievements.find((a) => a.id === 'pomodoro_hero');
      expect(pomodoroHero?.unlocked).toBe(true);

      const routineMaster = stats.achievements.find((a) => a.id === 'routine_master');
      expect(routineMaster?.unlocked).toBe(false); // apenas 1 concluída, precisa de 10
    });
  });

  describe('Cloud Sync (saveUserProfileToCloud & fetchUserProfileFromCloud)', () => {
    it('cria o perfil com a foto e a identidade fornecidas pelo Google', async () => {
      const { doc, getDoc, setDoc } = await import('firebase/firestore');
      const { getFirebaseFirestoreInstance } = await import('../firebaseConfig');
      vi.mocked(getFirebaseFirestoreInstance).mockReturnValue({} as never);
      vi.mocked(doc).mockReturnValue('googleProfile' as never);
      vi.mocked(getDoc).mockResolvedValueOnce({ exists: () => false } as never);
      const profile = await userProfileService.ensureUserProfileInitialized('google-uid', {
        name: 'Conta Google',
        email: 'google@example.com',
        avatarUrl: 'https://example.com/photo.png',
      });
      expect(profile?.avatarUrl).toBe('https://example.com/photo.png');
      expect(setDoc).toHaveBeenCalledWith(
        'googleProfile',
        expect.objectContaining({
          displayName: 'Conta Google',
          email: 'google@example.com',
          profile: expect.objectContaining({
            name: 'Conta Google',
            avatarUrl: 'https://example.com/photo.png',
          }),
        }),
        { merge: true }
      );
    });

    it('remove campos opcionais indefinidos ao salvar um perfil recuperado da nuvem', async () => {
      const { doc, setDoc } = await import('firebase/firestore');
      const { getFirebaseFirestoreInstance } = await import('../firebaseConfig');
      vi.mocked(getFirebaseFirestoreInstance).mockReturnValue({} as never);
      vi.mocked(doc).mockReturnValue('existingProfile' as never);
      vi.mocked(setDoc).mockResolvedValueOnce(undefined);
      const saved = await userProfileService.saveUserProfileToCloud('uid', {
        name: 'Meu perfil',
        objective: 'Estudar',
        avatarUrl: undefined,
        bio: undefined,
      });
      expect(saved).toBe(true);
      const data = vi.mocked(setDoc).mock.calls[0][1];
      expect(data.profile).not.toHaveProperty('bio');
      expect(data.profile).not.toHaveProperty('avatarUrl');
      expect(data.profile.name).toBe('Meu perfil');
    });

    it('deve retornar false caso o Firestore não esteja disponível', async () => {
      const res = await userProfileService.saveUserProfileToCloud('', {
        name: 'Rainan',
        objective: 'Foco total',
      });
      expect(res).toBe(false);
    });

    it('deve retornar null se fetchUserProfileFromCloud for chamado sem userId', async () => {
      const res = await userProfileService.fetchUserProfileFromCloud('');
      expect(res).toBe(null);
    });

    it('deve inicializar o perfil do usuário com plano free e quotas padrão se não existir', async () => {
      const { doc, getDoc, setDoc } = await import('firebase/firestore');
      const { getFirebaseFirestoreInstance } = await import('../firebaseConfig');

      vi.mocked(getFirebaseFirestoreInstance).mockReturnValue({} as any);
      vi.mocked(doc).mockReturnValue('mockDocRef' as any);
      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => false,
      } as any);

      const profile = await userProfileService.ensureUserProfileInitialized('new_user_1', {
        name: 'Novo Usuário',
        email: 'novo@flow.app',
      });

      expect(profile).toBeDefined();
      expect(profile?.name).toBe('Novo Usuário');
      expect(profile?.plan).toBe('free');
      expect(profile?.aiQuota?.monthlyLimit).toBe(1000);
      expect(profile?.aiQuota?.used).toBe(0);
      expect(setDoc).toHaveBeenCalledWith(
        'mockDocRef',
        expect.objectContaining({
          plan: 'free',
          aiQuota: expect.objectContaining({ monthlyLimit: 1000 }),
        }),
        { merge: true }
      );
    });
  });
});
