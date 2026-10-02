import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractBearerToken, authenticateRequest } from '../middleware/authMiddleware';
import { getAuth } from 'firebase-admin/auth';

vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn(),
}));

vi.mock('firebase-functions/logger', () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

describe('authMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.FUNCTIONS_EMULATOR;
  });

  describe('extractBearerToken', () => {
    it('deve extrair o token do cabeçalho Bearer corretamente', () => {
      expect(extractBearerToken('Bearer abc.123.xyz')).toBe('abc.123.xyz');
      expect(extractBearerToken('bearer my-token-123')).toBe('my-token-123');
    });

    it('deve retornar null se o cabeçalho for inválido ou ausente', () => {
      expect(extractBearerToken(undefined)).toBeNull();
      expect(extractBearerToken('')).toBeNull();
      expect(extractBearerToken('Basic user:pass')).toBeNull();
      expect(extractBearerToken('Token abc')).toBeNull();
    });
  });

  describe('authenticateRequest', () => {
    it('deve retornar 401 se não houver cabeçalho de autorização', async () => {
      const result = await authenticateRequest({ headers: {} });
      expect(result.user).toBeNull();
      expect(result.error?.status).toBe(401);
      expect(result.error?.message).toContain('Token de autenticação ausente');
    });

    it('deve autenticar com sucesso quando o token for válido', async () => {
      const verifyIdTokenMock = vi.fn().mockResolvedValue({
        uid: 'user_123',
        email: 'user@example.com',
        name: 'Test User',
      });
      vi.mocked(getAuth).mockReturnValue({
        verifyIdToken: verifyIdTokenMock,
      } as any);

      const result = await authenticateRequest({
        headers: { authorization: 'Bearer valid.jwt.token' },
      });

      expect(verifyIdTokenMock).toHaveBeenCalledWith('valid.jwt.token');
      expect(result.error).toBeNull();
      expect(result.user?.uid).toBe('user_123');
      expect(result.user?.email).toBe('user@example.com');
      expect(result.user?.displayName).toBe('Test User');
    });

    it('deve retornar erro 401 específico se o token estiver expirado', async () => {
      const verifyIdTokenMock = vi.fn().mockRejectedValue({
        code: 'auth/id-token-expired',
        message: 'Token expired',
      });
      vi.mocked(getAuth).mockReturnValue({
        verifyIdToken: verifyIdTokenMock,
      } as any);

      const result = await authenticateRequest({
        headers: { authorization: 'Bearer expired.token' },
      });

      expect(result.user).toBeNull();
      expect(result.error?.status).toBe(401);
      expect(result.error?.message).toContain('expirado');
    });

    it('deve suportar bypass mock no emulador local', async () => {
      process.env.FUNCTIONS_EMULATOR = 'true';

      const result = await authenticateRequest({
        headers: {
          'x-mock-user-id': 'dev_user_99',
          'x-mock-user-email': 'dev@flow.test',
        },
      });

      expect(result.error).toBeNull();
      expect(result.user?.uid).toBe('dev_user_99');
      expect(result.user?.email).toBe('dev@flow.test');
    });
  });
});
