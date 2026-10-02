import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateNextMonthResetDate,
  hasResetDatePassed,
  checkUserQuota,
  recordAiUsage,
} from '../utils/quotaManager';
import { getFirestore } from 'firebase-admin/firestore';

vi.mock('firebase-admin/firestore', () => {
  const incrementMock = vi.fn((n) => ({ _increment: n }));
  const serverTimestampMock = vi.fn(() => ({ _serverTimestamp: true }));
  return {
    getFirestore: vi.fn(),
    FieldValue: {
      increment: incrementMock,
      serverTimestamp: serverTimestampMock,
    },
  };
});

vi.mock('firebase-functions/logger', () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

describe('quotaManager', () => {
  let docMock: any;
  let getMock: any;
  let setMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    setMock = vi.fn().mockResolvedValue(undefined);
    getMock = vi.fn();
    docMock = vi.fn().mockReturnValue({
      get: getMock,
      set: setMock,
    });
    vi.mocked(getFirestore).mockReturnValue({
      doc: docMock,
    } as any);
  });

  describe('calculateNextMonthResetDate', () => {
    it('deve retornar o primeiro dia do mês subsequente', () => {
      const fixedDate = new Date('2026-09-15T12:00:00Z');
      const reset = calculateNextMonthResetDate(fixedDate);
      expect(reset).toBe('2026-10-01');
    });

    it('deve virar o ano ao calcular o reset em Dezembro', () => {
      const fixedDate = new Date('2026-12-20T12:00:00Z');
      const reset = calculateNextMonthResetDate(fixedDate);
      expect(reset).toBe('2027-01-01');
    });
  });

  describe('hasResetDatePassed', () => {
    it('deve retornar true se a data atual for maior ou igual à data de reset', () => {
      const now = new Date('2026-10-01T00:00:00Z');
      expect(hasResetDatePassed('2026-10-01', now)).toBe(true);
      expect(hasResetDatePassed('2026-09-01', now)).toBe(true);
    });

    it('deve retornar false se a data de reset estiver no futuro', () => {
      const now = new Date('2026-09-15T00:00:00Z');
      expect(hasResetDatePassed('2026-10-01', now)).toBe(false);
    });
  });

  describe('checkUserQuota', () => {
    it('deve bloquear com 403 se o usuário não existir no Firestore', async () => {
      getMock.mockResolvedValue({ exists: false });

      const res = await checkUserQuota('unknown_uid');
      expect(res.allowed).toBe(false);
      expect(res.status).toBe(403);
      expect(res.error).toContain('Plano não identificado');
    });

    it('deve permitir acesso se usuário não existir mas devBypass for verdadeiro', async () => {
      getMock.mockResolvedValue({ exists: false });

      const res = await checkUserQuota('unknown_uid', { isDevBypass: true });
      expect(res.allowed).toBe(true);
      expect(res.quota?.monthlyLimit).toBe(99999);
    });

    it('deve bloquear com 403 se o plano for free', async () => {
      getMock.mockResolvedValue({
        exists: true,
        data: () => ({ plan: 'free' }),
      });

      const res = await checkUserQuota('user_free');
      expect(res.allowed).toBe(false);
      expect(res.status).toBe(403);
      expect(res.upgradeUrl).toBeDefined();
    });

    it('deve permitir acesso se o plano for premium e houver saldo de quota', async () => {
      getMock.mockResolvedValue({
        exists: true,
        data: () => ({
          plan: 'premium',
          aiQuota: {
            monthlyLimit: 1000,
            used: 50,
            resetDate: '2099-01-01',
            totalTokensConsumed: 2500,
          },
        }),
      });

      const res = await checkUserQuota('user_premium');
      expect(res.allowed).toBe(true);
      expect(res.quota?.used).toBe(50);
    });

    it('deve bloquear com 429 se a quota mensal estiver esgotada', async () => {
      getMock.mockResolvedValue({
        exists: true,
        data: () => ({
          plan: 'premium',
          aiQuota: {
            monthlyLimit: 1000,
            used: 1000,
            resetDate: '2099-01-01',
            totalTokensConsumed: 100000,
          },
        }),
      });

      const res = await checkUserQuota('user_exhausted');
      expect(res.allowed).toBe(false);
      expect(res.status).toBe(429);
      expect(res.error).toContain('limite de 1000 requisições');
    });
  });

  describe('recordAiUsage', () => {
    it('deve incrementar o consumo de uso e tokens no Firestore', async () => {
      await recordAiUsage('user_123', 450);

      expect(docMock).toHaveBeenCalledWith('users/user_123');
      expect(setMock).toHaveBeenCalledWith(
        expect.objectContaining({
          aiQuota: {
            used: expect.anything(),
            totalTokensConsumed: expect.anything(),
          },
        }),
        { merge: true }
      );
    });
  });
});
