import { Task, Category, RoutineType, AiActionProposal, TaskLog } from '../types/routine';
import { calculateReplanSchedule, timeToMinutes, minutesToTime } from '../utils/routineReplan';
import { useFlowStore } from '../store/useFlowStore';
import { getFirebaseAuthInstance, getActiveFirebaseConfig } from './firebaseConfig';
import { calculateNextResetDate } from './userProfileService';

export interface ChatContext {
  tasks: Task[];
  categories: Category[];
  routineTypes: RoutineType[];
  selectedRoutineTypeId: string;
  selectedDate: string;
  logs: Record<string, TaskLog>;
  backlogCount: number;
  totalPomodoroMinutes: number;
}

export interface ChatResponse {
  content: string;
  actionProposal?: AiActionProposal;
}

export const DEFAULT_MODEL = 'gemini-2.5-flash';

export interface GeminiModelOption {
  id: string;
  displayName: string;
  description?: string;
}

export const FALLBACK_MODELS: GeminiModelOption[] = [
  {
    id: 'gemini-2.5-flash',
    displayName: 'Gemini 2.5 Flash (Recomendado: Nova Geração Ultra-Rápida)',
  },
  {
    id: 'gemini-1.5-flash',
    displayName: 'Gemini 1.5 Flash (Estável & Gratuito)',
  },
  {
    id: 'gemini-2.5-pro',
    displayName: 'Gemini 2.5 Pro (Raciocínio Analítico Avançado)',
  },
  {
    id: 'gemini-1.5-pro',
    displayName: 'Gemini 1.5 Pro (Alta Capacidade)',
  },
];

/**
 * Normaliza nomes de modelos substituindo versões descontinuadas (ex: 2.0-flash -> 2.5-flash)
 */
export const normalizeModelName = (modelName?: string): string => {
  if (!modelName || modelName === 'gemini-2.0-flash') {
    return 'gemini-2.5-flash';
  }
  return modelName;
};

/**
 * Utilitário robusto para identificar e extrair data específica a partir de texto em linguagem natural
 */
export const parseSpecificDateFromText = (
  text: string,
  referenceDateStr: string = new Date().toISOString().split('T')[0]
): { specificDate?: string; formattedDate?: string } => {
  if (!text) return {};
  const [refYear, refMonth, refDay] = referenceDateStr.split('-').map(Number);
  const now = new Date(refYear, refMonth - 1, refDay);

  const lower = text.toLowerCase();

  // Caso: "depois de amanhã"
  if (lower.includes('depois de amanhã') || lower.includes('depois de amanha')) {
    const afterTomorrow = new Date(now);
    afterTomorrow.setDate(afterTomorrow.getDate() + 2);
    const y = afterTomorrow.getFullYear();
    const m = String(afterTomorrow.getMonth() + 1).padStart(2, '0');
    const d = String(afterTomorrow.getDate()).padStart(2, '0');
    return {
      specificDate: `${y}-${m}-${d}`,
      formattedDate: `${d}/${m}/${y}`,
    };
  }

  // Caso: "amanhã"
  if (lower.includes('amanhã') || lower.includes('amanha')) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const y = tomorrow.getFullYear();
    const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const d = String(tomorrow.getDate()).padStart(2, '0');
    return {
      specificDate: `${y}-${m}-${d}`,
      formattedDate: `${d}/${m}/${y}`,
    };
  }

  // Caso: "hoje"
  if (lower.includes('hoje')) {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return {
      specificDate: `${y}-${m}-${d}`,
      formattedDate: `${d}/${m}/${y}`,
    };
  }

  // Caso: DD/MM ou DD/MM/YYYY ou DD-MM ou DD-MM-YYYY
  const slashMatch = text.match(
    /(?:(?:dia|para o dia|para dia|no dia)\s*)?(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/i
  );
  if (slashMatch) {
    const day = parseInt(slashMatch[1], 10);
    const month = parseInt(slashMatch[2], 10);
    let year = slashMatch[3] ? parseInt(slashMatch[3], 10) : refYear;
    if (year < 100) year += 2000;

    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const dStr = String(day).padStart(2, '0');
      const mStr = String(month).padStart(2, '0');
      return {
        specificDate: `${year}-${mStr}-${dStr}`,
        formattedDate: `${dStr}/${mStr}/${year}`,
      };
    }
  }

  // Caso: "dia 25 de setembro"
  const monthMap: Record<string, number> = {
    janeiro: 1,
    fevereiro: 2,
    março: 3,
    marco: 3,
    abril: 4,
    maio: 5,
    junho: 6,
    julho: 7,
    agosto: 8,
    setembro: 9,
    outubro: 10,
    novembro: 11,
    dezembro: 12,
  };
  const monthRegex = new RegExp(
    `(?:dia\\s*)?(\\d{1,2})\\s*(?:de\\s*)?(${Object.keys(monthMap).join('|')})(?:\\s*(?:de\\s*)?(\\d{2,4}))?`,
    'i'
  );
  const textMonthMatch = text.match(monthRegex);
  if (textMonthMatch) {
    const day = parseInt(textMonthMatch[1], 10);
    const mName = textMonthMatch[2].toLowerCase();
    const month = monthMap[mName];
    let year = textMonthMatch[3] ? parseInt(textMonthMatch[3], 10) : refYear;
    if (year < 100) year += 2000;

    if (day >= 1 && day <= 31 && month) {
      const dStr = String(day).padStart(2, '0');
      const mStr = String(month).padStart(2, '0');
      return {
        specificDate: `${year}-${mStr}-${dStr}`,
        formattedDate: `${dStr}/${mStr}/${year}`,
      };
    }
  }

  return {};
};

/**
 * Remove menções de datas e comandos do título da tarefa
 */
export const cleanTaskTitle = (rawTitle: string): string => {
  return rawTitle
    .replace(
      /^(criar|adicione|adicionar|agendar|nova tarefa)\s*(uma\s*)?(tarefa|atividade)?\s*(de\s*)?/i,
      ''
    )
    .replace(/(?:para o dia|para dia|no dia|dia)\s*\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?/i, '')
    .replace(/(?:para|às|as)\s*\d{1,2}:\d{2}.*$/i, '')
    .replace(/(?:amanhã|amanha|hoje|depois de amanhã)/i, '')
    .replace(/^de\s+/i, '')
    .trim();
};

/**
 * Busca a lista dinâmica de modelos disponíveis na chave de API ou Token do Google
 */
export const fetchAvailableGeminiModels = async (
  apiKey?: string,
  accessToken?: string
): Promise<GeminiModelOption[]> => {
  const hasKey = apiKey && apiKey.trim().length > 10;
  const hasToken = accessToken && accessToken.trim().length > 10;

  if (!hasKey && !hasToken) return FALLBACK_MODELS;

  try {
    const url = hasKey
      ? `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey!.trim()}`
      : `https://generativelanguage.googleapis.com/v1beta/models`;

    const headers: Record<string, string> = {};
    if (hasToken) {
      headers['Authorization'] = `Bearer ${accessToken!.trim()}`;
    }

    const res = await fetch(url, { headers });
    if (!res.ok) return FALLBACK_MODELS;

    const data = await res.json();
    if (!data.models || !Array.isArray(data.models)) return FALLBACK_MODELS;

    const filtered = data.models
      .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
      .map((m: any) => {
        const id = m.name.replace(/^models\//, '');
        return {
          id,
          displayName: m.displayName ? `${m.displayName} (${id})` : id,
          description: m.description,
        };
      })
      .filter(
        (m: any) =>
          !m.id.includes('embedding') && !m.id.includes('aqa') && m.id !== 'gemini-2.0-flash'
      );

    return filtered.length > 0 ? filtered : FALLBACK_MODELS;
  } catch {
    return FALLBACK_MODELS;
  }
};

/**
 * Valida se uma chave de API ou token OAuth do Gemini é válida fazendo um ping simples com auto-fallback
 */
export const testGeminiApiKey = async (
  apiKey?: string,
  model: string = DEFAULT_MODEL,
  accessToken?: string
): Promise<{
  valid: boolean;
  recommendedModel?: string;
  error?: string;
  availableModels?: GeminiModelOption[];
}> => {
  const hasKey = apiKey && apiKey.trim().length > 10;
  const hasToken = accessToken && accessToken.trim().length > 10;

  if (!hasKey && !hasToken) {
    return { valid: false, error: 'Chave de API ou Token de acesso Google não informado.' };
  }

  const sanitizedModel = normalizeModelName(model);

  try {
    const endpoint = hasKey
      ? `https://generativelanguage.googleapis.com/v1beta/models/${sanitizedModel}:generateContent?key=${apiKey!.trim()}`
      : `https://generativelanguage.googleapis.com/v1beta/models/${sanitizedModel}:generateContent`;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (hasToken) {
      headers['Authorization'] = `Bearer ${accessToken!.trim()}`;
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: 'Ping de teste de conexão. Responda apenas "OK".' }],
          },
        ],
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const message = errData?.error?.message || `Erro HTTP ${res.status}`;

      // Se o erro for de modelo indisponível (ex: gemini-2.0-flash), tenta fallback
      if (
        message.includes('no longer available') ||
        message.includes('not found') ||
        message.includes('deprecated')
      ) {
        const fallback =
          sanitizedModel === 'gemini-2.5-flash' ? 'gemini-1.5-flash' : 'gemini-2.5-flash';
        const retryEndpoint = hasKey
          ? `https://generativelanguage.googleapis.com/v1beta/models/${fallback}:generateContent?key=${apiKey!.trim()}`
          : `https://generativelanguage.googleapis.com/v1beta/models/${fallback}:generateContent`;

        const retryRes = await fetch(retryEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Ping de teste. Responda "OK".' }] }],
          }),
        });

        if (retryRes.ok) {
          const models = await fetchAvailableGeminiModels(apiKey, accessToken);
          return {
            valid: true,
            recommendedModel: fallback,
            availableModels: models,
          };
        }
      }

      const models = await fetchAvailableGeminiModels(apiKey, accessToken);
      return { valid: false, error: message, availableModels: models };
    }

    const models = await fetchAvailableGeminiModels(apiKey, accessToken);
    return { valid: true, recommendedModel: sanitizedModel, availableModels: models };
  } catch (err: any) {
    return { valid: false, error: err.message || 'Falha de conexão com a API do Google.' };
  }
};

export interface GeminiProxyCallOptions {
  contents: Array<{
    role?: string;
    parts: Array<{ text: string } | Record<string, any>>;
  }>;
  model?: string;
  idToken: string;
  systemInstruction?: any;
  generationConfig?: any;
  isDevPremium?: boolean;
}

export interface GeminiProxyCallResult {
  ok: boolean;
  status: number;
  data?: any;
  candidateText?: string;
  error?: string;
  quotaExceeded?: boolean;
  quota?: {
    used: number;
    monthlyLimit: number;
    totalTokensConsumed?: number;
  };
}

/**
 * Retorna o endpoint da Cloud Function aiProxy
 * Prioridade:
 * 1. NEXT_PUBLIC_AI_PROXY_URL (variável de ambiente explícita)
 * 2. Emulador local se NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true' ou localhost em dev
 * 3. URL padrão de produção no Google Cloud Functions (southamerica-east1)
 */
export const getAiProxyEndpoint = (): string => {
  if (process.env.NEXT_PUBLIC_AI_PROXY_URL) {
    return process.env.NEXT_PUBLIC_AI_PROXY_URL;
  }

  const config = getActiveFirebaseConfig();
  const projectId =
    config?.projectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'flow-app-dev';

  const isBrowser = typeof window !== 'undefined';
  const isLocalhost =
    isBrowser &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const isDev = process.env.NODE_ENV === 'development';

  if ((isLocalhost || isDev) && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
    return `http://127.0.0.1:5001/${projectId}/southamerica-east1/aiProxy`;
  }

  return `https://southamerica-east1-${projectId}.cloudfunctions.net/aiProxy`;
};

/**
 * Recupera o ID Token JWT do usuário atualmente autenticado no Firebase Auth
 */
export const getActiveFirebaseIdToken = async (): Promise<string | null> => {
  try {
    const auth = getFirebaseAuthInstance();
    const currentUser = auth?.currentUser;
    if (currentUser) {
      return await currentUser.getIdToken();
    }
  } catch (error) {
    console.warn('[geminiService] Falha ao obter Firebase ID Token:', error);
  }
  return null;
};

/**
 * Executa a chamada ao Gemini via Cloud Function aiProxy (recurso oficial para planos Premium)
 */
export const callGeminiViaProxy = async ({
  contents,
  model = DEFAULT_MODEL,
  idToken,
  systemInstruction,
  generationConfig,
  isDevPremium,
}: GeminiProxyCallOptions): Promise<GeminiProxyCallResult> => {
  const endpoint = getAiProxyEndpoint();
  const sanitizedModel = normalizeModelName(model);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${idToken.trim()}`,
  };

  if (isDevPremium) {
    headers['x-dev-premium'] = 'true';
  }

  const payload: Record<string, any> = {
    model: sanitizedModel,
    contents,
  };

  if (systemInstruction) {
    payload.systemInstruction = systemInstruction;
  }
  if (generationConfig) {
    payload.generationConfig = generationConfig;
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    // Lê os headers de quota retornados pelo backend
    const quotaUsedHeader =
      res.headers.get('x-ai-quota-used') || res.headers.get('X-Ai-Quota-Used');
    const quotaLimitHeader =
      res.headers.get('x-ai-quota-limit') || res.headers.get('X-Ai-Quota-Limit');
    const tokensConsumedHeader =
      res.headers.get('x-ai-tokens-consumed') || res.headers.get('X-Ai-Tokens-Consumed');

    let updatedQuota:
      | { used: number; monthlyLimit: number; totalTokensConsumed?: number }
      | undefined;

    if (quotaUsedHeader !== null && quotaLimitHeader !== null) {
      const used = parseInt(quotaUsedHeader, 10);
      const monthlyLimit = parseInt(quotaLimitHeader, 10);
      const tokensConsumed = parseInt(tokensConsumedHeader || '0', 10);

      updatedQuota = { used, monthlyLimit, totalTokensConsumed: tokensConsumed };

      // Sincroniza em tempo real no Zustand store
      try {
        const currentProfile = useFlowStore.getState().userProfile;
        if (currentProfile) {
          useFlowStore.getState().updateUserProfile({
            aiQuota: {
              monthlyLimit: monthlyLimit || currentProfile.aiQuota?.monthlyLimit || 1000,
              used: Number.isNaN(used) ? (currentProfile.aiQuota?.used ?? 0) : used,
              resetDate: currentProfile.aiQuota?.resetDate || calculateNextResetDate(),
              totalTokensConsumed:
                (currentProfile.aiQuota?.totalTokensConsumed || 0) +
                (Number.isNaN(tokensConsumed) ? 0 : tokensConsumed),
            },
          });
        }
      } catch (storeErr) {
        console.warn('[geminiService] Falha ao sincronizar quota no store:', storeErr);
      }
    }

    if (res.status === 429) {
      return {
        ok: false,
        status: 429,
        quotaExceeded: true,
        error: 'Quota mensal de IA esgotada.',
        quota: updatedQuota,
      };
    }

    if (res.status === 403) {
      const data = await res.json().catch(() => ({}));
      return {
        ok: false,
        status: 403,
        error: data.error || 'Recurso exclusivo do plano Premium.',
        quota: updatedQuota,
      };
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return {
        ok: false,
        status: res.status,
        error: errData.error || `Erro HTTP ${res.status} no proxy de IA.`,
        quota: updatedQuota,
      };
    }

    const data = await res.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
      ok: true,
      status: 200,
      data,
      candidateText,
      quota: updatedQuota,
    };
  } catch (err: any) {
    console.error('[geminiService] Falha de conexão com Cloud Function aiProxy:', err);
    return {
      ok: false,
      status: 0,
      error: err?.message || 'Falha de conexão com o proxy de IA.',
    };
  }
};

/**
 * Constrói o System Prompt com o contexto atual da rotina do usuário e instruções estritas de agendamento por data
 */
const buildSystemInstruction = (ctx: ChatContext): string => {
  const currentTasksStr = ctx.tasks
    .map(
      (t) =>
        `- [${t.startTime} - ${t.endTime}] ${t.title} (${t.specificDate ? `Data: ${t.specificDate}` : 'Recorrente'})`
    )
    .join('\n');

  const categoriesStr = ctx.categories.map((c) => `${c.name} (id: ${c.id})`).join(', ');
  const routinesStr = ctx.routineTypes.map((r) => `${r.name} (id: ${r.id})`).join(', ');
  const currentYear = ctx.selectedDate.split('-')[0] || new Date().getFullYear().toString();

  return `Você é o Flow AI, o assistente inteligente de alta performance do aplicativo Flow (Gestão de Rotina).
Seu tom é motivador, conciso, elegante e focado em produtividade real (estilo Notion/Linear).

Contexto Atual do Usuário:
- Data selecionada de referência: ${ctx.selectedDate} (Ano: ${currentYear})
- Tipo de rotina ativa: ${ctx.selectedRoutineTypeId} (Disponíveis: ${routinesStr})
- Categorias disponíveis: ${categoriesStr}
- Tarefas agendadas para hoje:
${currentTasksStr || '(Nenhuma tarefa agendada para hoje)'}
- Itens no Backlog de Pendências: ${ctx.backlogCount}
- Foco em Pomodoro hoje: ${ctx.totalPomodoroMinutes} minutos

Capacidades Especiais:
1. Replanejar Atrasos (RF-16): Quando o usuário disser que atrasou (ex: "atrasei 30 min", "perdi 45 min"), calcule o novo horário das tarefas restantes e proponha a reorganização.
2. Criar Tarefas (RF-15): Quando o usuário pedir para criar ou adicionar uma atividade.
   IMPORTANTE PARA AGENDAMENTO EM DATAS ESPECÍFICAS:
   - Se o usuário pedir para agendar para um dia específico (ex: "para o dia 25/09", "amanhã", "dia 28/09", "25 de setembro"):
     Você DEVE incluir o campo "specificDate": "YYYY-MM-DD" com a data correta no bloco flow-action.
     Exemplo para 25/09: "specificDate": "${currentYear}-09-25".
   - Se o usuário NÃO citar nenhuma data futura e pedir apenas uma tarefa/hábito, não inclua specificDate.
3. Decompor Subtarefas (RF-17): Sugerir checklists práticos para atividades complexas.
4. Diagnósticos de Produtividade (RF-18): Avaliar desempenho e apontar melhorias.

Se a sua resposta envolver uma AÇÃO que o usuário possa aplicar com 1 clique (como criar tarefa ou replanejar horários), inclua EXATAMENTE um bloco de código json com a tag especial \`\`\`flow-action no final da sua mensagem.

Formatos válidos para \`\`\`flow-action:
Para criar tarefa (caso específico para dia determinado):
\`\`\`flow-action
{
  "type": "create_task",
  "title": "Nome da Tarefa",
  "startTime": "09:00",
  "endTime": "10:00",
  "targetMinutes": 60,
  "specificDate": "${currentYear}-09-25",
  "categoryId": "${ctx.categories[0]?.id || ''}",
  "routineTypeId": "${ctx.selectedRoutineTypeId}"
}
\`\`\`

Para replanejar atraso do dia:
\`\`\`flow-action
{
  "type": "replan_schedule",
  "delayMinutes": 30,
  "referenceTime": "HH:mm"
}
\`\`\`

Responda sempre em Português do Brasil com formatação Markdown limpa e agradável.`;
};

/**
 * Extrai proposta de ação de bloco ```flow-action garantindo resolução precisa de data específica
 */
const extractActionProposal = (
  text: string,
  ctx: ChatContext,
  userPrompt?: string
): { cleanedText: string; proposal?: AiActionProposal } => {
  const match = text.match(/```flow-action\s*([\s\S]*?)\s*```/);
  if (!match) {
    return { cleanedText: text };
  }

  const rawJson = match[1];
  const cleanedText = text.replace(/```flow-action\s*[\s\S]*?\s*```/, '').trim();

  try {
    const data = JSON.parse(rawJson);
    if (data.type === 'create_task') {
      // Verifica se há data específica informada no JSON ou no prompt do usuário
      const parsedFromPrompt = parseSpecificDateFromText(userPrompt || '', ctx.selectedDate);
      const parsedFromTitle = parseSpecificDateFromText(data.title || '', ctx.selectedDate);
      const parsedFromText = parseSpecificDateFromText(text, ctx.selectedDate);

      const specificDate =
        data.specificDate ||
        parsedFromPrompt.specificDate ||
        parsedFromTitle.specificDate ||
        parsedFromText.specificDate;
      const formattedDate =
        parsedFromPrompt.formattedDate ||
        parsedFromTitle.formattedDate ||
        parsedFromText.formattedDate ||
        (specificDate ? specificDate.split('-').reverse().join('/') : undefined);

      let title = cleanTaskTitle(data.title || 'Nova Tarefa');
      if (!title) title = 'Nova Atividade';

      const startTime = data.startTime || '09:00';
      const endTime = data.endTime || '10:00';
      const targetMinutes = data.targetMinutes || 60;

      const summary =
        specificDate && formattedDate
          ? `Agendar "${title}" para ${formattedDate} das ${startTime} às ${endTime} (${targetMinutes} min).`
          : `Agendar "${title}" das ${startTime} às ${endTime} (${targetMinutes} min).`;

      return {
        cleanedText,
        proposal: {
          id: `prop_${Date.now()}`,
          type: 'create_task',
          title: `Criar Tarefa: ${title}`,
          summary,
          payload: {
            title,
            description: data.description || 'Criado via Flow AI',
            startTime,
            endTime,
            targetMinutes,
            categoryId: data.categoryId || ctx.categories[0]?.id || '',
            routineTypeId: data.routineTypeId || ctx.selectedRoutineTypeId,
            specificDate: specificDate || undefined,
            daysOfWeek: specificDate ? [] : data.daysOfWeek || [0, 1, 2, 3, 4, 5, 6],
            tags: ['ia-flow'],
          },
        },
      };
    }

    if (data.type === 'replan_schedule') {
      const delayMinutes = Number(data.delayMinutes) || 30;
      const refTime = data.referenceTime || undefined;
      const replanResult = calculateReplanSchedule({
        tasks: ctx.tasks,
        delayMinutes,
        referenceTime: refTime,
      });

      return {
        cleanedText,
        proposal: {
          id: `prop_${Date.now()}`,
          type: 'replan_schedule',
          title: `Replanejamento de +${delayMinutes} min`,
          summary: replanResult.summary,
          payload: replanResult,
        },
      };
    }
  } catch (e) {
    console.error('Falha ao parsear flow-action JSON', e);
  }

  return { cleanedText };
};

/**
 * Resposta Heurística Local / Offline quando não há chave de API cadastrada
 */
const generateLocalHeuristicResponse = (prompt: string, ctx: ChatContext): ChatResponse => {
  const lower = prompt.toLowerCase();

  // Caso 1: Detecção de atraso na rotina (RF-16)
  const delayMatch =
    lower.match(
      /(?:atras(?:o|ei|ou|ado|ada)|perdi|demorei)\s*(?:em\s*)?(\d+)\s*(?:min|minuto|m)/i
    ) || lower.match(/(\d+)\s*(?:min|minuto|m)\s*(?:de\s*)?atras/i);

  if (delayMatch) {
    const delayMinutes = parseInt(delayMatch[1], 10);
    const replanResult = calculateReplanSchedule({
      tasks: ctx.tasks,
      delayMinutes,
    });

    return {
      content: `Entendido! Identifiquei um atraso de **${delayMinutes} minutos**. 
Analisei os horários restantes da sua rotina de hoje e calculei a redistribuição automática para que você não perca suas prioridades.

${replanResult.summary}

Você pode aplicar os novos horários abaixo diretamente nos seus hábitos de hoje com 1 clique:`,
      actionProposal: {
        id: `prop_${Date.now()}`,
        type: 'replan_schedule',
        title: `Replanejamento de Horários (+${delayMinutes} min)`,
        summary: replanResult.summary,
        payload: replanResult,
      },
    };
  }

  // Caso 2: Criar tarefa via linguagem natural (RF-15)
  if (
    lower.startsWith('criar ') ||
    lower.startsWith('adicione ') ||
    lower.startsWith('agendar ') ||
    lower.includes('nova tarefa') ||
    lower.includes('crie uma tarefa') ||
    lower.includes('criar uma tarefa')
  ) {
    const timeMatch = prompt.match(/(?:às|as|para)\s*(\d{1,2}:\d{2})/i);
    const startTime = timeMatch ? timeMatch[1].padStart(5, '0') : '09:00';
    const [h, m] = startTime.split(':').map(Number);
    const endMinutes = h * 60 + m + 60;
    const endTime = minutesToTime(endMinutes);

    // Extrai data específica se fornecida (ex: 25/09)
    const { specificDate, formattedDate } = parseSpecificDateFromText(prompt, ctx.selectedDate);

    // Limpa o título da tarefa
    let title = cleanTaskTitle(prompt);
    if (!title) title = 'Nova Atividade';

    const dateNotice = specificDate && formattedDate ? ` para o dia **${formattedDate}**` : '';

    const summary =
      specificDate && formattedDate
        ? `Agendar "${title}" para ${formattedDate} das ${startTime} às ${endTime} (60 min).`
        : `Agendar "${title}" das ${startTime} às ${endTime} (60 min).`;

    return {
      content: `Perfeito! Estruturei a nova atividade **"${title}"**${dateNotice} das **${startTime} às ${endTime}**.
Confira os detalhes e clique em aplicar para agendá-la diretamente:`,
      actionProposal: {
        id: `prop_${Date.now()}`,
        type: 'create_task',
        title: `Criar Tarefa: ${title}`,
        summary,
        payload: {
          title,
          description: 'Criado via assistente Flow AI',
          startTime,
          endTime,
          targetMinutes: 60,
          categoryId: ctx.categories[0]?.id || '',
          routineTypeId: ctx.selectedRoutineTypeId,
          specificDate: specificDate || undefined,
          daysOfWeek: specificDate ? [] : [0, 1, 2, 3, 4, 5, 6],
          tags: ['ia-flow'],
        },
      },
    };
  }

  // Caso 3: Relatório de produtividade (RF-18)
  if (
    lower.includes('relatório') ||
    lower.includes('desempenho') ||
    lower.includes('produtividade') ||
    lower.includes('diagnóstico')
  ) {
    const totalTasks = ctx.tasks.length;
    const completedToday = Object.keys(ctx.logs).filter(
      (k) => k.startsWith(ctx.selectedDate) && ctx.logs[k]?.completed
    ).length;
    const completionRate = totalTasks > 0 ? Math.round((completedToday / totalTasks) * 100) : 0;

    return {
      content: `### 📊 Diagnóstico de Produtividade Semanal

* **Data de Análise**: ${ctx.selectedDate}
* **Tarefas Concluídas Hoje**: ${completedToday}/${totalTasks} (${completionRate}%)
* **Tempo Focado em Pomodoro**: ${ctx.totalPomodoroMinutes} minutos
* **Itens em Espera no Backlog**: ${ctx.backlogCount}

#### 🌟 Pontos Fortes
* Você manteve o foco registrado em suas atividades prioritárias.
* Há um bom equilíbrio entre blocos de foco e organização pessoal.

#### 💡 Sugestões de Otimização
1. Se notar acúmulo no fim da tarde, utilize o comando *"Atrasei X minutos"* para realinhar a rotina.
2. Esvazie itens do Backlog no início da semana transformando-os em blocos de foco.

*(Dica: Conecte sua conta Google ou chave Gemini no topo para análises preditivas ainda mais aprofundadas com IA generativa!)*`,
      actionProposal: {
        id: `prop_${Date.now()}`,
        type: 'productivity_report',
        title: 'Relatório Executivo de Produtividade',
        summary: `Diagnóstico gerado para ${ctx.selectedDate} (${completionRate}% de adesão).`,
        payload: {
          completionRate,
          completedToday,
          totalTasks,
          pomodoroMinutes: ctx.totalPomodoroMinutes,
        },
      },
    };
  }

  // Caso 4: Ajuda Geral
  return {
    content: `Olá! Eu sou o seu **Flow AI**. Estou pronto para te ajudar a manter sua rotina nos trilhos:

* ⚡ **Replanejar Atrasos**: Diga *"Atrasei 30 min no almoço"* e eu recalcularei os horários restantes.
* 📝 **Criar Atividades**: Diga *"Criar tarefa para o dia 25/09 de limpar o ar condicionado"* ou *"Treino às 18:00"*.
* 📊 **Diagnóstico**: Peça um *"Relatório de produtividade"*.
* 🎯 **Foco**: Pergunte o que priorizar agora.

*(Você está no modo inteligente local. Para raciocínio generativo avançado do Gemini, conecte sua Conta Google ou Chave de API no topo!)*`,
  };
};

/**
 * Interage com o Agente de IA (Cloud Function aiProxy quando Premium, Gemini REST API ou Fallback Heurístico Local)
 * Suporta autenticação via:
 * 1. Cloud Function aiProxy (automático para assinantes Premium autenticados)
 * 2. Chave de API Google Gemini própria (modo Free / Fallback)
 * 3. Bearer Token de Conta Google OAuth 2.0 (modo Free / Fallback)
 * 4. Fallback Heurístico Local Offline (quando offline ou sem chaves)
 */
export const sendMessageToAssistant = async ({
  prompt,
  history,
  context,
  apiKey,
  accessToken,
  model = DEFAULT_MODEL,
  isPremium,
  firebaseIdToken,
}: {
  prompt: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  context: ChatContext;
  apiKey?: string;
  accessToken?: string;
  model?: string;
  isPremium?: boolean;
  firebaseIdToken?: string;
}): Promise<ChatResponse> => {
  const storeProfile = useFlowStore.getState().userProfile;
  const effectiveIsPremium = isPremium ?? (storeProfile?.plan === 'premium');
  let idToken = firebaseIdToken;

  if (effectiveIsPremium && !idToken) {
    idToken = (await getActiveFirebaseIdToken()) || undefined;
  }

  // ROTA PRIMÁRIA: Se o usuário for Premium e possuir um token do Firebase Auth, usa o aiProxy
  if (effectiveIsPremium && idToken) {
    try {
      const systemPrompt = buildSystemInstruction(context);
      const sanitizedModel = normalizeModelName(model);

      const contents: any[] = [
        {
          role: 'user',
          parts: [{ text: `INSTRUÇÃO DO SISTEMA:\n${systemPrompt}` }],
        },
        {
          role: 'model',
          parts: [
            {
              text: 'Entendido. Agirei como Flow AI, gerando respostas elegantes e blocos ```flow-action quando for necessário criar tarefas com datas precisas ou replanejar atrasos.',
            },
          ],
        },
      ];

      // Histórico recente (últimas 6 mensagens para manter eficiência de tokens)
      const recentHistory = history.slice(-6);
      for (const h of recentHistory) {
        contents.push({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }],
        });
      }

      // Pergunta atual
      contents.push({
        role: 'user',
        parts: [{ text: prompt }],
      });

      const proxyResult = await callGeminiViaProxy({
        contents,
        model: sanitizedModel,
        idToken,
      });

      if (proxyResult.ok && proxyResult.candidateText) {
        const { cleanedText, proposal } = extractActionProposal(
          proxyResult.candidateText,
          context,
          prompt
        );
        return {
          content: cleanedText,
          actionProposal: proposal,
        };
      }

      // Se a quota mensal do plano Premium estiver esgotada (429)
      if (proxyResult.quotaExceeded) {
        const hasKey = apiKey && apiKey.trim().length > 10;
        const hasToken = accessToken && accessToken.trim().length > 10;

        // Se o usuário tiver cadastrado sua chave pessoal, faz fallback automático
        if (hasKey || hasToken) {
          console.warn(
            '[geminiService] Quota Premium esgotada, utilizando credencial pessoal como fallback.'
          );
        } else {
          const resetDate = storeProfile?.aiQuota?.resetDate || calculateNextResetDate();
          return {
            content: `⚠️ **Limite Mensal de IA Atingido**\n\nVocê atingiu a sua quota mensal de mensagens de IA do plano Flow Premium.\n\nSua quota será reiniciada automaticamente em **${resetDate}**.\n\n💡 *Dica: Você pode cadastrar uma Chave de API Google Gemini pessoal gratuita nas configurações para continuar gerando respostas até a renovação da sua quota.*`,
          };
        }
      }
    } catch (proxyErr) {
      console.warn('[geminiService] Falha ao chamar proxy de IA, tentando fallback:', proxyErr);
    }
  }

  // ROTA SECUNDÁRIA (Fallback pessoal / Modo Free / Dev):
  // Se houver chave pessoal de API ou Token Google OAuth
  const hasKey = apiKey && apiKey.trim().length > 10;
  const hasToken = accessToken && accessToken.trim().length > 10;

  if (hasKey || hasToken) {
    try {
      const systemPrompt = buildSystemInstruction(context);
      const sanitizedModel = normalizeModelName(model);

      const endpoint = hasKey
        ? `https://generativelanguage.googleapis.com/v1beta/models/${sanitizedModel}:generateContent?key=${apiKey!.trim()}`
        : `https://generativelanguage.googleapis.com/v1beta/models/${sanitizedModel}:generateContent`;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (hasToken) {
        headers['Authorization'] = `Bearer ${accessToken!.trim()}`;
      }

      // Monta histórico no formato aceito pelo Gemini
      const contents: any[] = [
        {
          role: 'user',
          parts: [{ text: `INSTRUÇÃO DO SISTEMA:\n${systemPrompt}` }],
        },
        {
          role: 'model',
          parts: [
            {
              text: 'Entendido. Agirei como Flow AI, gerando respostas elegantes e blocos ```flow-action quando for necessário criar tarefas com datas precisas ou replanejar atrasos.',
            },
          ],
        },
      ];

      // Histórico recente (últimas 6 mensagens para manter eficiência)
      const recentHistory = history.slice(-6);
      for (const h of recentHistory) {
        contents.push({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }],
        });
      }

      // Pergunta atual
      contents.push({
        role: 'user',
        parts: [{ text: prompt }],
      });

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ contents }),
      });

      if (!res.ok) {
        console.warn('Gemini API retornou erro, utilizando fallback heurístico.');
        return generateLocalHeuristicResponse(prompt, context);
      }

      const data = await res.json();
      const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!candidateText) {
        return generateLocalHeuristicResponse(prompt, context);
      }

      const { cleanedText, proposal } = extractActionProposal(candidateText, context, prompt);
      return {
        content: cleanedText,
        actionProposal: proposal,
      };
    } catch (err) {
      console.error('Erro na chamada ao Gemini API:', err);
      return generateLocalHeuristicResponse(prompt, context);
    }
  }

  // ROTA FINAL (Fallback Heurístico Local Offline)
  return generateLocalHeuristicResponse(prompt, context);
};

/**
 * Sugere quebra de tarefa complexa em subtarefas / checklists (RF-17)
 * Prioridade:
 * 1. Cloud Function aiProxy (quando Premium)
 * 2. Gemini REST API com credencial pessoal (Free/Dev)
 * 3. Fallback Heurístico local baseado no tipo de tarefa
 */
export const decomposeTaskWithGemini = async ({
  task,
  apiKey,
  accessToken,
  model = DEFAULT_MODEL,
  isPremium,
  firebaseIdToken,
}: {
  task: Task;
  apiKey?: string;
  accessToken?: string;
  model?: string;
  isPremium?: boolean;
  firebaseIdToken?: string;
}): Promise<string[]> => {
  const storeProfile = useFlowStore.getState().userProfile;
  const effectiveIsPremium = isPremium ?? (storeProfile?.plan === 'premium');
  let idToken = firebaseIdToken;

  if (effectiveIsPremium && !idToken) {
    idToken = (await getActiveFirebaseIdToken()) || undefined;
  }

  const prompt = `Dada a seguinte tarefa da rotina:
Título: "${task.title}"
Descrição: "${task.description || 'Sem descrição'}"
Duração prevista: ${task.targetMinutes} minutos

Quebre essa atividade em 3 a 5 subtarefas práticas, acionáveis e diretas para um checklist de execução.
Retorne EXCLUSIVAMENTE uma lista de itens, um por linha, iniciando com "- ". Sem introduções nem conclusões.`;

  // ROTA 1: Se o usuário for Premium e possuir um token, rota primária é o aiProxy
  if (effectiveIsPremium && idToken) {
    try {
      const sanitizedModel = normalizeModelName(model);
      const proxyResult = await callGeminiViaProxy({
        contents: [{ parts: [{ text: prompt }] }],
        model: sanitizedModel,
        idToken,
      });

      if (proxyResult.ok && proxyResult.candidateText) {
        const items = proxyResult.candidateText
          .split('\n')
          .map((line: string) => line.replace(/^[-*•\d.)\s]+/, '').trim())
          .filter((line: string) => line.length > 2);

        if (items.length > 0) return items.slice(0, 6);
      }
    } catch (e) {
      console.warn('Erro ao decompor tarefa via proxy Gemini, tentando fallback:', e);
    }
  }

  // ROTA 2: Fallback com API Key ou OAuth pessoal
  const hasKey = apiKey && apiKey.trim().length > 10;
  const hasToken = accessToken && accessToken.trim().length > 10;

  if (hasKey || hasToken) {
    try {
      const sanitizedModel = normalizeModelName(model);
      const endpoint = hasKey
        ? `https://generativelanguage.googleapis.com/v1beta/models/${sanitizedModel}:generateContent?key=${apiKey!.trim()}`
        : `https://generativelanguage.googleapis.com/v1beta/models/${sanitizedModel}:generateContent`;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (hasToken) {
        headers['Authorization'] = `Bearer ${accessToken!.trim()}`;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const items = text
          .split('\n')
          .map((line: string) => line.replace(/^[-*•\d.)\s]+/, '').trim())
          .filter((line: string) => line.length > 2);

        if (items.length > 0) return items.slice(0, 6);
      }
    } catch (e) {
      console.warn('Erro ao decompor tarefa com Gemini, gerando decomposição local:', e);
    }
  }

  // ROTA 3: Fallback Heurístico inteligente baseado no contexto do título
  const titleLower = task.title.toLowerCase();
  if (titleLower.includes('estud') || titleLower.includes('ler') || titleLower.includes('livro')) {
    return [
      'Preparar ambiente livre de distrações e abrir material',
      'Leitura ativa ou revisão dos pontos principais',
      'Tomar notas dos conceitos-chave no Bloco de Notas',
      'Resolver 2 a 3 exercícios ou perguntas de fixação',
    ];
  }

  if (
    titleLower.includes('ar condicionado') ||
    titleLower.includes('limpar') ||
    titleLower.includes('limpeza')
  ) {
    return [
      'Desconectar o aparelho da tomada por segurança',
      'Remover e lavar os filtros de ar com água corrente',
      'Limpar a carcaça externa e aletas com pano úmido',
      'Aguardar secagem completa antes de religar',
    ];
  }

  if (titleLower.includes('trein') || titleLower.includes('acad') || titleLower.includes('corr')) {
    return [
      'Alongamento dinâmico e aquecimento inicial (5 min)',
      'Execução dos blocos principais de exercícios',
      'Hidratação e controle de intensidade',
      'Desaquecimento e registro de métricas',
    ];
  }

  if (titleLower.includes('prog') || titleLower.includes('cod') || titleLower.includes('dev')) {
    return [
      'Revisar a issue / requisito e desenhar o fluxo',
      'Implementar a lógica central e tipos TypeScript',
      'Testar cenários de sucesso e casos de borda',
      'Realizar commit semântico limpo',
    ];
  }

  return [
    `Planejar os primeiros 5 minutos de foco em "${task.title}"`,
    'Executar a parte mais desafiadora da atividade',
    'Revisar o progresso e finalizar pendências imediatas',
    'Organizar próximos passos para a próxima sessão',
  ];
};
