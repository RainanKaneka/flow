import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  normalizeModelName,
  parseSpecificDateFromText,
  cleanTaskTitle,
  fetchAvailableGeminiModels,
  testGeminiApiKey,
  sendMessageToAssistant,
  decomposeTaskWithGemini,
  DEFAULT_MODEL,
  FALLBACK_MODELS,
  ChatContext,
} from '../geminiService';

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
});
