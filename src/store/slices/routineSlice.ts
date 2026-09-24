import { StateCreator } from 'zustand';
import { FlowStore, RoutineType, Category } from '../../types/routine';
import { DEFAULT_ROUTINE_TYPES, DEFAULT_CATEGORIES } from '../../data/initialRoutine';

export interface RoutineSliceState {
  routineTypes: RoutineType[];
  selectedRoutineTypeId: string;
  categories: Category[];
  activeCategoryIdFilter: string | 'all';
}

export interface RoutineSliceActions {
  selectRoutineType: (id: string) => void;
  addRoutineType: (type: Omit<RoutineType, 'id'>) => void;
  updateRoutineType: (id: string, updates: Partial<RoutineType>) => void;
  deleteRoutineType: (id: string) => void;
  setCategoryIdFilter: (categoryId: string | 'all') => void;
  addCategory: (category: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
}

export type RoutineSlice = RoutineSliceState & RoutineSliceActions;

export const createRoutineSlice: StateCreator<FlowStore, [], [], RoutineSlice> = (set, get) => ({
  routineTypes: DEFAULT_ROUTINE_TYPES,
  selectedRoutineTypeId: 'main_routine',
  categories: DEFAULT_CATEGORIES,
  activeCategoryIdFilter: 'all',

  selectRoutineType: (id: string) => {
    set({ selectedRoutineTypeId: id });
  },

  addRoutineType: (typeData) => {
    const newType: RoutineType = {
      ...typeData,
      id: `type_${Date.now()}`,
    };
    set((state) => ({
      routineTypes: [...state.routineTypes, newType],
      selectedRoutineTypeId: newType.id,
    }));
  },

  updateRoutineType: (id: string, updates: Partial<RoutineType>) => {
    set((state) => ({
      routineTypes: state.routineTypes.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
  },

  deleteRoutineType: (id: string) => {
    const state = get();
    if (state.routineTypes.length <= 1) return;
    const typeToDelete = state.routineTypes.find((t) => t.id === id);
    const relatedTasks = state.tasks.filter((t) => t.routineTypeId === id);
    const previousSelected = state.selectedRoutineTypeId;

    set((state) => {
      const remaining = state.routineTypes.filter((t) => t.id !== id);
      return {
        routineTypes: remaining,
        selectedRoutineTypeId:
          state.selectedRoutineTypeId === id ? remaining[0].id : state.selectedRoutineTypeId,
        tasks: state.tasks.filter((t) => t.routineTypeId !== id),
      };
    });

    if (typeToDelete) {
      state.showSnackbar('Rotina excluída', () => {
        set((s) => ({
          routineTypes: [...s.routineTypes, typeToDelete],
          selectedRoutineTypeId: previousSelected,
          tasks: [...s.tasks, ...relatedTasks],
        }));
      });
    }
  },

  setCategoryIdFilter: (categoryId: string | 'all') => {
    set({ activeCategoryIdFilter: categoryId });
  },

  addCategory: (categoryData) => {
    const newCat: Category = {
      ...categoryData,
      id: `cat_${Date.now()}`,
    };
    set((state) => ({
      categories: [...state.categories, newCat],
    }));
  },

  updateCategory: (id: string, updates: Partial<Category>) => {
    set((state) => ({
      categories: state.categories.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }));
  },

  deleteCategory: (id: string) => {
    const state = get();
    if (state.categories.length <= 1) return;
    const catToDelete = state.categories.find((c) => c.id === id);
    const fallbackId = state.categories.filter((c) => c.id !== id)[0].id;
    const affectedTasks = state.tasks.filter((t) => t.categoryId === id);
    const prevFilter = state.activeCategoryIdFilter;

    set((state) => {
      const remaining = state.categories.filter((c) => c.id !== id);
      return {
        categories: remaining,
        activeCategoryIdFilter:
          state.activeCategoryIdFilter === id ? 'all' : state.activeCategoryIdFilter,
        tasks: state.tasks.map((t) => (t.categoryId === id ? { ...t, categoryId: fallbackId } : t)),
      };
    });

    if (catToDelete) {
      state.showSnackbar('Categoria excluída', () => {
        set((s) => ({
          categories: [...s.categories, catToDelete],
          activeCategoryIdFilter: prevFilter,
          tasks: s.tasks.map((t) => {
            if (affectedTasks.some((at) => at.id === t.id)) {
              return { ...t, categoryId: id };
            }
            return t;
          }),
        }));
      });
    }
  },
});
