import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  normalizeModelName,
  callGeminiApi,
  DEFAULT_PROXY_MODEL,
} from '../services/geminiProxy';

vi.mock('firebase-functions/logger', () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

describe('geminiProxy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('normalizeModelName', () => {
    it('deve usar o modelo default quando o nome for omitido ou vazio', () => {
      expect(normalizeModelName()).toBe(DEFAULT_PROXY_MODEL);
      expect(normalizeModelName('')).toBe(DEFAULT_PROXY_MODEL);
      expect(normalizeModelName('  ')).toBe(DEFAULT_PROXY_MODEL);
    });

    it('deve substituir versão descontinuada gemini-2.0-flash pelo modelo default', () => {
      expect(normalizeModelName('gemini-2.0-flash')).toBe(DEFAULT_PROXY_MODEL);
    });

    it('deve manter o modelo customizado válido', () => {
      expect(normalizeModelName('gemini-2.5-pro')).toBe('gemini-2.5-pro');
      expect(normalizeModelName('gemini-1.5-flash')).toBe('gemini-1.5-flash');
    });
  });

  describe('callGeminiApi', () => {
    it('deve retornar erro 500 se a apiKey estiver ausente', async () => {
      const res = await callGeminiApi({
        body: { contents: [{ parts: [{ text: 'Olá' }] }] },
        apiKey: '',
      });

      expect(res.success).toBe(false);
      expect(res.status).toBe(500);
      expect(res.error).toContain('Chave de API não configurada');
    });

    it('deve processar resposta de sucesso da API do Gemini e calcular tokens', async () => {
      const mockGeminiResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: 'Resposta simulada com sucesso.' }],
              role: 'model',
            },
            finishReason: 'STOP',
          },
        ],
        usageMetadata: {
          promptTokenCount: 15,
          candidatesTokenCount: 20,
          totalTokenCount: 35,
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockGeminiResponse),
      });

      const res = await callGeminiApi({
        body: {
          contents: [{ parts: [{ text: 'Gere minha rotina' }] }],
          model: 'gemini-2.5-flash',
        },
        apiKey: 'fake-api-key',
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe(200);
      expect(res.tokensConsumed).toBe(35);
      expect(res.data?.candidates?.[0]?.content?.parts?.[0]?.text).toBe('Resposta simulada com sucesso.');
    });

    it('deve repassar status e mensagem de erro quando o Gemini falhar', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue({
          error: { message: 'Invalid API Key provided' },
        }),
      });

      const res = await callGeminiApi({
        body: { contents: [{ parts: [{ text: 'teste' }] }] },
        apiKey: 'invalid-key',
      });

      expect(res.success).toBe(false);
      expect(res.status).toBe(400);
      expect(res.error).toBe('Invalid API Key provided');
    });

    it('deve capturar falhas de rede e retornar status 502', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      const res = await callGeminiApi({
        body: { contents: [{ parts: [{ text: 'teste' }] }] },
        apiKey: 'some-key',
      });

      expect(res.success).toBe(false);
      expect(res.status).toBe(502);
      expect(res.error).toContain('Connection refused');
    });
  });
});
