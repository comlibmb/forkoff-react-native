import { create } from 'zustand';
import { Project, ToolConfig, FileNode } from '@/types';
import { projectService } from '@/services/project.service';
import { analyticsService } from '@/services/analytics.service';
import { sentryService } from '@/services/sentry.service';
import { useUsageStore } from './usage.store';

interface ProjectState {
  projects: Project[];
  selectedProjectId: string | null;
  fileTree: Record<string, FileNode[]>;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchProjects: () => Promise<void>;
  getProject: (id: string) => Project | undefined;
  selectProject: (id: string | null) => void;
  createProject: (data: {
    name: string;
    path: string;
    deviceId: string;
    language?: string;
    framework?: string;
  }) => Promise<Project>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  fetchFileTree: (projectId: string, path?: string) => Promise<FileNode[]>;
  updateToolConfig: (projectId: string, toolConfig: ToolConfig) => Promise<void>;
  clearError: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  selectedProjectId: null,
  fileTree: {},
  isLoading: false,
  error: null,

  fetchProjects: async () => {
    try {
      set({ isLoading: true, error: null });

      const projects = await projectService.getProjects();

      analyticsService.track('projects_fetched', {
        projectCount: projects.length,
      });

      set({
        projects,
        isLoading: false,
      });
    } catch (error) {
      sentryService.captureException(error, { context: 'fetch_projects' });
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch projects',
      });
    }
  },

  getProject: (id) => {
    return get().projects.find((p) => p.id === id);
  },

  selectProject: (id) => {
    set({ selectedProjectId: id });
  },

  createProject: async (data) => {
    try {
      // Check project limit
      const { canAddProject, setActiveProjectCount, activeProjectCount } = useUsageStore.getState();
      if (!canAddProject()) {
        const error = new Error('PROJECT_LIMIT_REACHED');
        set({ error: error.message });
        throw error;
      }

      set({ isLoading: true, error: null });

      const project = await projectService.createProject(data);

      // Update project count
      setActiveProjectCount(activeProjectCount + 1);

      analyticsService.track('project_created', {
        projectId: project.id,
        projectName: project.name,
        deviceId: data.deviceId,
        language: data.language,
        framework: data.framework,
      });

      sentryService.addBreadcrumb('Project created', 'project', {
        projectId: project.id,
        projectName: project.name,
      });

      set((state) => ({
        projects: [...state.projects, project],
        isLoading: false,
      }));

      return project;
    } catch (error) {
      sentryService.captureException(error, { context: 'create_project', ...data });
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to create project',
      });
      throw error;
    }
  },

  updateProject: async (id, data) => {
    try {
      set({ isLoading: true, error: null });

      const updatedProject = await projectService.updateProject(id, data);

      set((state) => ({
        projects: state.projects.map((p) => (p.id === id ? updatedProject : p)),
        isLoading: false,
      }));
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to update project',
      });
      throw error;
    }
  },

  deleteProject: async (id) => {
    try {
      set({ isLoading: true, error: null });

      await projectService.deleteProject(id);

      analyticsService.track('project_deleted', {
        projectId: id,
      });

      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        selectedProjectId: state.selectedProjectId === id ? null : state.selectedProjectId,
        isLoading: false,
      }));
    } catch (error) {
      sentryService.captureException(error, { context: 'delete_project', projectId: id });
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to delete project',
      });
      throw error;
    }
  },

  fetchFileTree: async (projectId, path = '/') => {
    try {
      const fileTree = await projectService.getFileTree(projectId, path);

      set((state) => ({
        fileTree: {
          ...state.fileTree,
          [projectId]: fileTree,
        },
      }));

      return fileTree;
    } catch (error) {
      console.error('Failed to fetch file tree:', error);
      return [];
    }
  },

  updateToolConfig: async (projectId, toolConfig) => {
    try {
      set({ isLoading: true, error: null });

      const updatedProject = await projectService.updateToolConfig(projectId, toolConfig);

      set((state) => ({
        projects: state.projects.map((p) => (p.id === projectId ? updatedProject : p)),
        isLoading: false,
      }));
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to update tool config',
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));

export default useProjectStore;
