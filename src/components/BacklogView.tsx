'use client';

import React, { useState } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { BacklogItem } from '../types/routine';
import { Inbox, Plus, ArrowUpRight, Trash2, X } from 'lucide-react';
import styles from './BacklogView.module.css';

export const BacklogView: React.FC = () => {
  const backlog = useFlowStore((s) => s.backlog);
  const categories = useFlowStore((s) => s.categories);
  const deleteBacklogItem = useFlowStore((s) => s.deleteBacklogItem);
  const addBacklogItem = useFlowStore((s) => s.addBacklogItem);
  const promoteBacklogToTask = useFlowStore((s) => s.promoteBacklogToTask);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [promotingItem, setPromotingItem] = useState<BacklogItem | null>(null);

  // Form states para nova pendência
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [targetMinutes, setTargetMinutes] = useState(45);

  // Form states para promover para hoje
  const [scheduleStart, setScheduleStart] = useState('15:00');
  const [scheduleEnd, setScheduleEnd] = useState('16:00');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const catObj = categories.find((c) => c.id === categoryId) || categories[0];

    addBacklogItem({
      title: title.trim(),
      description: description.trim(),
      categoryId: catObj?.id || 'focus',
      targetMinutes: Number(targetMinutes) || 30,
      tags: catObj ? [catObj.name] : [],
    });

    setTitle('');
    setDescription('');
    setIsCreateOpen(false);
  };

  const handlePromoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promotingItem) return;

    promoteBacklogToTask(promotingItem.id, scheduleStart, scheduleEnd);
    setPromotingItem(null);
  };

  return (
    <div className={styles.container}>
      {/* Top Header & Actions */}
      <div className={styles.headerRow}>
        <div>
          <h3 className={styles.headerTitle}>Lista de Pendências (Backlog)</h3>
          <p className={styles.headerSubtitle}>
            Tarefas não concluídas ou ideias guardadas fora da rotina ativa (RF-11)
          </p>
        </div>

        <button onClick={() => setIsCreateOpen(true)} className="btn-island btn-island-primary">
          <span>Nova Pendência</span>
          <div className="btn-circle-icon">
            <Plus size={14} strokeWidth={2.6} />
          </div>
        </button>
      </div>

      {/* Lista de itens do Backlog */}
      <div className={styles.backlogList}>
        {backlog.length > 0 ? (
          backlog.map((item) => (
            <div key={item.id} className="double-bezel-outer">
              <div className={`double-bezel-inner ${styles.itemInner}`}>
                <div className={styles.itemMain}>
                  <div className={styles.itemMetaRow}>
                    {(() => {
                      const itemCat = categories.find((c) => c.id === item.categoryId) || {
                        name: 'Geral',
                        color: '#6366F1',
                      };
                      return (
                        <span
                          className={styles.categoryBadge}
                          style={{
                            color: itemCat.color,
                            border: `1px solid ${itemCat.color}40`,
                          }}
                        >
                          {itemCat.name}
                        </span>
                      );
                    })()}
                    <span className={styles.itemCreatedDate}>
                      Criada em {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  <h4 className={styles.itemTitle}>{item.title}</h4>
                  {item.description && <p className={styles.itemDesc}>{item.description}</p>}
                </div>

                {/* Actions: Agendar para Hoje ou Deletar */}
                <div className={styles.itemActions}>
                  <button
                    onClick={() => setPromotingItem(item)}
                    className={`btn-island ${styles.promoteBtn}`}
                    title="Transformar esta pendência em uma tarefa ativa no dia de hoje"
                  >
                    <span>Puxar para Hoje</span>
                    <div className={`btn-circle-icon ${styles.promoteIconBox}`}>
                      <ArrowUpRight size={13} strokeWidth={2.4} />
                    </div>
                  </button>

                  <button
                    onClick={() => deleteBacklogItem(item.id)}
                    title="Remover pendência"
                    className={styles.deleteBtn}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="double-bezel-outer">
            <div className={`double-bezel-inner ${styles.emptyStateInner}`}>
              <div className={styles.emptyIconBox}>
                <Inbox size={22} />
              </div>
              <h4 className={styles.emptyTitle}>Seu backlog está limpo!</h4>
              <p className={styles.emptyDesc}>
                Quando você não conseguir concluir uma tarefa do dia, você pode movê-la para cá sem
                culpa para realizar em outro momento.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modal Criar Pendência */}
      {isCreateOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsCreateOpen(false)}>
          <div
            className={`double-bezel-outer ${styles.createModalOuter}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`double-bezel-inner ${styles.modalInner}`}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>Guardar Pendência no Backlog</h3>
                <button onClick={() => setIsCreateOpen(false)} className={styles.modalCloseBtn}>
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className={styles.modalForm}>
                <div>
                  <label className={styles.formLabel}>Título da Pendência *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Atualizar resumo do LinkedIn com os novos projetos"
                    className={styles.formInput}
                  />
                </div>

                <div>
                  <label className={styles.formLabel}>Descrição</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Detalhes ou links úteis..."
                    className={styles.formTextarea}
                  />
                </div>

                <div className={styles.formGrid2}>
                  <div>
                    <label className={styles.formLabel}>Categoria</label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className={styles.formSelect}
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={styles.formLabel}>Tempo Estimado (min)</label>
                    <input
                      type="number"
                      value={targetMinutes}
                      onChange={(e) => setTargetMinutes(Number(e.target.value))}
                      className={styles.formInput}
                    />
                  </div>
                </div>

                <div className={styles.modalFooter}>
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className={styles.cancelBtn}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn-island btn-island-primary">
                    Salvar no Backlog
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Promover para a Rotina de Hoje */}
      {promotingItem && (
        <div className={styles.modalOverlay} onClick={() => setPromotingItem(null)}>
          <div
            className={`double-bezel-outer ${styles.promoteModalOuter}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`double-bezel-inner ${styles.modalInner}`}>
              <h3 className={styles.modalTitle}>Agendar para a Rotina de Hoje</h3>
              <p className={styles.modalSubtitle}>
                Defina em qual horário você deseja encaixar &ldquo;{promotingItem.title}&rdquo;:
              </p>

              <form onSubmit={handlePromoteSubmit} className={styles.modalForm}>
                <div className={styles.formGrid2}>
                  <div>
                    <label className={styles.formLabel}>Início</label>
                    <input
                      type="time"
                      required
                      value={scheduleStart}
                      onChange={(e) => setScheduleStart(e.target.value)}
                      className={`${styles.formInput} ${styles.formInputTime}`}
                    />
                  </div>

                  <div>
                    <label className={styles.formLabel}>Fim</label>
                    <input
                      type="time"
                      required
                      value={scheduleEnd}
                      onChange={(e) => setScheduleEnd(e.target.value)}
                      className={`${styles.formInput} ${styles.formInputTime}`}
                    />
                  </div>
                </div>

                <div className={styles.modalFooter}>
                  <button
                    type="button"
                    onClick={() => setPromotingItem(null)}
                    className={styles.cancelBtn}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn-island btn-island-primary">
                    Encaixar na Rotina
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
