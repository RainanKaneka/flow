import { StateCreator } from 'zustand';
import { FlowStore, Note, Task } from '../../types/routine';

export interface NotesSliceState {
  notes: Note[];
}

export interface NotesSliceActions {
  addNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateNote: (id: string, updates: Partial<Omit<Note, 'id' | 'createdAt'>>) => void;
  deleteNote: (id: string) => void;
  convertNoteToTask: (
    noteId: string,
    startTime: string,
    endTime: string,
    routineTypeId?: string,
    categoryId?: string
  ) => void;
}

export type NotesSlice = NotesSliceState & NotesSliceActions;

export const createNotesSlice: StateCreator<FlowStore, [], [], NotesSlice> = (set, get) => ({
  notes: [
    {
      id: 'welcome_note',
      title: 'Boas-vindas ao seu Bloco de Notas!',
      content:
        'Este é seu espaço livre para rascunhar ideias, projetos, matérias de estudo ou anotações rápidas.\n\n💡 Dica de ouro: quando uma anotação estiver pronta para ser executada, basta clicar no botão "Transformar em Tarefa" para agendá-la diretamente na sua rotina do dia!',
      tags: ['tutorial', 'início'],
      color: '#6366F1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],

  addNote: (noteData) => {
    const now = new Date().toISOString();
    const newNote: Note = {
      ...noteData,
      id: `note_${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({
      notes: [newNote, ...state.notes],
    }));
  },

  updateNote: (id, updates) => {
    set((state) => ({
      notes: state.notes.map((n) =>
        n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n
      ),
    }));
  },

  deleteNote: (id) => {
    const state = get();
    const noteToDelete = state.notes.find((n) => n.id === id);

    set((state) => ({
      notes: state.notes.filter((n) => n.id !== id),
    }));

    if (noteToDelete) {
      state.showSnackbar('Anotação excluída', () => {
        set((s) => ({ notes: [noteToDelete, ...s.notes] }));
      });
    }
  },

  convertNoteToTask: (noteId, startTime, endTime, routineTypeId, categoryId) => {
    const state = get();
    const note = state.notes.find((n) => n.id === noteId);
    if (!note) return;

    const targetTypeId =
      (routineTypeId && state.routineTypes.some((r) => r.id === routineTypeId) ? routineTypeId : null) ||
      (state.selectedRoutineTypeId && state.routineTypes.some((r) => r.id === state.selectedRoutineTypeId) ? state.selectedRoutineTypeId : null) ||
      state.routineTypes[0]?.id ||
      'main_routine';

    const targetCatId =
      (categoryId && state.categories.some((c) => c.id === categoryId) ? categoryId : null) ||
      state.categories[0]?.id ||
      'geral';

    const [y, m, d] = state.selectedDate.split('-').map(Number);
    const dayOfWeek = new Date(y, m - 1, d).getDay();

    const [h1, m1] = startTime.split(':').map(Number);
    const [h2, m2] = endTime.split(':').map(Number);
    let targetMins = h2 * 60 + m2 - (h1 * 60 + m1);
    if (targetMins <= 0) targetMins = 30;

    const newTask: Task = {
      id: `task_${Date.now()}`,
      title: note.title,
      description: note.content.slice(0, 140) + (note.content.length > 140 ? '...' : ''),
      richContent: note.content,
      startTime,
      endTime,
      routineTypeId: targetTypeId,
      categoryId: targetCatId,
      daysOfWeek: [dayOfWeek],
      targetMinutes: targetMins,
      tags: note.tags.length > 0 ? note.tags : ['Do Bloco de Notas'],
      isCustom: true,
    };

    set({
      tasks: [...state.tasks, newTask],
      activeView: 'routine',
    });
  },
});
