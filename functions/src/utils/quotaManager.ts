import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { QuotaCheckResult, UserAiQuota, UserDocument } from '../types';

export const DEFAULT_PREMIUM_MONTHLY_LIMIT = 1000;
export const UPGRADE_URL = 'https://flowapp.com/premium';

/**
 * Calcula a data do 1º dia do mês seguinte no formato ISO (YYYY-MM-DD)
 */
export const calculateNextMonthResetDate = (fromDate: Date = new Date()): string => {
  const nextMonth = new Date(Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth() + 1, 1));
  return nextMonth.toISOString().split('T')[0];
};

/**
 * Verifica se a data de reset da quota já foi atingida
 */
export const hasResetDatePassed = (resetDateStr?: string, nowDate: Date = new Date()): boolean => {
  if (!resetDateStr) return true;
  const todayStr = nowDate.toISOString().split('T')[0];
  return todayStr >= resetDateStr;
};

/**
 * Valida se o usuário possui plano ativo e quota disponível para processar IA
 */
export const checkUserQuota = async (
  uid: string,
  options?: { isDevBypass?: boolean }
): Promise<QuotaCheckResult> => {
  const isDevBypass = options?.isDevBypass ?? false;

  try {
    const userDocRef = getFirestore().doc(`users/${uid}`);
    const userDoc = await userDocRef.get();

    // Se o usuário não existir no Firestore
    if (!userDoc.exists) {
      if (isDevBypass) {
        logger.info(`[QuotaManager] Usuário ${uid} criado em modo dev bypass`);
        const devQuota: UserAiQuota = {
          monthlyLimit: 99999,
          used: 0,
          resetDate: '2099-01-01',
          totalTokensConsumed: 0,
        };
        return { allowed: true, quota: devQuota };
      }

      return {
        allowed: false,
        status: 403,
        error: 'Plano não identificado. Recurso exclusivo para assinantes do plano Premium.',
        upgradeUrl: UPGRADE_URL,
      };
    }

    const userData = userDoc.data() as UserDocument;
    const isPremium = userData?.plan === 'premium';

    // 1. Verificação de Plano
    if (!isPremium && !isDevBypass) {
      return {
        allowed: false,
        status: 403,
        error: 'Recurso exclusivo do plano Premium. Assine para utilizar os modelos de IA oficiais do Flow.',
        upgradeUrl: UPGRADE_URL,
      };
    }

    // 2. Verificação de Quota e Ciclo Mensal
    let currentQuota: UserAiQuota = userData.aiQuota || {
      monthlyLimit: DEFAULT_PREMIUM_MONTHLY_LIMIT,
      used: 0,
      resetDate: calculateNextMonthResetDate(),
      totalTokensConsumed: 0,
    };

    // Auto-reset se virou o mês
    if (hasResetDatePassed(currentQuota.resetDate)) {
      const nextResetDate = calculateNextMonthResetDate();
      logger.info(`[QuotaManager] Resetando ciclo mensal de IA para usuário ${uid}. Próximo reset: ${nextResetDate}`);

      currentQuota = {
        ...currentQuota,
        used: 0,
        resetDate: nextResetDate,
      };

      await userDocRef.set(
        {
          aiQuota: {
            used: 0,
            resetDate: nextResetDate,
          },
        },
        { merge: true }
      );
    }

    // 3. Verificação de Limite
    const monthlyLimit = currentQuota.monthlyLimit || DEFAULT_PREMIUM_MONTHLY_LIMIT;
    if (currentQuota.used >= monthlyLimit && !isDevBypass) {
      logger.warn(`[QuotaManager] Usuário ${uid} atingiu o limite mensal (${currentQuota.used}/${monthlyLimit})`);
      return {
        allowed: false,
        status: 429,
        error: `Você atingiu o limite de ${monthlyLimit} requisições de IA deste mês. Seu limite será restaurado em ${currentQuota.resetDate}.`,
        upgradeUrl: UPGRADE_URL,
        quota: currentQuota,
      };
    }

    return {
      allowed: true,
      quota: currentQuota,
    };
  } catch (err: any) {
    logger.error(`[QuotaManager] Erro ao verificar quota do usuário ${uid}:`, err);
    // Em caso de bypass no dev, não bloqueia por erro de banco
    if (isDevBypass) {
      return { allowed: true };
    }
    return {
      allowed: false,
      status: 500,
      error: 'Erro interno ao consultar quotas do usuário.',
    };
  }
};

/**
 * Incrementa o consumo de quota após uma chamada de IA bem-sucedida
 */
export const recordAiUsage = async (
  uid: string,
  tokensConsumed: number = 0
): Promise<void> => {
  try {
    const userDocRef = getFirestore().doc(`users/${uid}`);
    await userDocRef.set(
      {
        aiQuota: {
          used: FieldValue.increment(1),
          totalTokensConsumed: FieldValue.increment(tokensConsumed),
        },
        lastActiveAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err: any) {
    logger.error(`[QuotaManager] Falha ao registrar consumo de IA para ${uid}:`, err);
  }
};
