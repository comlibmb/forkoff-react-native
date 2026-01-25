import { apiClient } from './api.client';
import { GitHubRepo, GitHubBranch, GitHubUser } from '@/types';
import { mockGitHubRepos, mockGitHubUser } from '@/mocks/github';

const USE_MOCKS = process.env.EXPO_PUBLIC_USE_MOCKS === 'true';

class GitHubService {
  async getUser(): Promise<GitHubUser> {
    if (USE_MOCKS) {
      return mockGitHubUser;
    }

    return apiClient.get<GitHubUser>('/github/user');
  }

  async getRepositories(): Promise<GitHubRepo[]> {
    if (USE_MOCKS) {
      return mockGitHubRepos;
    }

    return apiClient.get<GitHubRepo[]>('/github/repos');
  }

  async getRepository(owner: string, repo: string): Promise<GitHubRepo> {
    if (USE_MOCKS) {
      const foundRepo = mockGitHubRepos.find((r) => r.fullName === `${owner}/${repo}`);
      if (!foundRepo) {
        throw new Error('Repository not found');
      }
      return foundRepo;
    }

    return apiClient.get<GitHubRepo>(`/github/repos/${owner}/${repo}`);
  }

  async getBranches(owner: string, repo: string): Promise<GitHubBranch[]> {
    if (USE_MOCKS) {
      return [
        { name: 'main', commit: 'abc123', protected: true },
        { name: 'develop', commit: 'def456', protected: false },
        { name: 'feature/new-feature', commit: 'ghi789', protected: false },
      ];
    }

    return apiClient.get<GitHubBranch[]>(`/github/repos/${owner}/${repo}/branches`);
  }

  async createRepository(data: {
    name: string;
    description?: string;
    private?: boolean;
    autoInit?: boolean;
  }): Promise<GitHubRepo> {
    if (USE_MOCKS) {
      return {
        id: Date.now(),
        name: data.name,
        fullName: `mockuser/${data.name}`,
        description: data.description,
        private: data.private || false,
        defaultBranch: 'main',
        url: `https://github.com/mockuser/${data.name}`,
        cloneUrl: `https://github.com/mockuser/${data.name}.git`,
        stars: 0,
        forks: 0,
        updatedAt: new Date().toISOString(),
      };
    }

    return apiClient.post<GitHubRepo>('/github/repos', data);
  }

  async cloneRepository(
    repoUrl: string,
    deviceId: string,
    targetPath: string,
    branch?: string
  ): Promise<{ projectId: string }> {
    if (USE_MOCKS) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return { projectId: `project-${Date.now()}` };
    }

    return apiClient.post<{ projectId: string }>('/github/clone', {
      repoUrl,
      deviceId,
      targetPath,
      branch,
    });
  }

  async isConnected(): Promise<boolean> {
    if (USE_MOCKS) {
      return true;
    }

    try {
      await this.getUser();
      return true;
    } catch {
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (USE_MOCKS) {
      return;
    }

    await apiClient.delete('/github/connection');
  }
}

export const githubService = new GitHubService();
export default githubService;
