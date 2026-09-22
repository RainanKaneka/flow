'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { sendMessageToAssistant } from '../services/geminiService';
import { sounds } from '../utils/audio';
import {
  Sparkles,
  Send,
  Trash2,
  Settings,
  Bot,
  User,
  Clock,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  FileText,
  Zap,
  BarChart2,
  HelpCircle,
} from 'lucide-react';

export const AiAssistantView: React.FC = () => {
  const tasks = useFlowStore((s) => s.tasks);
  const categories = useFlowStore((s) => s.categories);
  const routineTypes = useFlowStore((s) => s.routineTypes);
  const selectedRoutineTypeId = useFlowStore((s) => s.selectedRoutineTypeId);
  const selectedDate = useFlowStore((s) => s.selectedDate);
  const logs = useFlowStore((s) => s.logs);
  const backlog = useFlowStore((s) => s.backlog);
  const pomodoro = useFlowStore((s) => s.pomodoro);
  
  const googleUser = useFlowStore((s) => s.googleUser);
  const geminiConfig = useFlowStore((s) => s.geminiConfig);
  const openGoogleAuthModal = useFlowStore((s) => s.openGoogleAuthModal);
  
  const aiMessages = useFlowStore((s) => s.aiMessages);
  const addAiMessage = useFlowStore((s) => s.addAiMessage);
  const clearAiChat = useFlowStore((s) => s.clearAiChat);
  const applyAiActionProposal = useFlowStore((s) => s.applyAiActionProposal);
  const addNote = useFlowStore((s) => s.addNote);
  const setActiveView = useFlowStore((s) => s.setActiveView);

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Calcula minutos de Pomodoro focados
  const totalPomodoroMinutes = useMemo(() => {
    return pomodoro.completedSessions * 25;
  }, [pomodoro.completedSessions]);

  // Auto-scroll para a mensagem mais recente
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages, isLoading]);

  // Contexto para envio à IA
  const chatContext = useMemo(() => {
    return {
      tasks,
      categories,
      routineTypes,
      selectedRoutineTypeId,
      selectedDate,
      logs,
      backlogCount: backlog.length,
      totalPomodoroMinutes,
    };
  }, [tasks, categories, routineTypes, selectedRoutineTypeId, selectedDate, logs, backlog.length, totalPomodoroMinutes]);

  // Enviar mensagem
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    // Adiciona mensagem do usuário
    addAiMessage({
      role: 'user',
      content: text,
    });
    setInputMessage('');
    setIsLoading(true);
    sounds.playTick();

    try {
      // Constrói histórico de mensagens para a IA
      const history = aiMessages.map((m) => ({
        role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: m.content,
      }));

      const response = await sendMessageToAssistant({
        prompt: text,
        history,
        context: chatContext,
        apiKey: geminiConfig.apiKey,
        accessToken: googleUser?.accessToken,
        model: geminiConfig.model,
      });

      // Adiciona resposta do assistente
      addAiMessage({
        role: 'assistant',
        content: response.content,
        actionProposal: response.actionProposal,
      });

      if (response.actionProposal) {
        sounds.playGlassChime();
      } else {
        sounds.playTick();
      }
    } catch (err) {
      addAiMessage({
        role: 'assistant',
        content: 'Desculpe, ocorreu uma instabilidade ao processar a resposta. Por favor, tente novamente.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Salvar relatório no Bloco de Notas
  const handleSaveReportToNotepad = (content: string) => {
    addNote({
      title: `Diagnóstico Semanal de Produtividade (${selectedDate})`,
      content: content.replace(/```flow-action[\s\S]*?```/, '').trim(),
      tags: ['relatório', 'ia', 'produtividade'],
      color: '#6366F1',
    });
    sounds.playGlassChime();
    setActiveView('notes');
  };

  return (
    <div style={{ padding: '0 28px 40px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner de Conexão Google & Modelo Gemini (RF-19) */}
      <div
        style={{
          borderRadius: '20px',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              backgroundColor: 'rgba(99, 102, 241, 0.12)',
              color: '#6366F1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Bot size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 700, fontSize: '1rem' }}>Flow Copilot AI</span>
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  backgroundColor: geminiConfig.apiKey ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                  color: geminiConfig.apiKey ? '#10B981' : '#6366F1',
                  fontWeight: 600,
                }}
              >
                {geminiConfig.apiKey ? geminiConfig.model : 'Modo Heurístico Local'}
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {googleUser ? (
                <span>Conectado como <strong>{googleUser.name}</strong> ({googleUser.email})</span>
              ) : (
                <span>Comandos de voz e texto para automação de rotina</span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={openGoogleAuthModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <Settings size={15} />
          <span>Configurar IA / Google</span>
        </button>
      </div>

      {/* Chips de Ações Rápidas (Sugestões de Comandos RF-15, RF-16, RF-18) */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={() => handleSendMessage('Atrasei 30 min no almoço, por favor replaneje os horários restantes de hoje')}
          style={{
            padding: '8px 14px',
            borderRadius: '999px',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontSize: '0.82rem',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s',
          }}
        >
          <Zap size={14} color="#F59E0B" />
          <span>⚡ Atrasei 30 min, replanejar dia</span>
        </button>

        <button
          onClick={() => handleSendMessage('Gerar relatório e diagnóstico de produtividade com base no meu dashboard')}
          style={{
            padding: '8px 14px',
            borderRadius: '999px',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontSize: '0.82rem',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s',
          }}
        >
          <BarChart2 size={14} color="#10B981" />
          <span>📊 Diagnóstico de Produtividade</span>
        </button>

        <button
          onClick={() => handleSendMessage('Criar tarefa Leitura às 20:00 por 45 minutos')}
          style={{
            padding: '8px 14px',
            borderRadius: '999px',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontSize: '0.82rem',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s',
          }}
        >
          <Sparkles size={14} color="#6366F1" />
          <span>📝 Criar tarefa Leitura às 20:00</span>
        </button>

        <button
          onClick={() => handleSendMessage('Quais são as minhas próximas tarefas e o que devo focar agora?')}
          style={{
            padding: '8px 14px',
            borderRadius: '999px',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontSize: '0.82rem',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s',
          }}
        >
          <HelpCircle size={14} color="#8B5CF6" />
          <span>🎯 O que devo priorizar agora?</span>
        </button>
      </div>

      {/* Janela Principal de Conversa com Double-Bezel */}
      <div
        style={{
          borderRadius: '24px',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          height: '580px',
          overflow: 'hidden',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.08)',
        }}
      >
        {/* Barra de Título do Chat */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-primary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Histórico de Conversa</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>• {aiMessages.length} mensagens</span>
          </div>

          <button
            onClick={clearAiChat}
            title="Limpar Conversa"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.78rem',
              padding: '4px 8px',
              borderRadius: '6px',
              transition: 'all 0.2s',
            }}
          >
            <Trash2 size={14} />
            <span>Limpar chat</span>
          </button>
        </div>

        {/* Stream de Mensagens */}
        <div
          style={{
            flex: 1,
            padding: '20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          {aiMessages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  gap: '12px',
                  alignSelf: isUser ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                }}
              >
                {!isUser && (
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(99, 102, 241, 0.15)',
                      color: '#6366F1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '4px',
                    }}
                  >
                    <Bot size={18} />
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
                  <div
                    style={{
                      padding: '14px 18px',
                      borderRadius: isUser ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                      backgroundColor: isUser ? '#6366F1' : 'var(--bg-primary)',
                      color: isUser ? '#FFFFFF' : 'var(--text-primary)',
                      border: isUser ? 'none' : '1px solid var(--border-color)',
                      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
                      fontSize: '0.92rem',
                      lineHeight: '1.55',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {msg.content}
                  </div>

                  {/* Card Interativo de Ação Proposta (RF-15, RF-16, RF-18) */}
                  {msg.actionProposal && (
                    <div
                      style={{
                        width: '100%',
                        borderRadius: '16px',
                        backgroundColor: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: msg.actionProposal.applied ? '#10B981' : '#F59E0B',
                            }}
                          />
                          <strong style={{ fontSize: '0.9rem' }}>{msg.actionProposal.title}</strong>
                        </div>

                        {msg.actionProposal.applied ? (
                          <span
                            style={{
                              fontSize: '0.75rem',
                              padding: '3px 8px',
                              borderRadius: '999px',
                              backgroundColor: 'rgba(16, 185, 129, 0.15)',
                              color: '#10B981',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <CheckCircle2 size={12} /> Aplicado
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pronto para aplicar</span>
                        )}
                      </div>

                      <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: 0 }}>
                        {msg.actionProposal.summary}
                      </p>

                      {/* Visualização de Diffs em Replanejamento de Horário (RF-16) */}
                      {msg.actionProposal.type === 'replan_schedule' && msg.actionProposal.payload?.diffs?.length > 0 && (
                        <div
                          style={{
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: '12px',
                            padding: '10px 14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            fontSize: '0.82rem',
                          }}
                        >
                          {msg.actionProposal.payload.diffs.map((diff: any) => (
                            <div
                              key={diff.taskId}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                borderBottom: '1px solid var(--border-color)',
                                paddingBottom: '4px',
                              }}
                            >
                              <span style={{ fontWeight: 500 }}>{diff.title}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                                <span style={{ textDecoration: 'line-through' }}>{diff.originalStartTime}</span>
                                <ArrowRight size={12} />
                                <strong style={{ color: '#10B981' }}>{diff.newStartTime}</strong>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Botões de Ação */}
                      <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                        {msg.actionProposal.type === 'productivity_report' ? (
                          <button
                            onClick={() => handleSaveReportToNotepad(msg.content)}
                            style={{
                              padding: '8px 16px',
                              borderRadius: '10px',
                              backgroundColor: 'rgba(99, 102, 241, 0.15)',
                              border: '1px solid rgba(99, 102, 241, 0.3)',
                              color: '#6366F1',
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <FileText size={14} /> Salvar no Bloco de Notas
                          </button>
                        ) : !msg.actionProposal.applied ? (
                          <button
                            onClick={() => {
                              applyAiActionProposal(msg.actionProposal!.id);
                              sounds.playGlassChime();
                            }}
                            style={{
                              padding: '8px 16px',
                              borderRadius: '10px',
                              backgroundColor: '#10B981',
                              border: 'none',
                              color: '#FFFFFF',
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                            }}
                          >
                            <CheckCircle2 size={14} />
                            <span>Aplicar Alterações no Flow</span>
                          </button>
                        ) : null}
                      </div>
                    </div>
                  )}

                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', padding: '0 4px' }}>
                    {msg.timestamp}
                  </span>
                </div>

                {isUser && (
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      color: 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '4px',
                    }}
                  >
                    <User size={18} />
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(99, 102, 241, 0.15)',
                  color: '#6366F1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Sparkles size={18} className="animate-spin" />
              </div>
              <div
                style={{
                  padding: '12px 18px',
                  borderRadius: '20px 20px 20px 4px',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-muted)',
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#6366F1' }} />
                <span>O Flow AI está pensando e calculando os horários...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar com Double-Bezel e Atalhos */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-primary)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder="Digite seu comando (ex: 'Atrasei 30 min no almoço' ou 'Criar tarefa Leitura às 20:00')..."
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '14px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '0.92rem',
                outline: 'none',
              }}
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || isLoading}
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                border: 'none',
                backgroundColor: inputMessage.trim() && !isLoading ? '#6366F1' : 'var(--bg-secondary)',
                color: inputMessage.trim() && !isLoading ? '#FFFFFF' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: inputMessage.trim() && !isLoading ? 'pointer' : 'default',
                transition: 'all 0.2s',
                boxShadow: inputMessage.trim() && !isLoading ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none',
              }}
            >
              <Send size={18} />
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            <span>Pressione <strong>Enter</strong> para enviar</span>
            <span>💡 Os dados e chaves são processados de forma privada</span>
          </div>
        </div>
      </div>
    </div>
  );
};
