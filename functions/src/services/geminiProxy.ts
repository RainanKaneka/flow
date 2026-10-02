import * as logger from 'firebase-functions/logger';
import { GeminiProxyRequestBody } from '../types';

export const DEFAULT_PROXY_MODEL = 'gemini-2.5-flash';

export interface GeminiProxyResult {
  success: boolean;
  status: number;
  data?: any;
  error?: string;
  tokensConsumed: number;
}

/**
 * Normaliza o modelo solicitado para a versão suportada mais atual
 */
export const normalizeModelName = (modelName?: string): string => {
  if (!modelName || modelName.trim() === '' || modelName.includes('gemini-2.0-flash')) {
    return DEFAULT_PROXY_MODEL;
  }
  return modelName.trim();
};

/**
 * Executa a chamada segura para o endpoint da Google Generative Language API
 */
export const callGeminiApi = async ({
  body,
  apiKey,
  overrideModel,
}: {
  body: GeminiProxyRequestBody;
  apiKey: string;
  overrideModel?: string;
}): Promise<GeminiProxyResult> => {
  if (!apiKey || apiKey.trim().length === 0) {
    logger.error('[GeminiProxy] Chave de API do Gemini não configurada no servidor.');
    return {
      success: false,
      status: 500,
      error: 'Serviço de IA indisponível no servidor (Chave de API não configurada). Contate o suporte.',
      tokensConsumed: 0,
    };
  }

  const model = normalizeModelName(overrideModel || body.model);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;

  const payload: Record<string, any> = {
    contents: body.contents,
  };

  if (body.systemInstruction) {
    payload.systemInstruction = body.systemInstruction;
  }

  if (body.generationConfig) {
    payload.generationConfig = body.generationConfig;
  }

  if (body.safetySettings) {
    payload.safetySettings = body.safetySettings;
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();

    if (!response.ok) {
      const errorMsg =
        responseData?.error?.message ||
        `Erro na API do Gemini (HTTP ${response.status})`;
      logger.warn('[GeminiProxy] Erro retornado pela API do Gemini:', {
        status: response.status,
        error: errorMsg,
      });

      return {
        success: false,
        status: response.status,
        error: errorMsg,
        tokensConsumed: 0,
      };
    }

    const tokensConsumed =
      responseData?.usageMetadata?.totalTokenCount ||
      (responseData?.usageMetadata?.promptTokenCount || 0) +
        (responseData?.usageMetadata?.candidatesTokenCount || 0) ||
      0;

    return {
      success: true,
      status: 200,
      data: responseData,
      tokensConsumed,
    };
  } catch (err: any) {
    logger.error('[GeminiProxy] Exceção de rede ao chamar Gemini API:', err);
    return {
      success: false,
      status: 502,
      error: `Falha de conexão com a API do Gemini: ${err?.message || 'Erro de rede'}`,
      tokensConsumed: 0,
    };
  }
};
