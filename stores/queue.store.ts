import { create } from 'zustand';
import { PromptQueueItem, QueueSchedule } from '@/types';
import { apiClient } from '@/services/api.client';
import { wsService } from '@/services/websocket.service';

interface QueueState {
  queueItems: PromptQueueItem[];
  schedule: QueueSchedule | null;
  pendingCount: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchQueue: (includeCompleted?: boolean) => Promise<void>;
  fetchSchedule: () => Promise<void>;
  updateSchedule: (data: Partial<QueueSchedule>) => Promise<void>;
  cancelItem: (itemId: string) => Promise<void>;
  reorderItem: (itemId: string, priority: number) => Promise<void>;
  executeNext: () => Promise<void>;
  executeItem: (itemId: string) => Promise<void>;
  updatePendingCount: (count: number) => void;
  addQueueItem: (item: PromptQueueItem) => void;
  updateQueueItem: (itemId: string, updates: Partial<PromptQueueItem>) => void;
  clearError: () => void;
}

export const useQueueStore = create<QueueState>((set, get) => ({
  queueItems: [],
  schedule: null,
  pendingCount: 0,
  isLoading: false,
  error: null,

  fetchQueue: async (includeCompleted = false) => {
    try {
      set({ isLoading: true, error: null });

      const url = includeCompleted
        ? '/queue?includeCompleted=true'
        : '/queue';

      const response = await apiClient.get<PromptQueueItem[]>(url);

      set({
        queueItems: response,
        pendingCount: response.filter((i) =>
          ['PENDING', 'SCHEDULED'].includes(i.status),
        ).length,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch queue',
      });
    }
  },

  fetchSchedule: async () => {
    try {
      const response = await apiClient.get<QueueSchedule>('/queue/schedule');
      set({ schedule: response });
    } catch (error) {
      console.error('Failed to fetch schedule:', error);
    }
  },

  updateSchedule: async (data) => {
    try {
      set({ isLoading: true, error: null });

      const response = await apiClient.patch<QueueSchedule>('/queue/schedule', data);

      set({
        schedule: response,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to update schedule',
      });
    }
  },

  cancelItem: async (itemId) => {
    try {
      await apiClient.delete(`/queue/${itemId}`);

      set((state) => ({
        queueItems: state.queueItems.map((i) =>
          i.id === itemId ? { ...i, status: 'CANCELLED' as const } : i,
        ),
        pendingCount: Math.max(0, state.pendingCount - 1),
      }));
    } catch (error) {
      console.error('Failed to cancel item:', error);
    }
  },

  reorderItem: async (itemId, priority) => {
    try {
      const response = await apiClient.patch<PromptQueueItem>(
        `/queue/${itemId}/priority`,
        { priority },
      );

      set((state) => ({
        queueItems: state.queueItems.map((i) =>
          i.id === itemId ? response : i,
        ),
      }));
    } catch (error) {
      console.error('Failed to reorder item:', error);
    }
  },

  executeNext: async () => {
    try {
      const response = await apiClient.post<{ success: boolean; item?: PromptQueueItem }>(
        '/queue/execute-next',
        {},
      );

      if (response.success && response.item) {
        set((state) => ({
          queueItems: state.queueItems.map((i) =>
            i.id === response.item!.id ? { ...i, status: 'EXECUTING' as const } : i,
          ),
        }));
      }
    } catch (error) {
      console.error('Failed to execute next:', error);
    }
  },

  executeItem: async (itemId) => {
    try {
      // Optimistically update local state
      set((state) => ({
        queueItems: state.queueItems.map((i) =>
          i.id === itemId ? { ...i, status: 'EXECUTING' as const } : i,
        ),
      }));

      // Emit WebSocket event with acknowledgment to get server response
      await wsService.emitWithAck('execute_queue_item', { queueItemId: itemId });
    } catch (error) {
      console.error('Failed to execute item:', error);
      // Revert optimistic update on error
      set((state) => ({
        queueItems: state.queueItems.map((i) =>
          i.id === itemId ? { ...i, status: 'PENDING' as const } : i,
        ),
        error: error instanceof Error ? error.message : 'Failed to execute queue item',
      }));
      // Re-fetch to ensure consistent state
      get().fetchQueue();
    }
  },

  updatePendingCount: (count) => {
    set({ pendingCount: count });
  },

  addQueueItem: (item) => {
    set((state) => ({
      queueItems: [item, ...state.queueItems],
      pendingCount: state.pendingCount + 1,
    }));
  },

  updateQueueItem: (itemId, updates) => {
    set((state) => {
      const newItems = state.queueItems.map((i) =>
        i.id === itemId ? { ...i, ...updates } : i,
      );

      const newPendingCount = newItems.filter((i) =>
        ['PENDING', 'SCHEDULED'].includes(i.status),
      ).length;

      return {
        queueItems: newItems,
        pendingCount: newPendingCount,
      };
    });
  },

  clearError: () => set({ error: null }),
}));

export default useQueueStore;
