import { create } from 'zustand';
import { apiClient } from '../services/apiClient'; // Assuming you have an api client

interface Snap {
  id: string;
  // Add other snap properties here based on your data model
  [key: string]: any;
}

interface SnapStore {
  snaps: Snap[];
  isLoading: boolean;
  error: string | null;
  fetchSnaps: () => Promise<void>;
}

export const useSnapStore = create<SnapStore>((set, get) => ({
  snaps: [],
  isLoading: false,
  error: null,
  fetchSnaps: async () => {
    // Prevent re-fetching if snaps are already loaded
    if (get().snaps.length > 0) {
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.get('/snaps'); // Adjust endpoint if needed
      set({ snaps: response.data.snaps || [], isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch snaps', isLoading: false });
    }
  },
}));
