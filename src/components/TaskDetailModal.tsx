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
import styles from './TaskDetailModal.module.css';

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
  const subtaskPercentage =
    checklist.length > 0 ? Math.round((completedSubtasks / checklist.length) * 100) : 0;
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
    <div className={styles.modalOverlay} onClick={closeTaskDetail}>
      <div
        className={`double-bezel-outer ${styles.modalOuter}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`double-bezel-inner ${styles.modalInner}`}>
          {/* Header */}
          <div className={styles.headerRow}>
            <div>
              <div className={styles.badgesRow}>
                {/* Category badge */}
                <span
                  className={styles.categoryBadge}
                  style={{
                    color: category.color,
                    border: `1px solid ${category.color}40`,
                  }}
                >
                  <div className={styles.categoryDot} style={{ backgroundColor: category.color }} />
                  <span>{category.name}</span>
                </span>

                {/* Routine Type badge */}
                <span className={styles.routineBadge}>{routineType?.name}</span>

                {/* Target Time */}
                <span className={styles.timeBadge}>
                  <Clock size={12} />
                  <span>
                    {task.startTime} - {task.endTime} ({task.targetMinutes}m)
                  </span>
                </span>
              </div>

              <h2 className={styles.taskTitle}>{task.title}</h2>

              {task.description && <p className={styles.taskDesc}>{task.description}</p>}
            </div>

            <button
              onClick={closeTaskDetail}
              className={styles.closeBtn}
              title="Fechar detalhes da atividade"
            >
              <X size={16} />
            </button>
          </div>

          {/* Banner de Ação Rápida: Iniciar Pomodoro com esta tarefa vinculada */}
          <div className={styles.pomodoroBanner}>
            <div>
              <span className={styles.pomodoroBannerTitle}>Foco com Pomodoro Integrado</span>
              <p className={styles.pomodoroBannerSubtitle}>
                {timeSpentMinutes > 0
                  ? `Você já acumulou ${timeSpentMinutes} min de foco real nesta atividade hoje.`
                  : 'Cronometre seu tempo de foco real com som suave de conclusão.'}
              </p>
            </div>

            <button onClick={handleStartTaskPomodoro} className="btn-island btn-island-primary">
              <span>Focar com Pomodoro</span>
              <div className="btn-circle-icon">
                <Play size={13} fill="currentColor" />
              </div>
            </button>
          </div>

          {/* Seção 1: Checklist de Sub-tarefas (RF-6, RF-17) */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionHeaderTitle}>
                <ListTodo size={16} color="var(--accent-primary)" />
                <h4 className={styles.sectionHeading}>Checklist & Sub-tarefas</h4>
                {checklist.length > 0 && (
                  <span className={styles.countLabel}>
                    ({completedSubtasks}/{checklist.length})
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleDecomposeWithAi}
                disabled={isDecomposing}
                className={styles.aiDecomposeBtn}
              >
                <Sparkles size={13} className={isDecomposing ? 'animate-spin' : ''} />
                <span>{isDecomposing ? 'Gerando com IA...' : 'Sugerir Subtarefas com IA'}</span>
              </button>
            </div>

            {/* Barra de progresso do checklist */}
            {checklist.length > 0 && (
              <div className={styles.progressBarTrack}>
                <div
                  className={styles.progressBarFill}
                  style={{
                    width: `${subtaskPercentage}%`,
                    backgroundColor:
                      subtaskPercentage === 100 ? 'var(--success)' : 'var(--accent-primary)',
                  }}
                />
              </div>
            )}

            {/* Itens do Checklist */}
            <div className={styles.checklistList}>
              {checklist.map((item) => (
                <div key={item.id} className={styles.checklistItem}>
                  <button
                    onClick={() => {
                      sounds.playCheck();
                      toggleChecklistItem(task.id, item.id);
                    }}
                    className={styles.checklistToggleBtn}
                    style={{
                      color: item.completed ? 'var(--text-muted)' : 'var(--text-primary)',
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
                    className={styles.deleteSubtaskBtn}
                    title="Remover subtarefa"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            {/* Input Adicionar Sub-tarefa */}
            <form onSubmit={handleAddSubtask} className={styles.addSubtaskForm}>
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                placeholder="Adicionar passo ou subtarefa... (ex: Ler páginas 10-25)"
                className={styles.subtaskInput}
              />
              <button
                type="submit"
                disabled={!newSubtaskTitle.trim()}
                className={styles.subtaskAddBtn}
                style={{
                  color: newSubtaskTitle.trim() ? 'var(--accent-primary)' : 'var(--text-muted)',
                  cursor: newSubtaskTitle.trim() ? 'pointer' : 'default',
                }}
              >
                <Plus size={14} />
                <span>Adicionar</span>
              </button>
            </form>
          </div>

          {/* Seção 2: Links, Recursos e Arquivos (RF-6) */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionHeaderTitle}>
                <Link2 size={16} color="var(--accent-primary)" />
                <h4 className={styles.sectionHeading}>Links e Materiais de Apoio</h4>
              </div>

              <button
                onClick={() => setIsAddingLink(!isAddingLink)}
                className={styles.toggleLinkBtn}
              >
                <Plus size={13} />
                <span>{isAddingLink ? 'Fechar' : 'Novo Link'}</span>
              </button>
            </div>

            {/* Formulário Novo Link */}
            {isAddingLink && (
              <form onSubmit={handleAddLink} className={styles.addLinkForm}>
                <div className={styles.linkInputGrid}>
                  <input
                    type="text"
                    placeholder="Título (ex: Documentação Oficial)"
                    value={newLinkTitle}
                    onChange={(e) => setNewLinkTitle(e.target.value)}
                    className={styles.linkInput}
                  />
                  <input
                    type="text"
                    required
                    placeholder="URL (ex: github.com ou drive.google.com)"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    className={styles.linkInput}
                  />
                </div>
                <div className={styles.linkFormActions}>
                  <button
                    type="button"
                    onClick={() => setIsAddingLink(false)}
                    className={styles.linkCancelBtn}
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
              <div className={styles.attachmentsList}>
                {attachments.map((att) => (
                  <div key={att.id} className={styles.attachmentPill}>
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.attachmentLink}
                    >
                      <ExternalLink size={12} />
                      <span>{att.title}</span>
                    </a>
                    <button
                      onClick={() => handleDeleteAttachment(att.id)}
                      className={styles.attachmentDeleteBtn}
                      title="Remover anexo"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.attachmentEmpty}>
                Nenhum link ou arquivo anexado. Adicione URLs de artigos, repositórios ou vídeos de
                estudo.
              </p>
            )}
          </div>

          {/* Seção 3: Anotações Livres & Roteiro Detalhado da Tarefa (RF-6) */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionHeaderTitle}>
                <FileText size={16} color="var(--accent-primary)" />
                <h4 className={styles.sectionHeading}>Especificações & Anotações de Estudo</h4>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isSavedBanner && <span className={styles.savedToast}>✓ Salvo com sucesso!</span>}
                <button
                  onClick={handleSaveContent}
                  className={`btn-island btn-island-primary ${styles.saveRichContentBtn}`}
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
              className={styles.richContentTextarea}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
