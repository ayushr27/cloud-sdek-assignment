import { create } from 'zustand';

interface LibraryStore {
  resourceCount: number;
  setResourceCount: (count: number) => void;
}

export const useLibraryStore = create<LibraryStore>()((set) => ({
  resourceCount: 0,
  setResourceCount: (count) => set({ resourceCount: count }),
}));
