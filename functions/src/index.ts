import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import * as logger from 'firebase-functions/logger';
import { authenticateRequest } from './middleware/authMiddleware';
import { checkUserQuota, recordAiUsage } from './utils/quotaManager';
import { callGeminiApi } from './services/geminiProxy';
import { GeminiProxyRequestBody } from './types';

// Inicializa o Firebase Admin SDK
initializeApp();

/**
 * Health check endpoint para monitoramento de disponibilidade
 */
export const healthCheck = onRequest(
  { cors: true, region: 'southamerica-east1' },
  (req, res) => {
    logger.info('Health check endpoint acionado', { structuredData: true });
    res.status(200).json({
      status: 'ok',
      service: 'flow-functions',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  }
);

/**
 * Cloud Function: aiProxy
 * Proxy seguro para consumo da API do Gemini por usuários autenticados e assinantes Premium.
 * Protege a chave oficial da Flow, valida JWT do Firebase Auth e gerencia limites de quotas.
 */
export const aiProxy = onRequest(
  { cors: true, region: 'southamerica-east1', secrets: ['GEMINI_API_KEY'] },
  async (req, res) => {
    // 1. Apenas requisições POST são permitidas
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Método não permitido. Utilize POST.' });
      return;
    }

    // 2. Autenticação do usuário via Firebase ID Token
    const authResult = await authenticateRequest(req);
    if (authResult.error || !authResult.user) {
      res.status(authResult.error?.status || 401).json({
        error: authResult.error?.message || 'Não autorizado.',
      });
      return;
    }

    const { user } = authResult;

    // 3. Validação do corpo da requisição
    const body = req.body as GeminiProxyRequestBody;
    if (!body || !Array.isArray(body.contents) || body.contents.length === 0) {
      res.status(400).json({
        error: 'Corpo da requisição inválido. O array "contents" é obrigatório no formato da API Gemini.',
      });
      return;
    }

    // 4. Verificação de ambiente Dev e bypass local
    const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
    const isDevPremiumHeader = req.headers['x-dev-premium'] === 'true';
    const isDevBypass = isEmulator && isDevPremiumHeader;

    // 5. Validação de Plano e Quota mensal do usuário
    const quotaResult = await checkUserQuota(user.uid, { isDevBypass });
    if (!quotaResult.allowed) {
      res.status(quotaResult.status || 403).json({
        error: quotaResult.error,
        upgradeUrl: quotaResult.upgradeUrl,
        quota: quotaResult.quota,
      });
      return;
    }

    // 6. Obtenção da API Key oficial do Flow (Secret / Environment)
    const apiKey = process.env.GEMINI_API_KEY || '';
    if (!apiKey) {
      logger.error('[aiProxy] Variável GEMINI_API_KEY não configurada no ambiente.');
      res.status(500).json({
        error: 'Serviço de IA temporariamente indisponível. Contate a equipe do Flow.',
      });
      return;
    }

    // 7. Chamada ao Google Gemini via Proxy
    const geminiResult = await callGeminiApi({
      body,
      apiKey,
    });

    if (!geminiResult.success) {
      res.status(geminiResult.status).json({
        error: geminiResult.error,
      });
      return;
    }

    // 8. Atualização assíncrona da quota consumida no Firestore
    try {
      await recordAiUsage(user.uid, geminiResult.tokensConsumed);
    } catch (quotaErr) {
      logger.error(`[aiProxy] Falha não impeditiva ao atualizar quota para ${user.uid}:`, quotaErr);
    }

    // 9. Resposta ao cliente
    const remainingUsed = (quotaResult.quota?.used ?? 0) + 1;
    const monthlyLimit = quotaResult.quota?.monthlyLimit ?? 1000;
    res.setHeader('X-Ai-Quota-Used', String(remainingUsed));
    res.setHeader('X-Ai-Quota-Limit', String(monthlyLimit));
    res.setHeader('X-Ai-Tokens-Consumed', String(geminiResult.tokensConsumed));

    res.status(200).json(geminiResult.data);
  }
);
