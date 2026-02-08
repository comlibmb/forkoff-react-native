import { create } from 'zustand';
import { wsService, TranscriptEntry } from '@/services/websocket.service';

interface TaskItem {
  id: string;
  subject: string;
  status: 'pending' | 'in_progress' | 'completed';
  activeForm?: string;
}

interface ProjectHubData {
  claudeMd: string | null;
  claudeMdExists: boolean;
  lastEntries: TranscriptEntry[];
  tasks: TaskItem[];
  fetchedAt: number;
}

interface ProjectHubState {
  // Per-project cache keyed by "deviceId:directory"
  cache: Map<string, ProjectHubData>;

  // Independent loading states
  claudeMdLoading: boolean;
  previewLoading: boolean;

  // Actions
  fetchClaudeMd: (deviceId: string, directory: string) => void;
  fetchLastActivity: (deviceId: string, sessionKey: string, transcriptPath: string) => void;
  extractTasks: (entries: TranscriptEntry[]) => TaskItem[];
  getCacheKey: (deviceId: string, directory: string) => string;
  getCachedData: (deviceId: string, directory: string) => ProjectHubData | null;
  clearCache: (deviceId: string, directory: string) => void;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const useProjectHubStore = create<ProjectHubState>((set, get) => ({
  cache: new Map(),
  claudeMdLoading: false,
  previewLoading: false,

  getCacheKey: (deviceId: string, directory: string) => `${deviceId}:${directory}`,

  getCachedData: (deviceId: string, directory: string) => {
    const key = get().getCacheKey(deviceId, directory);
    const data = get().cache.get(key);
    if (!data) return null;

    // Check TTL
    if (Date.now() - data.fetchedAt > CACHE_TTL) {
      return null; // Expired
    }
    return data;
  },

  clearCache: (deviceId: string, directory: string) => {
    const key = get().getCacheKey(deviceId, directory);
    set((state) => {
      const newCache = new Map(state.cache);
      newCache.delete(key);
      return { cache: newCache };
    });
  },

  fetchClaudeMd: (deviceId: string, directory: string) => {
    const key = get().getCacheKey(deviceId, directory);

    // Check cache first
    const cached = get().cache.get(key);
    if (cached && cached.claudeMd !== null && Date.now() - cached.fetchedAt < CACHE_TTL) {
      return; // Use cache
    }

    set({ claudeMdLoading: true });

    const requestId = `read-file-${Date.now()}`;
    const filePath = directory.replace(/\/$/, '') + '/CLAUDE.md';

    // Listen for response
    const unsub = wsService.on('read_file_response', (data) => {
      if (data.requestId !== requestId) return;
      unsub();

      set((state) => {
        const newCache = new Map(state.cache);
        const existing = newCache.get(key) || {
          claudeMd: null,
          claudeMdExists: false,
          lastEntries: [],
          tasks: [],
          fetchedAt: Date.now(),
        };

        newCache.set(key, {
          ...existing,
          claudeMd: data.content || null,
          claudeMdExists: data.exists,
          fetchedAt: Date.now(),
        });

        return { cache: newCache, claudeMdLoading: false };
      });
    });

    // Emit request
    wsService.readFile(deviceId, filePath, requestId);

    // Timeout fallback
    setTimeout(() => {
      unsub();
      set({ claudeMdLoading: false });
    }, 10000);
  },

  fetchLastActivity: (deviceId: string, sessionKey: string, transcriptPath: string) => {
    const key = `${deviceId}:${sessionKey}`;
    set({ previewLoading: true });

    // Use existing transcript_fetch to get last 5 entries
    const unsub = wsService.on('transcript_history', (data) => {
      if (data.sessionKey !== sessionKey) return;
      unsub();

      const extractedTasks = get().extractTasks(data.entries);

      // We need to find the directory for caching - use entries to update the nearest cache
      // Store activity by sessionKey as secondary key
      set((state) => {
        // Update all caches that might reference this session
        const newCache = new Map(state.cache);

        // Also store under a session-specific key for easy lookup
        const sessionCacheKey = `${deviceId}:session:${sessionKey}`;
        newCache.set(sessionCacheKey, {
          claudeMd: null,
          claudeMdExists: false,
          lastEntries: data.entries,
          tasks: extractedTasks,
          fetchedAt: Date.now(),
        });

        return { cache: newCache, previewLoading: false };
      });
    });

    wsService.emit('transcript_fetch', {
      deviceId,
      sessionKey,
      transcriptPath,
      offset: 0,
      limit: 5,
      reverse: true,
    });

    // Timeout fallback
    setTimeout(() => {
      unsub();
      set({ previewLoading: false });
    }, 10000);
  },

  extractTasks: (entries: TranscriptEntry[]): TaskItem[] => {
    const tasksMap = new Map<string, TaskItem>();

    for (const entry of entries) {
      if (entry.type !== 'tool_use' && entry.type !== 'tool_result') continue;

      const toolName = entry.content?.toolName;
      const toolInput = entry.content?.toolInput;
      if (!toolInput) continue;

      if (toolName === 'TaskCreate') {
        const id = toolInput.id || `task-${entry.id}`;
        tasksMap.set(id, {
          id,
          subject: toolInput.subject || 'Untitled task',
          status: 'pending',
          activeForm: toolInput.activeForm,
        });
      } else if (toolName === 'TaskUpdate') {
        const id = toolInput.taskId || toolInput.id;
        if (id && tasksMap.has(id)) {
          const existing = tasksMap.get(id)!;
          tasksMap.set(id, {
            ...existing,
            status: toolInput.status || existing.status,
            subject: toolInput.subject || existing.subject,
          });
        } else if (id) {
          tasksMap.set(id, {
            id,
            subject: toolInput.subject || 'Task',
            status: toolInput.status || 'pending',
          });
        }
      }
    }

    return Array.from(tasksMap.values());
  },
}));

export default useProjectHubStore;
