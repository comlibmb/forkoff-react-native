import AsyncStorage from '@react-native-async-storage/async-storage';
import { Project, ToolConfig, FileNode } from '@/types';

const PROJECTS_KEY = '@forkoff/projects';

class ProjectService {
  private async loadProjects(): Promise<Project[]> {
    try {
      const raw = await AsyncStorage.getItem(PROJECTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private async saveProjects(projects: Project[]): Promise<void> {
    await AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  }

  async getProjects(): Promise<Project[]> {
    return this.loadProjects();
  }

  async getProject(id: string): Promise<Project> {
    const projects = await this.loadProjects();
    const project = projects.find((p) => p.id === id);
    if (!project) {
      throw new Error('Project not found');
    }
    return project;
  }

  async createProject(data: {
    name: string;
    path: string;
    deviceId: string;
    language?: string;
    framework?: string;
  }): Promise<Project> {
    const project: Project = {
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

    const projects = await this.loadProjects();
    projects.push(project);
    await this.saveProjects(projects);

    return project;
  }

  async updateProject(id: string, data: Partial<Project>): Promise<Project> {
    const projects = await this.loadProjects();
    const index = projects.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new Error('Project not found');
    }

    projects[index] = { ...projects[index], ...data };
    await this.saveProjects(projects);

    return projects[index];
  }

  async deleteProject(id: string): Promise<void> {
    const projects = await this.loadProjects();
    await this.saveProjects(projects.filter((p) => p.id !== id));
  }

  async getFileTree(_projectId: string, _path = '/'): Promise<FileNode[]> {
    // File tree is fetched via WebSocket (read_file / directory_list events)
    return [];
  }

  async getFileContent(_projectId: string, _filePath: string): Promise<string> {
    // File content is fetched via WebSocket (read_file events)
    return '';
  }

  async updateToolConfig(projectId: string, toolConfig: ToolConfig): Promise<Project> {
    const projects = await this.loadProjects();
    const index = projects.findIndex((p) => p.id === projectId);
    if (index === -1) {
      throw new Error('Project not found');
    }

    const project = projects[index];
    if (!project.tools) {
      project.tools = [];
    }

    const toolIndex = project.tools.findIndex((t) => t.toolType === toolConfig.toolType);
    if (toolIndex >= 0) {
      project.tools[toolIndex] = toolConfig;
    } else {
      project.tools.push(toolConfig);
    }

    await this.saveProjects(projects);
    return project;
  }
}

export const projectService = new ProjectService();
export default projectService;
