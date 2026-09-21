'use client';

import React, { useState } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { Note } from '../types/routine';
import { sounds } from '../utils/audio';
import {
  FileText,
  Plus,
  Trash2,
  CalendarPlus,
  Search,
  Sparkles,
  Clock,
  ArrowRight,
  Tag,
  Check,
  X,
} from 'lucide-react';

export const NotepadView: React.FC = () => {
  const notes = useFlowStore((s) => s.notes);
  const routineTypes = useFlowStore((s) => s.routineTypes);
  const categories = useFlowStore((s) => s.categories);
  const selectedRoutineTypeId = useFlowStore((s) => s.selectedRoutineTypeId);

  const addNote = useFlowStore((s) => s.addNote);
  const updateNote = useFlowStore((s) => s.updateNote);
  const deleteNote = useFlowStore((s) => s.deleteNote);
  const convertNoteToTask = useFlowStore((s) => useFlowStore.getState().convertNoteToTask);

  const [selectedNoteId, setSelectedNoteId] = useState<string>(notes[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal para converter nota em tarefa agendada (RF-14)
  const [convertingNote, setConvertingNote] = useState<Note | null>(null);
  const [scheduleStart, setScheduleStart] = useState('14:00');
  const [scheduleEnd, setScheduleEnd] = useState('15:00');
  const [scheduleRoutineTypeId, setScheduleRoutineTypeId] = useState(selectedRoutineTypeId);
  const [scheduleCategoryId, setScheduleCategoryId] = useState(categories[0]?.id || '');

  // Nova nota
  const handleCreateNote = () => {
    const defaultColor = '#6366F1';
    addNote({
      title: 'Nova Anotação',
      content: '',
      tags: ['geral'],
      color: defaultColor,
    });
    sounds.playTick();
  };

  // Filtragem de notas
  const filteredNotes = notes.filter((n) => {
    const q = searchQuery.toLowerCase();
    return (
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      n.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const activeNote = notes.find((n) => n.id === selectedNoteId) || filteredNotes[0];

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertingNote) return;

    convertNoteToTask(
      convertingNote.id,
      scheduleStart,
      scheduleEnd,
      scheduleRoutineTypeId,
      scheduleCategoryId
    );

    sounds.playCheck();
    setConvertingNote(null);
  };

  const presetColors = ['#6366F1', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#0EA5E9', '#14B8A6'];

  return (
    <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header */}
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
            Bloco de Notas Livre (Notepad)
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Escreva planos, tópicos e ideias. Converta qualquer nota em tarefa na rotina com um clique (RF-8 e RF-14).
          </p>
        </div>

        <button
          onClick={handleCreateNote}
          className="btn-island btn-island-primary"
        >
          <span>Nova Anotação</span>
          <div className="btn-circle-icon">
            <Plus size={14} strokeWidth={2.6} />
          </div>
        </button>
      </div>

      {/* Main Workspace (Lista na lateral + Editor ao lado) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        {/* Painel Esquerdo: Lista de Notas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Busca */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              borderRadius: '10px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <Search size={14} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Buscar notas por título ou texto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '12px',
                outline: 'none',
              }}
            />
          </div>

          {/* Cards de Notas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '65vh', overflowY: 'auto' }}>
            {filteredNotes.length > 0 ? (
              filteredNotes.map((note) => {
                const isSelected = activeNote?.id === note.id;
                return (
                  <div
                    key={note.id}
                    onClick={() => setSelectedNoteId(note.id)}
                    className="double-bezel-outer"
                    style={{
                      cursor: 'pointer',
                      borderColor: isSelected ? note.color || 'var(--accent-primary)' : undefined,
                      transition: 'all 200ms ease',
                    }}
                  >
                    <div
                      className="double-bezel-inner"
                      style={{
                        padding: '14px 16px',
                        background: isSelected ? 'var(--bg-elevated)' : 'var(--bg-secondary)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: note.color || '#6366F1',
                            }}
                          />
                          <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {note.title || 'Sem título'}
                          </h4>
                        </div>

                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {new Date(note.updatedAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>

                      <p
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                          lineHeight: 1.4,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {note.content || 'Nenhum conteúdo escrito ainda...'}
                      </p>

                      {/* Botão de conversão rápida */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: '4px' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConvertingNote(note);
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-subtle)',
                            background: 'var(--bg-primary)',
                            color: 'var(--accent-primary)',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          <CalendarPlus size={11} />
                          <span>Agendar na Rotina</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                Nenhuma anotação encontrada.
              </div>
            )}
          </div>
        </div>

        {/* Painel Direito: Editor da Nota Ativa */}
        {activeNote ? (
          <div className="double-bezel-outer">
            <div
              className="double-bezel-inner"
              style={{
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              {/* Título & Ações */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <input
                  type="text"
                  value={activeNote.title}
                  onChange={(e) => updateNote(activeNote.id, { title: e.target.value })}
                  placeholder="Título da Anotação..."
                  style={{
                    fontSize: '18px',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    color: 'var(--text-primary)',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    width: '100%',
                  }}
                />

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {/* Botão Agendar */}
                  <button
                    onClick={() => setConvertingNote(activeNote)}
                    className="btn-island btn-island-primary"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                    title="Transformar esta nota em uma tarefa na rotina (RF-14)"
                  >
                    <span>Virar Tarefa</span>
                    <div className="btn-circle-icon">
                      <CalendarPlus size={12} strokeWidth={2.4} />
                    </div>
                  </button>

                  {/* Deletar Nota */}
                  <button
                    onClick={() => {
                      if (window.confirm(`Excluir anotação "${activeNote.title}"?`)) {
                        deleteNote(activeNote.id);
                      }
                    }}
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

              {/* Seletor de Cores da Nota */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Cor do Marcador:</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {presetColors.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => updateNote(activeNote.id, { color: col })}
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        backgroundColor: col,
                        border: activeNote.color === col ? '2px solid var(--text-primary)' : 'none',
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Editor de Texto Livre (Notion-Inspired) */}
              <textarea
                rows={16}
                value={activeNote.content}
                onChange={(e) => updateNote(activeNote.id, { content: e.target.value })}
                placeholder="Escreva livremente aqui: matérias para estudar, ideias de projetos, lista de compras, rascunhos de reuniões..."
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  fontFamily: 'var(--font-sans)',
                  lineHeight: 1.6,
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>
        ) : (
          <div
            className="double-bezel-outer"
            style={{ padding: '40px 20px', textAlign: 'center' }}
          >
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              Selecione uma nota ao lado ou crie uma nova.
            </p>
          </div>
        )}
      </div>

      {/* Modal: Agendar Nota como Tarefa na Rotina (RF-14) */}
      {convertingNote && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setConvertingNote(null)}
        >
          <div
            className="double-bezel-outer"
            style={{ width: '100%', maxWidth: '460px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="double-bezel-inner" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Transformar em Tarefa da Rotina</h3>
                <button
                  onClick={() => setConvertingNote(null)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  <X size={16} />
                </button>
              </div>

              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                A anotação &ldquo;<strong>{convertingNote.title}</strong>&rdquo; será inserida diretamente na sua linha do tempo de hoje.
              </p>

              <form onSubmit={handleScheduleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '6px' }}>
                      Horário Início
                    </label>
                    <input
                      type="time"
                      required
                      value={scheduleStart}
                      onChange={(e) => setScheduleStart(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
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
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '6px' }}>
                      Horário Fim
                    </label>
                    <input
                      type="time"
                      required
                      value={scheduleEnd}
                      onChange={(e) => setScheduleEnd(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '6px' }}>
                      Tipo de Rotina
                    </label>
                    <select
                      value={scheduleRoutineTypeId}
                      onChange={(e) => setScheduleRoutineTypeId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        outline: 'none',
                      }}
                    >
                      {routineTypes.map((rt) => (
                        <option key={rt.id} value={rt.id}>
                          {rt.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '6px' }}>
                      Categoria
                    </label>
                    <select
                      value={scheduleCategoryId}
                      onChange={(e) => setScheduleCategoryId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        outline: 'none',
                      }}
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setConvertingNote(null)}
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
                    <span>Agendar na Rotina</span>
                    <div className="btn-circle-icon">
                      <ArrowRight size={13} />
                    </div>
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
