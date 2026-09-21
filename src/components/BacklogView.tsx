'use client';

import React, { useState } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { BacklogItem, TaskCategory } from '../types/routine';
import {
  Inbox,
  Plus,
  ArrowUpRight,
  Trash2,
  Clock,
  Tag,
  Code2,
  Sparkles,
  Calendar,
  X,
  Check,
} from 'lucide-react';

export const BacklogView: React.FC = () => {
  const backlog = useFlowStore((s) => s.backlog);
  const deleteBacklogItem = useFlowStore((s) => s.deleteBacklogItem);
  const addBacklogItem = useFlowStore((s) => s.addBacklogItem);
  const promoteBacklogToTask = useFlowStore((s) => s.promoteBacklogToTask);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [promotingItem, setPromotingItem] = useState<BacklogItem | null>(null);

  // Form states para nova pendência
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategory>('coding');
  const [targetMinutes, setTargetMinutes] = useState(45);

  // Form states para promover para hoje
  const [scheduleStart, setScheduleStart] = useState('15:00');
  const [scheduleEnd, setScheduleEnd] = useState('16:00');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addBacklogItem({
      title: title.trim(),
      description: description.trim(),
      category,
      targetMinutes: Number(targetMinutes) || 30,
      tags: [category],
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
    <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header & Actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Lista de Pendências (Backlog)
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Tarefas não concluídas ou ideias guardadas fora da rotina ativa (RF-11)
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="btn-island btn-island-primary"
        >
          <span>Nova Pendência</span>
          <div className="btn-circle-icon">
            <Plus size={14} strokeWidth={2.6} />
          </div>
        </button>
      </div>

      {/* Lista de itens do Backlog */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {backlog.length > 0 ? (
          backlog.map((item) => (
            <div key={item.id} className="double-bezel-outer">
              <div
                className="double-bezel-inner"
                style={{
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontSize: '10px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: 'var(--bg-elevated)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {item.category}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Criada em {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>
                    {item.title}
                  </h4>
                  {item.description && (
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {item.description}
                    </p>
                  )}
                </div>

                {/* Actions: Agendar para Hoje ou Deletar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => setPromotingItem(item)}
                    className="btn-island"
                    style={{
                      background: 'var(--accent-soft)',
                      color: 'var(--accent-primary)',
                      borderColor: 'transparent',
                    }}
                    title="Transformar esta pendência em uma tarefa ativa no dia de hoje"
                  >
                    <span>Puxar para Hoje</span>
                    <div className="btn-circle-icon" style={{ background: 'rgba(99, 102, 241, 0.15)' }}>
                      <ArrowUpRight size={13} strokeWidth={2.4} />
                    </div>
                  </button>

                  <button
                    onClick={() => deleteBacklogItem(item.id)}
                    title="Remover pendência"
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: '#EF4444',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="double-bezel-outer">
            <div
              className="double-bezel-inner"
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: 'var(--bg-elevated)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                }}
              >
                <Inbox size={22} />
              </div>
              <h4 style={{ fontSize: '15px', fontWeight: 700 }}>Seu backlog está limpo!</h4>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '380px' }}>
                Quando você não conseguir concluir uma tarefa do dia, você pode movê-la para cá sem culpa para realizar em outro momento.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modal Criar Pendência */}
      {isCreateOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setIsCreateOpen(false)}
        >
          <div
            className="double-bezel-outer"
            style={{ width: '100%', maxWidth: '480px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="double-bezel-inner" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Guardar Pendência no Backlog</h3>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                    Título da Pendência *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Atualizar resumo do LinkedIn com os novos projetos"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                    Descrição
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Detalhes ou links úteis..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      outline: 'none',
                      resize: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                      Categoria
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as TaskCategory)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '10px',
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        outline: 'none',
                      }}
                    >
                      <option value="coding">Programação</option>
                      <option value="routine">Rotina</option>
                      <option value="health">Saúde</option>
                      <option value="college">Faculdade</option>
                      <option value="creative">Arte & RPG</option>
                      <option value="career">Carreira</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                      Tempo Estimado (min)
                    </label>
                    <input
                      type="number"
                      value={targetMinutes}
                      onChange={(e) => setTargetMinutes(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '10px',
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '9999px',
                      border: '1px solid var(--border-subtle)',
                      background: 'transparent',
                      color: 'var(--text-secondary)',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
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
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setPromotingItem(null)}
        >
          <div
            className="double-bezel-outer"
            style={{ width: '100%', maxWidth: '440px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="double-bezel-inner" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '6px' }}>
                Agendar para a Rotina de Hoje
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Defina em qual horário você deseja encaixar &ldquo;{promotingItem.title}&rdquo;:
              </p>

              <form onSubmit={handlePromoteSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                      Início
                    </label>
                    <input
                      type="time"
                      required
                      value={scheduleStart}
                      onChange={(e) => setScheduleStart(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '10px',
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        fontFamily: 'var(--font-mono)',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                      Fim
                    </label>
                    <input
                      type="time"
                      required
                      value={scheduleEnd}
                      onChange={(e) => setScheduleEnd(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '10px',
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        fontFamily: 'var(--font-mono)',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setPromotingItem(null)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '9999px',
                      border: '1px solid var(--border-subtle)',
                      background: 'transparent',
                      color: 'var(--text-secondary)',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
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
