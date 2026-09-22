import { StateCreator } from 'zustand';
import {
  FlowStore,
  GoogleUserProfile,
  GeminiConfig,
  AiChatMessage,
  Task,
} from '../../types/routine';

export interface AiSliceState {
  googleUser: GoogleUserProfile | null;
  geminiConfig: GeminiConfig;
  aiMessages: AiChatMessage[];
  isGoogleAuthModalOpen: boolean;
}

export interface AiSliceActions {
  setGoogleUser: (user: GoogleUserProfile | null) => void;
  setGeminiConfig: (config: Partial<GeminiConfig>) => void;
  addAiMessage: (
    msg: Omit<AiChatMessage, 'id' | 'timestamp'> & { id?: string; timestamp?: string }
  ) => void;
  clearAiChat: () => void;
  applyAiActionProposal: (proposalId: string) => void;
  openGoogleAuthModal: () => void;
  closeGoogleAuthModal: () => void;
}

export type AiSlice = AiSliceState & AiSliceActions;

export const createAiSlice: StateCreator<FlowStore, [], [], AiSlice> = (set) => ({
  googleUser: null,
  geminiConfig: {
    apiKey: '',
    model: 'gemini-2.5-flash',
    isConnected: false,
  },
  aiMessages: [
    {
      id: 'welcome_ai_msg',
      role: 'assistant',
      content: `Olá! Eu sou o **Flow AI**, seu assistente inteligente de gestão de rotina e alta performance.

Aqui estão algumas coisas que podemos fazer:
* ⚡ **Replanejar Atrasos (RF-16)**: Me avise se tiver imprevistos (ex: *"Atrasei 30 min no almoço"*), e eu redistribuo as tarefas restantes.
* 📝 **Criar Atividades (RF-15)**: Diga *"Criar tarefa Leitura às 20:00"* em linguagem natural.
* 📊 **Diagnósticos de Desempenho (RF-18)**: Peça um resumo de produtividade e gargalos.

💡 *Dica: Conecte sua Conta Google ou Chave Gemini no topo para raciocínio avançado com IA generativa!*`,
      timestamp: '08:00',
    },
  ],
  isGoogleAuthModalOpen: false,

  setGoogleUser: (user) => {
    set({ googleUser: user });
  },

  setGeminiConfig: (config) => {
    set((state) => {
      const updatedConfig = {
        ...state.geminiConfig,
        ...config,
      };
      if (updatedConfig.model === 'gemini-2.0-flash') {
        updatedConfig.model = 'gemini-2.5-flash';
      }
      return { geminiConfig: updatedConfig };
    });
  },

  addAiMessage: (msg) => {
    const newMsg: AiChatMessage = {
      ...msg,
      id: msg.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp:
        msg.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    set((state) => ({
      aiMessages: [...state.aiMessages, newMsg],
    }));
  },

  clearAiChat: () => {
    set({
      aiMessages: [
        {
          id: `reset_${Date.now()}`,
          role: 'assistant',
          content: 'Histórico limpo. Em que posso te ajudar na sua rotina agora?',
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
      ],
    });
  },

  applyAiActionProposal: (proposalId: string) => {
    set((state) => {
      const msg = state.aiMessages.find((m) => m.actionProposal?.id === proposalId);
      if (!msg || !msg.actionProposal || msg.actionProposal.applied) return state;

      const proposal = msg.actionProposal;
      let updatedTasks = [...state.tasks];
      let nextSelectedDate = state.selectedDate;

      if (proposal.type === 'create_task') {
        const taskPayload = proposal.payload;
        const hasSpecificDate = !!taskPayload.specificDate;
        const newTask: Task = {
          ...taskPayload,
          id: `task_${Date.now()}`,
          specificDate: taskPayload.specificDate || undefined,
          daysOfWeek: hasSpecificDate ? [] : taskPayload.daysOfWeek || [0, 1, 2, 3, 4, 5, 6],
          tags: taskPayload.tags || ['ia-flow'],
        };
        updatedTasks.push(newTask);

        if (hasSpecificDate) {
          nextSelectedDate = taskPayload.specificDate;
        }
      } else if (proposal.type === 'replan_schedule') {
        const diffs = proposal.payload.diffs || [];
        const diffMap = new Map(diffs.map((d: any) => [d.taskId, d]));
        updatedTasks = updatedTasks.map((t) => {
          const diff: any = diffMap.get(t.id);
          if (diff) {
            return {
              ...t,
              startTime: diff.newStartTime,
              endTime: diff.newEndTime,
            };
          }
          return t;
        });
      }

      const updatedMessages = state.aiMessages.map((m) => {
        if (m.actionProposal?.id === proposalId) {
          return {
            ...m,
            actionProposal: {
              ...m.actionProposal,
              applied: true,
            },
          };
        }
        return m;
      });

      return {
        tasks: updatedTasks,
        selectedDate: nextSelectedDate,
        activeView: 'routine',
        aiMessages: updatedMessages,
      };
    });
  },

  openGoogleAuthModal: () => {
    set({ isGoogleAuthModalOpen: true });
  },

  closeGoogleAuthModal: () => {
    set({ isGoogleAuthModalOpen: false });
  },
});
