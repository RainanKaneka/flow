'use client';

import React, { useState } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { Note } from '../types/routine';
import { sounds } from '../utils/audio';
import { Plus, Trash2, CalendarPlus, Search, ArrowRight, X } from 'lucide-react';
import styles from './NotepadView.module.css';

export const NotepadView: React.FC = () => {
  const notes = useFlowStore((s) => s.notes);
  const routineTypes = useFlowStore((s) => s.routineTypes);
  const categories = useFlowStore((s) => s.categories);
  const selectedRoutineTypeId = useFlowStore((s) => s.selectedRoutineTypeId);

  const addNote = useFlowStore((s) => s.addNote);
  const updateNote = useFlowStore((s) => s.updateNote);
  const deleteNote = useFlowStore((s) => s.deleteNote);
  const convertNoteToTask = useFlowStore((s) => s.convertNoteToTask);

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

  const presetColors = [
    '#6366F1',
    '#10B981',
    '#F59E0B',
    '#8B5CF6',
    '#EC4899',
    '#0EA5E9',
    '#14B8A6',
  ];

  return (
    <div className={styles.container}>
      {/* Top Header */}
      <div className={styles.headerRow}>
        <div>
          <h3 className={styles.headerTitle}>Bloco de Notas Livre (Notepad)</h3>
          <p className={styles.headerSubtitle}>
            Escreva planos, tópicos e ideias. Converta qualquer nota em tarefa na rotina com um
            clique (RF-8 e RF-14).
          </p>
        </div>

        <button onClick={handleCreateNote} className="btn-island btn-island-primary">
          <span>Nova Anotação</span>
          <div className="btn-circle-icon">
            <Plus size={14} strokeWidth={2.6} />
          </div>
        </button>
      </div>

      {/* Main Workspace (Lista na lateral + Editor ao lado) */}
      <div className={styles.workspaceGrid}>
        {/* Painel Esquerdo: Lista de Notas */}
        <div className={styles.notesSidebar}>
          {/* Busca */}
          <div className={styles.searchBox}>
            <Search size={14} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Buscar notas por título ou texto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          {/* Cards de Notas */}
          <div className={styles.notesList}>
            {filteredNotes.length > 0 ? (
              filteredNotes.map((note) => {
                const isSelected = activeNote?.id === note.id;
                return (
                  <div
                    key={note.id}
                    onClick={() => setSelectedNoteId(note.id)}
                    className={`double-bezel-outer ${styles.noteCardOuter}`}
                    style={{
                      borderColor: isSelected ? note.color || 'var(--accent-primary)' : undefined,
                    }}
                  >
                    <div
                      className={`double-bezel-inner ${styles.noteCardInner}`}
                      style={{
                        background: isSelected ? 'var(--bg-elevated)' : 'var(--bg-secondary)',
                      }}
                    >
                      <div className={styles.noteCardHeader}>
                        <div className={styles.noteCardTitleGroup}>
                          <div
                            className={styles.noteCardDot}
                            style={{ backgroundColor: note.color || '#6366F1' }}
                          />
                          <h4 className={styles.noteCardTitle}>{note.title || 'Sem título'}</h4>
                        </div>

                        <span className={styles.noteCardDate}>
                          {new Date(note.updatedAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>

                      <p className={styles.noteCardExcerpt}>
                        {note.content || 'Nenhum conteúdo escrito ainda...'}
                      </p>

                      {/* Botão de conversão rápida */}
                      <div className={styles.noteCardActions}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConvertingNote(note);
                          }}
                          className={styles.quickScheduleBtn}
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
              <div className={styles.emptyList}>Nenhuma anotação encontrada.</div>
            )}
          </div>
        </div>

        {/* Painel Direito: Editor da Nota Ativa */}
        {activeNote ? (
          <div className="double-bezel-outer">
            <div className={`double-bezel-inner ${styles.editorInner}`}>
              {/* Título & Ações */}
              <div className={styles.editorHeader}>
                <input
                  type="text"
                  value={activeNote.title}
                  onChange={(e) => updateNote(activeNote.id, { title: e.target.value })}
                  placeholder="Título da Anotação..."
                  className={styles.editorTitleInput}
                />

                <div className={styles.editorActions}>
                  {/* Botão Agendar */}
                  <button
                    onClick={() => setConvertingNote(activeNote)}
                    className={`btn-island btn-island-primary ${styles.scheduleActionBtn}`}
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
                    className={styles.deleteNoteBtn}
                    title="Excluir anotação"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Seletor de Cores da Nota */}
              <div className={styles.colorRow}>
                <span className={styles.colorLabel}>Cor do Marcador:</span>
                <div className={styles.colorSwatches}>
                  {presetColors.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => updateNote(activeNote.id, { color: col })}
                      className={`${styles.colorSwatch} ${activeNote.color === col ? styles.colorSwatchActive : ''}`}
                      style={{ backgroundColor: col }}
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
                className={styles.editorTextarea}
              />
            </div>
          </div>
        ) : (
          <div className={`double-bezel-outer ${styles.emptyEditor}`}>
            <p className={styles.emptyEditorText}>Selecione uma nota ao lado ou crie uma nova.</p>
          </div>
        )}
      </div>

      {/* Modal: Agendar Nota como Tarefa na Rotina (RF-14) */}
      {convertingNote && (
        <div className={styles.modalOverlay} onClick={() => setConvertingNote(null)}>
          <div
            className={`double-bezel-outer ${styles.modalOuter}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`double-bezel-inner ${styles.modalInner}`}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>Transformar em Tarefa da Rotina</h3>
                <button onClick={() => setConvertingNote(null)} className={styles.modalCloseBtn}>
                  <X size={16} />
                </button>
              </div>

              <p className={styles.modalDesc}>
                A anotação &ldquo;<strong>{convertingNote.title}</strong>&rdquo; será inserida
                diretamente na sua linha do tempo de hoje.
              </p>

              <form onSubmit={handleScheduleSubmit} className={styles.modalForm}>
                <div className={styles.formGrid2}>
                  <div>
                    <label className={styles.formLabel}>Horário Início</label>
                    <input
                      type="time"
                      required
                      value={scheduleStart}
                      onChange={(e) => setScheduleStart(e.target.value)}
                      className={styles.formInput}
                    />
                  </div>

                  <div>
                    <label className={styles.formLabel}>Horário Fim</label>
                    <input
                      type="time"
                      required
                      value={scheduleEnd}
                      onChange={(e) => setScheduleEnd(e.target.value)}
                      className={styles.formInput}
                    />
                  </div>
                </div>

                <div className={styles.formGrid2}>
                  <div>
                    <label className={styles.formLabel}>Tipo de Rotina</label>
                    <select
                      value={scheduleRoutineTypeId}
                      onChange={(e) => setScheduleRoutineTypeId(e.target.value)}
                      className={styles.formSelect}
                    >
                      {routineTypes.map((rt) => (
                        <option key={rt.id} value={rt.id}>
                          {rt.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={styles.formLabel}>Categoria</label>
                    <select
                      value={scheduleCategoryId}
                      onChange={(e) => setScheduleCategoryId(e.target.value)}
                      className={styles.formSelect}
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={styles.modalFooter}>
                  <button
                    type="button"
                    onClick={() => setConvertingNote(null)}
                    className={styles.cancelBtn}
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
