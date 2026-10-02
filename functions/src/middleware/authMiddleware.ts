import { getAuth } from 'firebase-admin/auth';
import * as logger from 'firebase-functions/logger';
import { AuthUserContext } from '../types';

export interface AuthValidationResult {
  user: AuthUserContext | null;
  error: {
    status: number;
    message: string;
  } | null;
}

/**
 * Extrai o token Bearer do cabeçalho Authorization
 */
export const extractBearerToken = (authHeader?: string): string | null => {
  if (!authHeader || typeof authHeader !== 'string') return null;
  const match = authHeader.match(/^Bearer\s+(.*)$/i);
  return match ? match[1].trim() : null;
};

/**
 * Valida a autenticação do Firebase no cabeçalho da requisição
 * Suporta emulação local e tokens JWT emitidos pelo Firebase Auth
 */
export const authenticateRequest = async (
  req: { headers: Record<string, string | string[] | undefined> }
): Promise<AuthValidationResult> => {
  const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';

  // Suporte a bypass de desenvolvimento no Firebase Emulator
  const mockUserId = req.headers['x-mock-user-id'];
  if (isEmulator && typeof mockUserId === 'string' && mockUserId.trim().length > 0) {
    logger.info(`[Auth] Emulator mock user ativo: ${mockUserId}`);
    return {
      user: {
        uid: mockUserId.trim(),
        email: typeof req.headers['x-mock-user-email'] === 'string' ? req.headers['x-mock-user-email'] : `${mockUserId}@test.local`,
        displayName: 'Dev Test User',
      },
      error: null,
    };
  }

  const rawAuthHeader = req.headers.authorization;
  const authHeader = Array.isArray(rawAuthHeader) ? rawAuthHeader[0] : rawAuthHeader;
  const token = extractBearerToken(authHeader);

  if (!token) {
    return {
      user: null,
      error: {
        status: 401,
        message: 'Token de autenticação ausente ou em formato inválido. Envie "Authorization: Bearer <idToken>".',
      },
    };
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    return {
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        displayName: decodedToken.name,
      },
      error: null,
    };
  } catch (err: any) {
    logger.warn('[Auth] Falha na validação do token Firebase:', {
      code: err?.code,
      message: err?.message,
    });

    if (err?.code === 'auth/id-token-expired') {
      return {
        user: null,
        error: {
          status: 401,
          message: 'Token de autenticação expirado. Renove a sessão do Firebase Auth.',
        },
      };
    }

    return {
      user: null,
      error: {
        status: 401,
        message: 'Token de autenticação inválido ou corrompido.',
      },
    };
  }
};
