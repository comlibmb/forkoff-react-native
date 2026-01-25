import { apiClient } from './api.client';
import { Project, ToolConfig, FileNode } from '@/types';
import { mockProjects } from '@/mocks/projects';

const USE_MOCKS = process.env.EXPO_PUBLIC_USE_MOCKS === 'true';

class ProjectService {
  async getProjects(): Promise<Project[]> {
    if (USE_MOCKS) {
      return mockProjects;
    }

    return apiClient.get<Project[]>('/projects');
  }

  async getProject(id: string): Promise<Project> {
    if (USE_MOCKS) {
      const project = mockProjects.find((p) => p.id === id);
      if (!project) {
        throw new Error('Project not found');
      }
      return project;
    }

    return apiClient.get<Project>(`/projects/${id}`);
  }

  async createProject(data: {
    name: string;
    path: string;
    deviceId: string;
    language?: string;
    framework?: string;
  }): Promise<Project> {
    if (USE_MOCKS) {
      return {
        id: `project-${Date.now()}`,
        name: data.name,
        path: data.path,
        language: data.language || 'typescript',
        framework: data.framework,
        lastModified: new Date().toISOString(),
        deviceId: data.deviceId,
        tools: [],
        terminals: [],
        servers: [],
      };
    }

    return apiClient.post<Project>('/projects', data);
  }

  async updateProject(id: string, data: Partial<Project>): Promise<Project> {
    if (USE_MOCKS) {
      const project = mockProjects.find((p) => p.id === id);
      if (!project) {
        throw new Error('Project not found');
      }
      return { ...project, ...data };
    }

    return apiClient.patch<Project>(`/projects/${id}`, data);
  }

  async deleteProject(id: string): Promise<void> {
    if (USE_MOCKS) {
      return;
    }

    await apiClient.delete(`/projects/${id}`);
  }

  async getFileTree(projectId: string, path = '/'): Promise<FileNode[]> {
    if (USE_MOCKS) {
      return [
        {
          name: 'src',
          path: '/src',
          type: 'directory',
          children: [
            { name: 'index.ts', path: '/src/index.ts', type: 'file', language: 'typescript' },
            { name: 'App.tsx', path: '/src/App.tsx', type: 'file', language: 'typescriptreact' },
            {
              name: 'components',
              path: '/src/components',
              type: 'directory',
              children: [
                { name: 'Button.tsx', path: '/src/components/Button.tsx', type: 'file', language: 'typescriptreact' },
              ],
            },
          ],
        },
        { name: 'package.json', path: '/package.json', type: 'file', language: 'json' },
        { name: 'tsconfig.json', path: '/tsconfig.json', type: 'file', language: 'json' },
        { name: 'README.md', path: '/README.md', type: 'file', language: 'markdown' },
      ];
    }

    return apiClient.get<FileNode[]>(`/projects/${projectId}/files`, {
      params: { path },
    });
  }

  async getFileContent(projectId: string, filePath: string): Promise<string> {
    if (USE_MOCKS) {
      return `// Mock content for ${filePath}\n\nexport const example = "Hello World";\n`;
    }

    const data = await apiClient.get<{ content: string }>(`/projects/${projectId}/files/content`, {
      params: { path: filePath },
    });
    return data.content;
  }

  async updateToolConfig(projectId: string, toolConfig: ToolConfig): Promise<Project> {
    if (USE_MOCKS) {
      const project = mockProjects.find((p) => p.id === projectId);
      if (!project) {
        throw new Error('Project not found');
      }
      // Initialize tools array if undefined
      if (!project.tools) {
        project.tools = [];
      }
      const toolIndex = project.tools.findIndex((t) => t.toolType === toolConfig.toolType);
      if (toolIndex >= 0) {
        project.tools[toolIndex] = toolConfig;
      } else {
        project.tools.push(toolConfig);
      }
      return project;
    }

    return apiClient.put<Project>(`/projects/${projectId}/tools`, toolConfig);
  }
}

export const projectService = new ProjectService();
export default projectService;
