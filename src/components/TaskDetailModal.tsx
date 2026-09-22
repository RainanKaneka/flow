'use client';

import React, { useState, useEffect } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { TaskAttachment, TaskChecklistItem } from '../types/routine';
import { sounds } from '../utils/audio';
import { decomposeTaskWithGemini } from '../services/geminiService';
import {
  X,
  Play,
  Clock,
  Plus,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Circle,
  FileText,
  Link2,
  ListTodo,
  Sparkles,
  Save,
} from 'lucide-react';

export const TaskDetailModal: React.FC = () => {
  const selectedTaskId = useFlowStore((s) => s.selectedTaskIdForDetail);
  const tasks = useFlowStore((s) => s.tasks);
  const categories = useFlowStore((s) => s.categories);
  const routineTypes = useFlowStore((s) => s.routineTypes);
  const selectedDate = useFlowStore((s) => s.selectedDate);
  const logs = useFlowStore((s) => s.logs);
  const geminiConfig = useFlowStore((s) => s.geminiConfig);
  const googleUser = useFlowStore((s) => s.googleUser);
  const closeTaskDetail = useFlowStore((s) => s.closeTaskDetail);
  const updateTaskSpecifications = useFlowStore((s) => s.updateTaskSpecifications);
  const toggleChecklistItem = useFlowStore((s) => s.toggleChecklistItem);
  const startPomodoro = useFlowStore((s) => s.startPomodoro);
  const setActiveView = useFlowStore((s) => s.setActiveView);

  const task = tasks.find((t) => t.id === selectedTaskId);

  // Form states internos
  const [richContent, setRichContent] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [isSavedBanner, setIsSavedBanner] = useState(false);
  const [isDecomposing, setIsDecomposing] = useState(false);

  useEffect(() => {
    if (task) {
      setRichContent(task.richContent || '');
      setNewSubtaskTitle('');
      setNewLinkTitle('');
      setNewLinkUrl('');
      setIsAddingLink(false);
    }
  }, [task]);

  if (!selectedTaskId || !task) return null;

  const category = categories.find((c) => c.id === task.categoryId) || {
    name: 'Geral',
    color: '#6366F1',
  };
  const routineType = routineTypes.find((rt) => rt.id === task.routineTypeId) || routineTypes[0];

  const key = `${selectedDate}_${task.id}`;
  const log = logs[key];
  const timeSpentMinutes = log?.timeSpentMinutes || 0;

  const checklist = task.checklist || [];
  const completedSubtasks = checklist.filter((item) => item.completed).length;
  const subtaskPercentage = checklist.length > 0 ? Math.round((completedSubtasks / checklist.length) * 100) : 0;
  const attachments = task.attachments || [];

  // Salvar anotações / especificações
  const handleSaveContent = () => {
    updateTaskSpecifications(task.id, { richContent });
    sounds.playTick();
    setIsSavedBanner(true);
    setTimeout(() => setIsSavedBanner(false), 2000);
  };

  // Adicionar Subtarefa
  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;

    const newItem: TaskChecklistItem = {
      id: `check_${Date.now()}`,
      title: newSubtaskTitle.trim(),
      completed: false,
    };

    updateTaskSpecifications(task.id, {
      checklist: [...checklist, newItem],
    });
    setNewSubtaskTitle('');
    sounds.playTick();
  };

  // Remover Subtarefa
  const handleDeleteSubtask = (itemId: string) => {
    updateTaskSpecifications(task.id, {
      checklist: checklist.filter((i) => i.id !== itemId),
    });
    sounds.playTick();
  };

  // Sugerir Subtarefas com Gemini IA (RF-17)
  const handleDecomposeWithAi = async () => {
    if (!task || isDecomposing) return;
    setIsDecomposing(true);
    sounds.playTick();

    try {
      const suggestedItems = await decomposeTaskWithGemini({
        task,
        apiKey: geminiConfig.apiKey,
        accessToken: googleUser?.accessToken,
        model: geminiConfig.model,
      });

      if (suggestedItems && suggestedItems.length > 0) {
        const newChecklistItems: TaskChecklistItem[] = suggestedItems.map((title, idx) => ({
          id: `check_ai_${Date.now()}_${idx}`,
          title,
          completed: false,
        }));

        updateTaskSpecifications(task.id, {
          checklist: [...checklist, ...newChecklistItems],
        });
        sounds.playGlassChime();
      }
    } catch (e) {
      console.error('Falha ao sugerir subtarefas com IA:', e);
    } finally {
      setIsDecomposing(false);
    }
  };

  // Adicionar Link
  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLinkUrl.trim()) return;

    let formattedUrl = newLinkUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const newAttach: TaskAttachment = {
      id: `att_${Date.now()}`,
      title: newLinkTitle.trim() || formattedUrl,
      url: formattedUrl,
      type: 'link',
    };

    updateTaskSpecifications(task.id, {
      attachments: [...attachments, newAttach],
    });
    setNewLinkTitle('');
    setNewLinkUrl('');
    setIsAddingLink(false);
    sounds.playTick();
  };

  // Remover Link
  const handleDeleteAttachment = (attId: string) => {
    updateTaskSpecifications(task.id, {
      attachments: attachments.filter((a) => a.id !== attId),
    });
    sounds.playTick();
  };

  // Iniciar Pomodoro nesta tarefa
  const handleStartTaskPomodoro = () => {
    startPomodoro(task.id);
    closeTaskDetail();
    setActiveView('pomodoro');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 52,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={closeTaskDetail}
    >
      <div
        className="double-bezel-outer"
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="double-bezel-inner"
          style={{
            padding: '24px 28px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                {/* Category badge */}
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: category.color,
                    backgroundColor: 'var(--bg-elevated)',
                    border: `1px solid ${category.color}40`,
                  }}
                >
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: category.color }} />
                  <span>{category.name}</span>
                </span>

                {/* Routine Type badge */}
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {routineType?.name}
                </span>

                {/* Target Time */}
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-muted)',
                  }}
                >
                  <Clock size={12} />
                  <span>{task.startTime} - {task.endTime} ({task.targetMinutes}m)</span>
                </span>
              </div>

              <h2 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                {task.title}
              </h2>

              {task.description && (
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                  {task.description}
                </p>
              )}
            </div>

            <button
              onClick={closeTaskDetail}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: 'none',
                background: 'var(--bg-elevated)',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Banner de Ação Rápida: Iniciar Pomodoro com esta tarefa vinculada */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(139, 92, 246, 0.08) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-primary)' }}>
                Foco com Pomodoro Integrado
              </span>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {timeSpentMinutes > 0
                  ? `Você já acumulou ${timeSpentMinutes} min de foco real nesta atividade hoje.`
                  : 'Cronometre seu tempo de foco real com som suave de conclusão.'}
              </p>
            </div>

            <button
              onClick={handleStartTaskPomodoro}
              className="btn-island btn-island-primary"
            >
              <span>Focar com Pomodoro</span>
              <div className="btn-circle-icon">
                <Play size={13} fill="currentColor" />
              </div>
            </button>
          </div>

          {/* Seção 1: Checklist de Sub-tarefas (RF-6, RF-17) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ListTodo size={16} color="var(--accent-primary)" />
                <h4 style={{ fontSize: '14px', fontWeight: 700 }}>Checklist & Sub-tarefas</h4>
                {checklist.length > 0 && (
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>
                    ({completedSubtasks}/{checklist.length})
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleDecomposeWithAi}
                disabled={isDecomposing}
                style={{
                  background: 'rgba(99, 102, 241, 0.1)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  color: '#6366F1',
                  borderRadius: '8px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: isDecomposing ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.2s',
                }}
              >
                <Sparkles size={13} className={isDecomposing ? 'animate-spin' : ''} />
                <span>{isDecomposing ? 'Gerando com IA...' : 'Sugerir Subtarefas com IA'}</span>
              </button>
            </div>

            {/* Barra de progresso do checklist */}
            {checklist.length > 0 && (
              <div
                style={{
                  width: '100%',
                  height: '4px',
                  backgroundColor: 'var(--bg-elevated)',
                  borderRadius: '9999px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${subtaskPercentage}%`,
                    height: '100%',
                    backgroundColor: subtaskPercentage === 100 ? 'var(--success)' : 'var(--accent-primary)',
                    transition: 'width 300ms ease',
                  }}
                />
              </div>
            )}

            {/* Itens do Checklist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {checklist.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <button
                    onClick={() => {
                      sounds.playCheck();
                      toggleChecklistItem(task.id, item.id);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'transparent',
                      border: 'none',
                      color: item.completed ? 'var(--text-muted)' : 'var(--text-primary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '13px',
                      textDecoration: item.completed ? 'line-through' : 'none',
                    }}
                  >
                    {item.completed ? (
                      <CheckCircle2 size={16} color="var(--success)" />
                    ) : (
                      <Circle size={16} color="var(--text-muted)" />
                    )}
                    <span>{item.title}</span>
                  </button>

                  <button
                    onClick={() => handleDeleteSubtask(item.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            {/* Input Adicionar Sub-tarefa */}
            <form onSubmit={handleAddSubtask} style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                placeholder="Adicionar passo ou subtarefa... (ex: Ler páginas 10-25)"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={!newSubtaskTitle.trim()}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'var(--bg-elevated)',
                  color: newSubtaskTitle.trim() ? 'var(--accent-primary)' : 'var(--text-muted)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: newSubtaskTitle.trim() ? 'pointer' : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Plus size={14} />
                <span>Adicionar</span>
              </button>
            </form>
          </div>

          {/* Seção 2: Links, Recursos e Arquivos (RF-6) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Link2 size={16} color="var(--accent-primary)" />
                <h4 style={{ fontSize: '14px', fontWeight: 700 }}>Links e Materiais de Apoio</h4>
              </div>

              <button
                onClick={() => setIsAddingLink(!isAddingLink)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent-primary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Plus size={13} />
                <span>{isAddingLink ? 'Fechar' : 'Novo Link'}</span>
              </button>
            </div>

            {/* Formulário Novo Link */}
            {isAddingLink && (
              <form
                onSubmit={handleAddLink}
                style={{
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Título (ex: Documentação Oficial)"
                    value={newLinkTitle}
                    onChange={(e) => setNewLinkTitle(e.target.value)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      outline: 'none',
                    }}
                  />
                  <input
                    type="text"
                    required
                    placeholder="URL (ex: github.com ou drive.google.com)"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      outline: 'none',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setIsAddingLink(false)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--text-secondary)',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-island btn-island-primary"
                    style={{ padding: '4px 12px', fontSize: '12px' }}
                  >
                    Salvar Link
                  </button>
                </div>
              </form>
            )}

            {/* Lista de links */}
            {attachments.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 12px',
                      borderRadius: '9999px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '12px',
                    }}
                  >
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        color: 'var(--accent-primary)',
                        textDecoration: 'none',
                        fontWeight: 600,
                      }}
                    >
                      <ExternalLink size={12} />
                      <span>{att.title}</span>
                    </a>
                    <button
                      onClick={() => handleDeleteAttachment(att.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        padding: 0,
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Nenhum link ou arquivo anexado. Adicione URLs de artigos, repositórios ou vídeos de estudo.
              </p>
            )}
          </div>

          {/* Seção 3: Anotações Livres & Roteiro Detalhado da Tarefa (RF-6) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={16} color="var(--accent-primary)" />
                <h4 style={{ fontSize: '14px', fontWeight: 700 }}>Especificações & Anotações de Estudo</h4>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isSavedBanner && (
                  <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 700 }}>
                    ✓ Salvo com sucesso!
                  </span>
                )}
                <button
                  onClick={handleSaveContent}
                  className="btn-island btn-island-primary"
                  style={{ padding: '5px 12px', fontSize: '12px' }}
                >
                  <Save size={13} />
                  <span>Salvar Texto</span>
                </button>
              </div>
            </div>

            <textarea
              rows={6}
              value={richContent}
              onChange={(e) => setRichContent(e.target.value)}
              placeholder="Escreva aqui tudo o que pretende cobrir nesta tarefa: resumos, conceitos-chave, dúvidas, observações ou roteiro passo a passo..."
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontFamily: 'var(--font-sans)',
                lineHeight: 1.5,
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
