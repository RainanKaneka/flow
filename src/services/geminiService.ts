import { Task, Category, RoutineType, AiActionProposal, TaskLog } from '../types/routine';
import { calculateReplanSchedule, timeToMinutes, minutesToTime } from '../utils/routineReplan';

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
  const slashMatch = text.match(/(?:(?:dia|para o dia|para dia|no dia)\s*)?(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/i);
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
  const monthNames = [
    'janeiro', 'fevereiro', 'março', 'marco', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  const monthRegex = new RegExp(`(?:dia\\s*)?(\\d{1,2})\\s*(?:de\\s*)?(${monthNames.join('|')})(?:\\s*(?:de\\s*)?(\\d{2,4}))?`, 'i');
  const textMonthMatch = text.match(monthRegex);
  if (textMonthMatch) {
    const day = parseInt(textMonthMatch[1], 10);
    const mName = textMonthMatch[2].toLowerCase();
    const month = (monthNames.indexOf(mName) % 12) + 1;
    let year = textMonthMatch[3] ? parseInt(textMonthMatch[3], 10) : refYear;
    if (year < 100) year += 2000;

    if (day >= 1 && day <= 31) {
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
    .replace(/^(criar|adicione|adicionar|agendar|nova tarefa)\s*(uma\s*)?(tarefa|atividade)?\s*(de\s*)?/i, '')
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
      .filter((m: any) => !m.id.includes('embedding') && !m.id.includes('aqa') && m.id !== 'gemini-2.0-flash');

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
): Promise<{ valid: boolean; recommendedModel?: string; error?: string; availableModels?: GeminiModelOption[] }> => {
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
      if (message.includes('no longer available') || message.includes('not found') || message.includes('deprecated')) {
        const fallback = sanitizedModel === 'gemini-2.5-flash' ? 'gemini-1.5-flash' : 'gemini-2.5-flash';
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

/**
 * Constrói o System Prompt com o contexto atual da rotina do usuário e instruções estritas de agendamento por data
 */
const buildSystemInstruction = (ctx: ChatContext): string => {
  const currentTasksStr = ctx.tasks
    .map((t) => `- [${t.startTime} - ${t.endTime}] ${t.title} (${t.specificDate ? `Data: ${t.specificDate}` : 'Recorrente'})`)
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

      const specificDate = data.specificDate || parsedFromPrompt.specificDate || parsedFromTitle.specificDate || parsedFromText.specificDate;
      const formattedDate = parsedFromPrompt.formattedDate || parsedFromTitle.formattedDate || parsedFromText.formattedDate || (specificDate ? specificDate.split('-').reverse().join('/') : undefined);

      let title = cleanTaskTitle(data.title || 'Nova Tarefa');
      if (!title) title = 'Nova Atividade';

      const startTime = data.startTime || '09:00';
      const endTime = data.endTime || '10:00';
      const targetMinutes = data.targetMinutes || 60;

      const summary = specificDate && formattedDate
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
            daysOfWeek: specificDate ? [] : (data.daysOfWeek || [0, 1, 2, 3, 4, 5, 6]),
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
  const delayMatch = lower.match(/(?:atras(?:o|ei|ou)|perdi|demorei)\s*(?:em\s*)?(\d+)\s*(?:min|minuto|m)/i) ||
                     lower.match(/(\d+)\s*(?:min|minuto|m)\s*(?:de\s*)?atras/i);

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

    const dateNotice = specificDate && formattedDate
      ? ` para o dia **${formattedDate}**`
      : '';

    const summary = specificDate && formattedDate
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
  if (lower.includes('relatório') || lower.includes('desempenho') || lower.includes('produtividade') || lower.includes('diagnóstico')) {
    const totalTasks = ctx.tasks.length;
    const completedToday = Object.keys(ctx.logs).filter((k) => k.startsWith(ctx.selectedDate) && ctx.logs[k]?.completed).length;
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
 * Interage com o Agente de IA (Gemini REST API ou Fallback Heurístico Local)
 * Suporta autenticação tanto via Chave de API quanto via Bearer Token de Conta Google OAuth 2.0
 */
export const sendMessageToAssistant = async ({
  prompt,
  history,
  context,
  apiKey,
  accessToken,
  model = DEFAULT_MODEL,
}: {
  prompt: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  context: ChatContext;
  apiKey?: string;
  accessToken?: string;
  model?: string;
}): Promise<ChatResponse> => {
  const hasKey = apiKey && apiKey.trim().length > 10;
  const hasToken = accessToken && accessToken.trim().length > 10;

  // Se não houver chave de API nem token OAuth, utiliza o motor inteligente local
  if (!hasKey && !hasToken) {
    return generateLocalHeuristicResponse(prompt, context);
  }

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
        parts: [{ text: 'Entendido. Agirei como Flow AI, gerando respostas elegantes e blocos ```flow-action quando for necessário criar tarefas com datas precisas ou replanejar atrasos.' }],
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
};

/**
 * Sugere quebra de tarefa complexa em subtarefas / checklists (RF-17)
 */
export const decomposeTaskWithGemini = async ({
  task,
  apiKey,
  accessToken,
  model = DEFAULT_MODEL,
}: {
  task: Task;
  apiKey?: string;
  accessToken?: string;
  model?: string;
}): Promise<string[]> => {
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

      const prompt = `Dada a seguinte tarefa da rotina:
Título: "${task.title}"
Descrição: "${task.description || 'Sem descrição'}"
Duração prevista: ${task.targetMinutes} minutos

Quebre essa atividade em 3 a 5 subtarefas práticas, acionáveis e diretas para um checklist de execução.
Retorne EXCLUSIVAMENTE uma lista de itens, um por linha, iniciando com "- ". Sem introduções nem conclusões.`;

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

  // Fallback Heurístico inteligente baseado no contexto do título
  const titleLower = task.title.toLowerCase();
  if (titleLower.includes('estud') || titleLower.includes('ler') || titleLower.includes('livro')) {
    return [
      'Preparar ambiente livre de distrações e abrir material',
      'Leitura ativa ou revisão dos pontos principais',
      'Tomar notas dos conceitos-chave no Bloco de Notas',
      'Resolver 2 a 3 exercícios ou perguntas de fixação',
    ];
  }

  if (titleLower.includes('ar condicionado') || titleLower.includes('limpar') || titleLower.includes('limpeza')) {
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
