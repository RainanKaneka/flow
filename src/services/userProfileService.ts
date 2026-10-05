import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseFirestoreInstance, isFirebaseConfigured } from './firebaseConfig';
import { toFirestoreData } from '../utils/firebaseData';
import type { RewardWallet } from '../types/rewards';
import { rewardAchievements, rewardLevel } from './rewards/engine';
import {
  Task,
  TaskLog,
  PomodoroSession,
  Category,
  UserProfile,
  UserProfileStats,
  ProfileAchievement,
} from '../types/routine';

export interface AvatarPresetOption {
  id: string;
  label: string;
  emoji: string;
  bgGradient: string;
  description: string;
}

export const AVATAR_PRESETS: AvatarPresetOption[] = [
  {
    id: 'spark',
    label: 'Faísca',
    emoji: '⚡',
    bgGradient: 'linear-gradient(135deg, #F59E0B, #D97706)',
    description: 'Foco Ágil & Decisivo',
  },
  {
    id: 'flame',
    label: 'Chama',
    emoji: '🔥',
    bgGradient: 'linear-gradient(135deg, #EF4444, #B91C1C)',
    description: 'Alta Intensidade',
  },
  {
    id: 'zen',
    label: 'Zen',
    emoji: '🧘',
    bgGradient: 'linear-gradient(135deg, #10B981, #047857)',
    description: 'Equilíbrio & Clareza',
  },
  {
    id: 'rocket',
    label: 'Foguete',
    emoji: '🚀',
    bgGradient: 'linear-gradient(135deg, #6366F1, #4338CA)',
    description: 'Produtividade Máxima',
  },
  {
    id: 'crown',
    label: 'Coroa',
    emoji: '👑',
    bgGradient: 'linear-gradient(135deg, #EAB308, #CA8A04)',
    description: 'Domínio da Rotina',
  },
  {
    id: 'brain',
    label: 'Mente',
    emoji: '🧠',
    bgGradient: 'linear-gradient(135deg, #EC4899, #BE185D)',
    description: 'Estratégia & Foco',
  },
  {
    id: 'star',
    label: 'Estrela',
    emoji: '⭐',
    bgGradient: 'linear-gradient(135deg, #06B6D4, #0E7490)',
    description: 'Consistência Diária',
  },
  {
    id: 'diamond',
    label: 'Diamante',
    emoji: '💎',
    bgGradient: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
    description: 'Resiliência & Maestria',
  },
];

export const getPresetById = (id?: string): AvatarPresetOption => {
  return AVATAR_PRESETS.find((p) => p.id === id) || AVATAR_PRESETS[0];
};

/**
 * Calcula a sequência (streak) de dias consecutivos com tarefas concluídas
 */
export const calculateStreakDays = (logs: Record<string, TaskLog>): number => {
  const completedDates = new Set<string>();

  Object.values(logs).forEach((log) => {
    if (log.completed && log.date) {
      completedDates.add(log.date);
    }
  });

  if (completedDates.size === 0) return 0;

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // O streak continua se tiver concluído hoje ou ontem
  if (!completedDates.has(todayStr) && !completedDates.has(yesterdayStr)) {
    return 0;
  }

  let streak = 0;
  const checkDate = completedDates.has(todayStr) ? new Date(today) : yesterday;

  while (true) {
    const checkStr = checkDate.toISOString().split('T')[0];
    if (completedDates.has(checkStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
};

/**
 * Calcula as estatísticas completas e gamificação do perfil
 */
export const calculateProfileStats = (
  tasks: Task[],
  logs: Record<string, TaskLog>,
  pomodoro: PomodoroSession,
  categories: Category[],
  rewardWallet?: RewardWallet | null
): UserProfileStats => {
  // 1. Tarefas Concluídas
  const completedLogs = Object.values(logs).filter((l) => l.completed);
  const totalTasksCompleted = completedLogs.length;

  // 2. Tempo de Foco (Pomodoro + logs com timeSpentMinutes)
  const pomodoroMinutes =
    (pomodoro.completedSessions || 0) * Math.round((pomodoro.totalDurationSeconds || 1500) / 60);
  const logsMinutes = completedLogs.reduce((acc, curr) => acc + (curr.timeSpentMinutes || 0), 0);
  const totalPomodoroMinutes = pomodoroMinutes + logsMinutes;

  // 3. Sequência (Streak)
  const currentStreakDays = calculateStreakDays(logs);

  // 4. Taxa de Eficiência
  const totalLoggedAttempts = Object.values(logs).length;
  const efficiencyRate =
    totalLoggedAttempts > 0
      ? Math.min(100, Math.round((totalTasksCompleted / totalLoggedAttempts) * 100))
      : totalTasksCompleted > 0
        ? 100
        : 0;

  // 5. Categoria Predominante
  const categoryCountMap: Record<string, { count: number; minutes: number }> = {};
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  completedLogs.forEach((log) => {
    const task = tasks.find((t) => t.id === log.taskId);
    if (task) {
      const catId = task.categoryId || 'default';
      if (!categoryCountMap[catId]) {
        categoryCountMap[catId] = { count: 0, minutes: 0 };
      }
      categoryCountMap[catId].count += 1;
      categoryCountMap[catId].minutes += task.targetMinutes || 0;
    }
  });

  let topCategory: UserProfileStats['topCategory'] = null;
  let maxCount = -1;

  Object.entries(categoryCountMap).forEach(([catId, val]) => {
    if (val.count > maxCount) {
      maxCount = val.count;
      const cat = categoryMap.get(catId);
      topCategory = {
        id: catId,
        name: cat?.name || 'Geral',
        color: cat?.color || '#6366F1',
        count: val.count,
        minutes: val.minutes,
      };
    }
  });

  // 6. Gamificação: Nível & XP
  const xp = totalTasksCompleted * 50 + totalPomodoroMinutes * 2 + currentStreakDays * 100;

  let levelNumber = 1;
  let title = 'Iniciante Consciente';
  let nextLevelPoints = 250;
  let prevLevelPoints = 0;

  if (xp >= 2500) {
    levelNumber = 5;
    title = 'Estado de Flow Lendário';
    prevLevelPoints = 2500;
    nextLevelPoints = 5000;
  } else if (xp >= 1200) {
    levelNumber = 4;
    title = 'Mestre da Disciplina';
    prevLevelPoints = 1200;
    nextLevelPoints = 2500;
  } else if (xp >= 600) {
    levelNumber = 3;
    title = 'Foco Consistente';
    prevLevelPoints = 600;
    nextLevelPoints = 1200;
  } else if (xp >= 250) {
    levelNumber = 2;
    title = 'Criador de Hábitos';
    prevLevelPoints = 250;
    nextLevelPoints = 600;
  } else {
    levelNumber = 1;
    title = 'Iniciante Consciente';
    prevLevelPoints = 0;
    nextLevelPoints = 250;
  }

  const range = nextLevelPoints - prevLevelPoints;
  const currentProgress = xp - prevLevelPoints;
  const progressPercentage = Math.min(
    100,
    Math.max(0, Math.round((currentProgress / range) * 100))
  );

  // 7. Mural de Conquistas
  const achievements: ProfileAchievement[] = [
    {
      id: 'first_step',
      title: 'Primeiro Passo',
      description: 'Concluiu a primeira tarefa na sua rotina',
      icon: '🎯',
      unlocked: totalTasksCompleted >= 1,
      progressText: `${Math.min(totalTasksCompleted, 1)}/1`,
    },
    {
      id: 'pomodoro_hero',
      title: 'Mestre do Pomodoro',
      description: 'Realizou uma sessão de foco completa',
      icon: '⏱️',
      unlocked: totalPomodoroMinutes >= 15 || (pomodoro.completedSessions || 0) >= 1,
      progressText: `${totalPomodoroMinutes} min focados`,
    },
    {
      id: 'task_streak_3',
      title: 'Foco Implacável',
      description: 'Manteve 3 dias seguidos com tarefas concluídas',
      icon: '🔥',
      unlocked: currentStreakDays >= 3,
      progressText: `${Math.min(currentStreakDays, 3)}/3 dias`,
    },
    {
      id: 'task_streak_7',
      title: 'Semana Perfeita',
      description: 'Alcançou uma sequência de 7 dias consecutivos',
      icon: '⚡',
      unlocked: currentStreakDays >= 7,
      progressText: `${Math.min(currentStreakDays, 7)}/7 dias`,
    },
    {
      id: 'routine_master',
      title: 'Produtividade 10x',
      description: 'Concluiu 10 ou mais tarefas no Flow',
      icon: '🏆',
      unlocked: totalTasksCompleted >= 10,
      progressText: `${Math.min(totalTasksCompleted, 10)}/10 tarefas`,
    },
    {
      id: 'time_warrior',
      title: 'Hora de Ouro',
      description: 'Acumulou mais de 60 minutos de foco focado',
      icon: '👑',
      unlocked: totalPomodoroMinutes >= 60,
      progressText: `${Math.min(totalPomodoroMinutes, 60)}/60 min`,
    },
  ];

  return {
    totalTasksCompleted,
    totalPomodoroMinutes,
    currentStreakDays,
    efficiencyRate,
    topCategory,
    productivityLevel: rewardWallet ? rewardLevel(rewardWallet.xp) : {
      levelNumber,
      title,
      points: xp,
      nextLevelPoints,
      progressPercentage,
    },
    achievements: rewardWallet ? achievements.map((achievement) => {
      const unlocked = rewardAchievements(rewardWallet).includes(achievement.id);
      return { ...achievement, unlocked, progressText: unlocked ? 'Conquista permanente' : achievement.progressText };
    }) : achievements,
  };
};

/**
 * Calcula a data do próximo ciclo de renovação (primeiro dia do mês seguinte)
 */
export const calculateNextResetDate = (fromDate: Date = new Date()): string => {
  const nextMonth = new Date(Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth() + 1, 1));
  return nextMonth.toISOString().split('T')[0];
};

/**
 * Serviço de Perfil de Usuário com sincronização em nuvem e Firestore
 */
export const userProfileService = {
  isCloudConfigured(): boolean {
    return isFirebaseConfigured();
  },

  /**
   * Garante que o documento do usuário em `users/{userId}` esteja inicializado com o schema completo
   */
  async ensureUserProfileInitialized(
    userId: string,
    initialData?: { name?: string; email?: string; objective?: string; avatarUrl?: string }
  ): Promise<UserProfile | null> {
    const db = getFirebaseFirestoreInstance();
    if (!db || !userId) return null;

    try {
      const userDocRef = doc(db, 'users', userId);
      const snapshot = await getDoc(userDocRef);

      if (snapshot.exists()) {
        return this.fetchUserProfileFromCloud(userId);
      }

      const defaultProfile: UserProfile = {
        name: initialData?.name || 'Usuário Flow',
        objective: initialData?.objective || 'Organizar minha rotina diária',
        avatarPreset: 'spark',
        ...(initialData?.avatarUrl ? { avatarUrl: initialData.avatarUrl } : {}),
        plan: 'free',
        premiumSince: null,
        premiumUntil: null,
        aiQuota: {
          monthlyLimit: 1000,
          used: 0,
          resetDate: calculateNextResetDate(),
          totalTokensConsumed: 0,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(
        userDocRef,
        {
          displayName: defaultProfile.name,
          email: initialData?.email || '',
          plan: 'free',
          premiumSince: null,
          premiumUntil: null,
          aiQuota: defaultProfile.aiQuota,
          profile: {
            ...defaultProfile,
          },
          createdAt: serverTimestamp(),
          lastSeenAt: serverTimestamp(),
        },
        { merge: true }
      );

      return defaultProfile;
    } catch (error) {
      console.warn(
        '[userProfileService] Falha ao inicializar perfil de usuário no Firestore:',
        error
      );
      return null;
    }
  },

  /**
   * Salva o perfil no Firestore em `users/{userId}` de forma persistente
   */
  async saveUserProfileToCloud(userId: string, profile: UserProfile): Promise<boolean> {
    const db = getFirebaseFirestoreInstance();
    if (!db || !userId) return false;

    try {
      const userDocRef = doc(db, 'users', userId);
      await setDoc(
        userDocRef,
        {
          displayName: profile.name || 'Usuário Flow',
          profile: {
            ...toFirestoreData(profile),
            updatedAt: new Date().toISOString(),
          },
          lastSeenAt: serverTimestamp(),
        },
        { merge: true }
      );
      return true;
    } catch (error) {
      console.warn('[userProfileService] Falha ao sincronizar perfil com o Firestore:', error);
      return false;
    }
  },

  /**
   * Busca o perfil gravado no Firestore com status de plano e quotas
   */
  async fetchUserProfileFromCloud(userId: string): Promise<UserProfile | null> {
    const db = getFirebaseFirestoreInstance();
    if (!db || !userId) return null;

    try {
      const userDocRef = doc(db, 'users', userId);
      const snapshot = await getDoc(userDocRef);
      if (!snapshot.exists()) return null;

      const data = snapshot.data();
      const profileData = data?.profile || {};

      return {
        name: profileData.name || data.displayName || '',
        objective: profileData.objective || '',
        bio: profileData.bio,
        avatarUrl: profileData.avatarUrl,
        avatarPreset: profileData.avatarPreset,
        plan: data.plan || profileData.plan || 'free',
        premiumSince: data.premiumSince || profileData.premiumSince || null,
        premiumUntil: data.premiumUntil || profileData.premiumUntil || null,
        aiQuota: data.aiQuota || profileData.aiQuota || undefined,
        themePreference: profileData.themePreference,
        pomodoroMinutes: profileData.pomodoroMinutes,
        soundEnabled: profileData.soundEnabled,
        remindersEnabled: profileData.remindersEnabled,
        createdAt: profileData.createdAt,
        updatedAt: profileData.updatedAt,
      };
    } catch (error) {
      console.warn('[userProfileService] Falha ao carregar perfil do Firestore:', error);
      return null;
    }
  },
};
