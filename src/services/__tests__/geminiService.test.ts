import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  normalizeModelName,
  parseSpecificDateFromText,
  cleanTaskTitle,
  fetchAvailableGeminiModels,
  testGeminiApiKey,
  sendMessageToAssistant,
  decomposeTaskWithGemini,
  getAiProxyEndpoint,
  getActiveFirebaseIdToken,
  callGeminiViaProxy,
  DEFAULT_MODEL,
  FALLBACK_MODELS,
  ChatContext,
} from '../geminiService';
import * as firebaseConfig from '../firebaseConfig';
import { useFlowStore } from '../../store/useFlowStore';

vi.mock('../firebaseConfig', () => ({
  getActiveFirebaseConfig: vi.fn(),
  getFirebaseAuthInstance: vi.fn(),
  isFirebaseConfigured: vi.fn(),
}));

describe('geminiService', () => {
  describe('normalizeModelName', () => {
    it('deve retornar DEFAULT_MODEL se não informado ou vazio', () => {
      expect(normalizeModelName()).toBe(DEFAULT_MODEL);
      expect(normalizeModelName('')).toBe(DEFAULT_MODEL);
    });

    it('deve mapear modelo descontinuado gemini-2.0-flash para gemini-2.5-flash', () => {
      expect(normalizeModelName('gemini-2.0-flash')).toBe('gemini-2.5-flash');
    });

    it('deve preservar nomes de modelos válidos', () => {
      expect(normalizeModelName('gemini-2.5-pro')).toBe('gemini-2.5-pro');
      expect(normalizeModelName('gemini-1.5-flash')).toBe('gemini-1.5-flash');
    });
  });

  describe('parseSpecificDateFromText', () => {
    const referenceDate = '2026-09-22'; // Terça-feira, 22/09/2026

    it('deve extrair data para "hoje"', () => {
      const res = parseSpecificDateFromText('preciso fazer compras hoje', referenceDate);
      expect(res.specificDate).toBe('2026-09-22');
      expect(res.formattedDate).toBe('22/09/2026');
    });

    it('deve extrair data para "amanhã" e "amanha"', () => {
      const res1 = parseSpecificDateFromText('reunião amanhã às 10h', referenceDate);
      expect(res1.specificDate).toBe('2026-09-23');
      expect(res1.formattedDate).toBe('23/09/2026');

      const res2 = parseSpecificDateFromText('entregar relatório amanha', referenceDate);
      expect(res2.specificDate).toBe('2026-09-23');
    });

    it('deve extrair data para "depois de amanhã"', () => {
      const res = parseSpecificDateFromText('trocar filtro depois de amanhã', referenceDate);
      expect(res.specificDate).toBe('2026-09-24');
      expect(res.formattedDate).toBe('24/09/2026');
    });

    it('deve extrair datas no formato DD/MM e DD/MM/AAAA', () => {
      const res1 = parseSpecificDateFromText(
        'limpar o ar condicionado portatil dia 25/09',
        referenceDate
      );
      expect(res1.specificDate).toBe('2026-09-25');
      expect(res1.formattedDate).toBe('25/09/2026');

      const res2 = parseSpecificDateFromText(
        'consulta médica para o dia 15/10/2026',
        referenceDate
      );
      expect(res2.specificDate).toBe('2026-10-15');
      expect(res2.formattedDate).toBe('15/10/2026');
    });

    it('deve extrair datas por extenso em português (ex: "dia 25 de setembro")', () => {
      const res = parseSpecificDateFromText('revisar código dia 25 de setembro', referenceDate);
      expect(res.specificDate).toBe('2026-09-25');
      expect(res.formattedDate).toBe('25/09/2026');
    });

    it('deve retornar objeto vazio quando nenhuma data for detectada', () => {
      const res = parseSpecificDateFromText('apenas uma tarefa normal sem prazo', referenceDate);
      expect(res.specificDate).toBeUndefined();
    });
  });

  describe('cleanTaskTitle', () => {
    it('deve remover comandos de criação de tarefas', () => {
      expect(cleanTaskTitle('criar uma tarefa de comprar pão')).toBe('comprar pão');
      expect(cleanTaskTitle('agendar atividade de estudar vitest')).toBe('estudar vitest');
      expect(cleanTaskTitle('nova tarefa limpar mesa')).toBe('limpar mesa');
    });

    it('deve remover referências de datas e horas do título', () => {
      expect(cleanTaskTitle('limpar o ar condicionado portatil dia 25/09')).toBe(
        'limpar o ar condicionado portatil'
      );
      expect(cleanTaskTitle('reunião com equipe amanhã às 14:00')).toBe('reunião com equipe');
      expect(cleanTaskTitle('fazer caminhada hoje')).toBe('fazer caminhada');
    });
  });

  describe('fetchAvailableGeminiModels & testGeminiApiKey', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      globalThis.fetch = vi.fn();
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('deve retornar FALLBACK_MODELS se nenhuma chave ou token for informado', async () => {
      const models = await fetchAvailableGeminiModels();
      expect(models).toEqual(FALLBACK_MODELS);
    });

    it('deve listar modelos filtrados por generateContent da API do Gemini', async () => {
      const mockApiResponse = {
        models: [
          {
            name: 'models/gemini-2.5-flash',
            displayName: 'Gemini 2.5 Flash',
            description: 'Rápido e inteligente',
            supportedGenerationMethods: ['generateContent'],
          },
          {
            name: 'models/text-embedding-004',
            displayName: 'Text Embedding',
            supportedGenerationMethods: ['embedContent'],
          },
        ],
      };

      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      const models = await fetchAvailableGeminiModels('AIzaSyD-valid-mock-api-key-12345');
      expect(models).toHaveLength(1);
      expect(models[0].id).toBe('gemini-2.5-flash');
      expect(models[0].displayName).toContain('Gemini 2.5 Flash');
    });

    it('deve retornar FALLBACK_MODELS em caso de erro na resposta da API', async () => {
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 403,
      });

      const models = await fetchAvailableGeminiModels('AIzaSyD-valid-mock-api-key-12345');
      expect(models).toEqual(FALLBACK_MODELS);
    });

    it('testGeminiApiKey deve validar resposta de sucesso do ping', async () => {
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'OK' }] } }],
        }),
      });

      const result = await testGeminiApiKey('AIzaSyD-valid-mock-api-key-12345');
      expect(result.valid).toBe(true);
      expect(result.recommendedModel).toBeDefined();
    });

    it('testGeminiApiKey deve retornar erro se chave não for informada', async () => {
      const result = await testGeminiApiKey('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('não informado');
    });
  });

  describe('sendMessageToAssistant', () => {
    const mockContext: ChatContext = {
      selectedDate: '2026-09-22',
      selectedRoutineTypeId: 'main',
      routineTypes: [
        {
          id: 'main',
          name: 'Rotina Principal',
          description: '',
          color: '#6366F1',
          icon: 'Calendar',
        },
      ],
      categories: [{ id: 'cat-1', name: 'Trabalho', color: '#3B82F6' }],
      tasks: [
        {
          id: 'task-1',
          routineTypeId: 'main',
          title: 'Planejar Sprint',
          startTime: '09:00',
          endTime: '10:00',
          targetMinutes: 60,
          daysOfWeek: [1, 2, 3, 4, 5],
          categoryId: 'cat-1',
        },
      ],
      logs: {},
      backlogCount: 0,
      totalPomodoroMinutes: 50,
    };

    it('deve gerar resposta heurística local elegante quando não houver chave de API', async () => {
      const response = await sendMessageToAssistant({
        prompt: 'Olá, como organizar meu dia?',
        history: [],
        context: mockContext,
      });

      expect(response).toBeDefined();
      expect(response.content.length).toBeGreaterThan(10);
    });

    it('deve identificar intenção de atraso e gerar proposta de replanejamento na resposta local', async () => {
      const response = await sendMessageToAssistant({
        prompt: 'Estou atrasado 30 minutos na minha rotina',
        history: [],
        context: mockContext,
      });

      expect(response.actionProposal).toBeDefined();
      expect(response.actionProposal?.type).toBe('replan_schedule');
      expect((response.actionProposal?.payload as any).delayMinutes).toBe(30);
    });

    it('deve identificar intenção de criação de tarefa com data específica na resposta local', async () => {
      const response = await sendMessageToAssistant({
        prompt: 'Criar uma tarefa de limpar o ar condicionado portatil dia 25/09',
        history: [],
        context: mockContext,
      });

      expect(response.actionProposal).toBeDefined();
      expect(response.actionProposal?.type).toBe('create_task');
      expect(response.actionProposal?.payload.specificDate).toBe('2026-09-25');
      expect(response.actionProposal?.payload.title).toContain('limpar o ar condicionado');
    });

    it('deve processar resposta da API do Gemini e extrair actionProposal com flow-action', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: `Aqui está sua tarefa agendada:
\`\`\`flow-action
{
  "type": "create_task",
  "title": "Configurar Vitest no Flow",
  "startTime": "14:00",
  "endTime": "15:30",
  "targetMinutes": 90,
  "specificDate": "2026-09-25"
}
\`\`\`
Boa execução!`,
                  },
                ],
              },
            },
          ],
        }),
      });

      const response = await sendMessageToAssistant({
        prompt: 'Agende uma tarefa de configurar testes',
        history: [],
        context: mockContext,
        apiKey: 'valid-api-key-12345678',
      });

      expect(response.content).toContain('Aqui está sua tarefa agendada:');
      expect(response.content).not.toContain('```flow-action');
      expect(response.actionProposal).toBeDefined();
      expect(response.actionProposal?.type).toBe('create_task');
      expect(response.actionProposal?.payload.title).toBe('Configurar Vitest no Flow');
      expect(response.actionProposal?.payload.specificDate).toBe('2026-09-25');

      globalThis.fetch = originalFetch;
    });
  });

  describe('decomposeTaskWithGemini', () => {
    it('deve decompor tarefas de estudo usando fallback heurístico', async () => {
      const subtasks = await decomposeTaskWithGemini({
        task: {
          id: 't-1',
          routineTypeId: 'main',
          title: 'Estudar TypeScript Avançado',
          targetMinutes: 60,
          daysOfWeek: [1, 2],
          categoryId: 'study',
          startTime: '10:00',
          endTime: '11:00',
        },
      });

      expect(subtasks.length).toBeGreaterThanOrEqual(3);
      expect(
        subtasks.some((s) => s.includes('livre de distrações') || s.includes('material'))
      ).toBe(true);
    });

    it('deve decompor tarefas de programação e desenvolvimento', async () => {
      const subtasks = await decomposeTaskWithGemini({
        task: {
          id: 't-2',
          routineTypeId: 'main',
          title: 'Dev da tela de métricas',
          targetMinutes: 120,
          daysOfWeek: [1, 2],
          categoryId: 'dev',
          startTime: '14:00',
          endTime: '16:00',
        },
      });

      expect(subtasks.length).toBeGreaterThanOrEqual(3);
      expect(subtasks.some((s) => s.includes('TypeScript') || s.includes('lógica'))).toBe(true);
    });

    it('deve utilizar a API do Gemini quando chave estiver presente', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: '- Passo 1: Revisar requisitos\n- Passo 2: Executar testes\n- Passo 3: Criar documentação',
                  },
                ],
              },
            },
          ],
        }),
      });

      const subtasks = await decomposeTaskWithGemini({
        task: {
          id: 't-3',
          routineTypeId: 'main',
          title: 'Lançar v0.2.0',
          targetMinutes: 90,
          daysOfWeek: [1],
          categoryId: 'work',
          startTime: '09:00',
          endTime: '10:30',
        },
        apiKey: 'valid-api-key-12345678',
      });

      expect(subtasks).toHaveLength(3);
      expect(subtasks[0]).toBe('Passo 1: Revisar requisitos');

      globalThis.fetch = originalFetch;
    });
  });

  describe('getAiProxyEndpoint', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
      (firebaseConfig.getActiveFirebaseConfig as any).mockReturnValue({
        apiKey: 'test-key',
        authDomain: 'test-proj.firebaseapp.com',
        projectId: 'flow-test-proj',
      });
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('deve respeitar variável NEXT_PUBLIC_AI_PROXY_URL customizada', () => {
      process.env.NEXT_PUBLIC_AI_PROXY_URL = 'https://custom-gateway.internal/aiProxy';
      expect(getAiProxyEndpoint()).toBe('https://custom-gateway.internal/aiProxy');
    });

    it('deve gerar endpoint padrão de produção no Cloud Functions baseado no projectId', () => {
      delete process.env.NEXT_PUBLIC_AI_PROXY_URL;
      delete process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR;
      expect(getAiProxyEndpoint()).toBe(
        'https://southamerica-east1-flow-test-proj.cloudfunctions.net/aiProxy'
      );
    });

    it('deve gerar endpoint local do emulador quando NEXT_PUBLIC_USE_FIREBASE_EMULATOR for true', () => {
      delete process.env.NEXT_PUBLIC_AI_PROXY_URL;
      process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR = 'true';
      expect(getAiProxyEndpoint()).toBe(
        'http://127.0.0.1:5001/flow-test-proj/southamerica-east1/aiProxy'
      );
    });
  });

  describe('getActiveFirebaseIdToken', () => {
    it('deve retornar o token quando usuário estiver autenticado no Firebase Auth', async () => {
      const mockGetIdToken = vi.fn().mockResolvedValue('jwt-mock-token-123');
      (firebaseConfig.getFirebaseAuthInstance as any).mockReturnValue({
        currentUser: { uid: 'user-1', getIdToken: mockGetIdToken },
      });

      const token = await getActiveFirebaseIdToken();
      expect(token).toBe('jwt-mock-token-123');
      expect(mockGetIdToken).toHaveBeenCalledTimes(1);
    });

    it('deve retornar null se não houver currentUser ou instância auth', async () => {
      (firebaseConfig.getFirebaseAuthInstance as any).mockReturnValue(null);
      expect(await getActiveFirebaseIdToken()).toBeNull();

      (firebaseConfig.getFirebaseAuthInstance as any).mockReturnValue({ currentUser: null });
      expect(await getActiveFirebaseIdToken()).toBeNull();
    });
  });

  describe('callGeminiViaProxy', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      globalThis.fetch = vi.fn();
      (firebaseConfig.getActiveFirebaseConfig as any).mockReturnValue({
        projectId: 'flow-test-proj',
      });
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('deve chamar o endpoint do proxy com Bearer token e headers corretos', async () => {
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({
          'x-ai-quota-used': '5',
          'x-ai-quota-limit': '1000',
          'x-ai-tokens-consumed': '42',
        }),
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Resposta proxy sucesso' }] } }],
        }),
      });

      const result = await callGeminiViaProxy({
        contents: [{ parts: [{ text: 'Olá Flow' }] }],
        model: 'gemini-2.5-flash',
        idToken: 'token-jwt-secret',
        isDevPremium: true,
      });

      expect(result.ok).toBe(true);
      expect(result.candidateText).toBe('Resposta proxy sucesso');
      expect(result.quota).toEqual({ used: 5, monthlyLimit: 1000, totalTokensConsumed: 42 });

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://southamerica-east1-flow-test-proj.cloudfunctions.net/aiProxy',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer token-jwt-secret',
            'x-dev-premium': 'true',
          }),
        })
      );
    });

    it('deve sincronizar a quota no Zustand store a partir dos headers de resposta', async () => {
      useFlowStore.setState({
        userProfile: {
          name: 'Rainan',
          objective: 'focus',
          plan: 'premium',
          aiQuota: {
            monthlyLimit: 1000,
            used: 10,
            resetDate: '2026-10-01',
            totalTokensConsumed: 500,
          },
        },
      });

      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({
          'x-ai-quota-used': '11',
          'x-ai-quota-limit': '1000',
          'x-ai-tokens-consumed': '60',
        }),
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'OK' }] } }],
        }),
      });

      await callGeminiViaProxy({
        contents: [{ parts: [{ text: 'Teste quota' }] }],
        idToken: 'token-test',
      });

      const updatedProfile = useFlowStore.getState().userProfile;
      expect(updatedProfile?.aiQuota?.used).toBe(11);
      expect(updatedProfile?.aiQuota?.totalTokensConsumed).toBe(560);
    });

    it('deve identificar erro 429 como quotaExceeded', async () => {
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({
          'x-ai-quota-used': '1000',
          'x-ai-quota-limit': '1000',
        }),
        json: async () => ({ error: 'Quota mensal esgotada' }),
      });

      const res = await callGeminiViaProxy({
        contents: [{ parts: [{ text: 'Mais uma mensagem' }] }],
        idToken: 'token-test',
      });

      expect(res.ok).toBe(false);
      expect(res.status).toBe(429);
      expect(res.quotaExceeded).toBe(true);
    });

    it('deve tratar erro 403 de usuário não premium', async () => {
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 403,
        headers: new Headers(),
        json: async () => ({ error: 'Recurso exclusivo Premium' }),
      });

      const res = await callGeminiViaProxy({
        contents: [{ parts: [{ text: 'Mensagem' }] }],
        idToken: 'token-test',
      });

      expect(res.ok).toBe(false);
      expect(res.status).toBe(403);
      expect(res.error).toBe('Recurso exclusivo Premium');
    });

    it('deve capturar falhas de rede com elegância sem quebrar a execução', async () => {
      (globalThis.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const res = await callGeminiViaProxy({
        contents: [{ parts: [{ text: 'Mensagem' }] }],
        idToken: 'token-test',
      });

      expect(res.ok).toBe(false);
      expect(res.status).toBe(0);
      expect(res.error).toBe('Network error');
    });
  });

  describe('sendMessageToAssistant - Roteamento Premium via aiProxy & Fallbacks', () => {
    const originalFetch = globalThis.fetch;

    const mockCtx: ChatContext = {
      selectedDate: '2026-09-22',
      selectedRoutineTypeId: 'main',
      routineTypes: [{ id: 'main', name: 'Principal', description: '', color: '#000', icon: 'zap' }],
      categories: [{ id: 'c1', name: 'Work', color: '#111' }],
      tasks: [],
      logs: {},
      backlogCount: 0,
      totalPomodoroMinutes: 25,
    };

    beforeEach(() => {
      globalThis.fetch = vi.fn();
      (firebaseConfig.getActiveFirebaseConfig as any).mockReturnValue({
        projectId: 'flow-test-proj',
      });
      (firebaseConfig.getFirebaseAuthInstance as any).mockReturnValue({
        currentUser: {
          uid: 'user-premium-1',
          getIdToken: vi.fn().mockResolvedValue('firebase-valid-id-token'),
        },
      });
      useFlowStore.setState({
        userProfile: {
          name: 'Usuário Premium',
          objective: 'focus',
          plan: 'premium',
          aiQuota: {
            monthlyLimit: 1000,
            used: 50,
            resetDate: '2026-10-01',
            totalTokensConsumed: 1200,
          },
        },
      });
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('deve rotear através do aiProxy quando plano for Premium e houver token do Firebase', async () => {
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({
          'x-ai-quota-used': '51',
          'x-ai-quota-limit': '1000',
          'x-ai-tokens-consumed': '30',
        }),
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: 'Resposta direta do Flow Proxy para assinante Premium!' }],
              },
            },
          ],
        }),
      });

      const res = await sendMessageToAssistant({
        prompt: 'Qual minha próxima tarefa?',
        history: [],
        context: mockCtx,
      });

      expect(res.content).toBe('Resposta direta do Flow Proxy para assinante Premium!');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://southamerica-east1-flow-test-proj.cloudfunctions.net/aiProxy',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer firebase-valid-id-token',
          }),
        })
      );
    });

    it('deve retornar mensagem clara de quota esgotada quando proxy retornar 429 e não houver chave pessoal', async () => {
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({
          'x-ai-quota-used': '1000',
          'x-ai-quota-limit': '1000',
        }),
        json: async () => ({ error: 'Quota mensal esgotada' }),
      });

      const res = await sendMessageToAssistant({
        prompt: 'Replanejar minha rotina',
        history: [],
        context: mockCtx,
      });

      expect(res.content).toContain('Limite Mensal de IA Atingido');
      expect(res.content).toContain('2026-10-01');
      expect(res.content).toContain('Chave de API Google Gemini pessoal');
    });

    it('deve fazer fallback transparente para chave pessoal do usuário se quota Premium estiver esgotada mas apiKey for informada', async () => {
      // 1ª chamada: aiProxy retorna 429
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({
          'x-ai-quota-used': '1000',
          'x-ai-quota-limit': '1000',
        }),
        json: async () => ({ error: 'Quota mensal esgotada' }),
      });

      // 2ª chamada: fallback direto para a API do Gemini com a chave pessoal
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: 'Resposta processada via chave pessoal de fallback!' }],
              },
            },
          ],
        }),
      });

      const res = await sendMessageToAssistant({
        prompt: 'Como priorizar hoje?',
        history: [],
        context: mockCtx,
        apiKey: 'minha-chave-pessoal-12345678',
      });

      expect(res.content).toBe('Resposta processada via chave pessoal de fallback!');
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });

    it('deve fazer fallback para resposta heurística local caso o proxy falhe e não haja chave pessoal', async () => {
      (globalThis.fetch as any).mockRejectedValueOnce(new Error('Proxy timeout'));

      const res = await sendMessageToAssistant({
        prompt: 'Estou atrasado 30 minutos',
        history: [],
        context: mockCtx,
      });

      expect(res.actionProposal).toBeDefined();
      expect(res.actionProposal?.type).toBe('replan_schedule');
    });
  });

  describe('decomposeTaskWithGemini - Roteamento Premium via aiProxy & Fallbacks', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      globalThis.fetch = vi.fn();
      (firebaseConfig.getActiveFirebaseConfig as any).mockReturnValue({
        projectId: 'flow-test-proj',
      });
      (firebaseConfig.getFirebaseAuthInstance as any).mockReturnValue({
        currentUser: {
          uid: 'user-premium-1',
          getIdToken: vi.fn().mockResolvedValue('firebase-valid-id-token'),
        },
      });
      useFlowStore.setState({
        userProfile: {
          name: 'Usuário Premium',
          objective: 'focus',
          plan: 'premium',
        },
      });
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('deve decompor tarefas via aiProxy quando usuário for Premium', async () => {
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: '- Subtarefa 1 via proxy\n- Subtarefa 2 via proxy\n- Subtarefa 3 via proxy',
                  },
                ],
              },
            },
          ],
        }),
      });

      const items = await decomposeTaskWithGemini({
        task: {
          id: 't-premium',
          routineTypeId: 'main',
          title: 'Organizar lançamento',
          targetMinutes: 60,
          daysOfWeek: [1],
          categoryId: 'c1',
          startTime: '10:00',
          endTime: '11:00',
        },
      });

      expect(items).toHaveLength(3);
      expect(items[0]).toBe('Subtarefa 1 via proxy');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://southamerica-east1-flow-test-proj.cloudfunctions.net/aiProxy',
        expect.anything()
      );
    });

    it('deve usar fallback heurístico se chamada ao proxy falhar', async () => {
      (globalThis.fetch as any).mockRejectedValueOnce(new Error('Erro proxy'));

      const items = await decomposeTaskWithGemini({
        task: {
          id: 't-study',
          routineTypeId: 'main',
          title: 'Estudar Arquitetura Cloud',
          targetMinutes: 60,
          daysOfWeek: [1],
          categoryId: 'c1',
          startTime: '10:00',
          endTime: '11:00',
        },
      });

      expect(items.length).toBeGreaterThanOrEqual(3);
      expect(items.some((i) => i.includes('distrações') || i.includes('material'))).toBe(true);
    });
  });
});
