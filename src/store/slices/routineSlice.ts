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

export const createRoutineSlice: StateCreator<FlowStore, [], [], RoutineSlice> = (set) => ({
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
    set((state) => {
      if (state.routineTypes.length <= 1) return state;
      const remaining = state.routineTypes.filter((t) => t.id !== id);
      return {
        routineTypes: remaining,
        selectedRoutineTypeId:
          state.selectedRoutineTypeId === id ? remaining[0].id : state.selectedRoutineTypeId,
        tasks: state.tasks.filter((t) => t.routineTypeId !== id),
      };
    });
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
    set((state) => {
      if (state.categories.length <= 1) return state;
      const remaining = state.categories.filter((c) => c.id !== id);
      const fallbackId = remaining[0].id;
      return {
        categories: remaining,
        activeCategoryIdFilter:
          state.activeCategoryIdFilter === id ? 'all' : state.activeCategoryIdFilter,
        tasks: state.tasks.map((t) => (t.categoryId === id ? { ...t, categoryId: fallbackId } : t)),
      };
    });
  },
});
