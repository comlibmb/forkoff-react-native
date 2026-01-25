import { Project } from '@/types';

export const mockProjects: Project[] = [
  {
    id: 'project-1',
    name: 'forkoff-mobile',
    path: '/Users/dev/projects/forkoff-mobile',
    language: 'typescript',
    framework: 'react-native',
    lastModified: new Date().toISOString(),
    deviceId: 'device-1',
    tools: [
      { toolType: 'cursor', enabled: true, settings: {} },
      { toolType: 'claude-terminal', enabled: true, settings: { autoApprove: false } },
    ],
    terminals: [
      {
        id: 'term-1',
        projectId: 'project-1',
        deviceId: 'device-1',
        name: 'Metro',
        cwd: '/Users/dev/projects/forkoff-mobile',
        isActive: true,
        output: [
          {
            id: 'line-1',
            content: 'Metro waiting on exp://192.168.1.100:8081',
            type: 'output',
            timestamp: new Date().toISOString(),
          },
        ],
      },
    ],
    servers: [
      {
        id: 'server-1',
        projectId: 'project-1',
        name: 'Expo Dev Server',
        type: 'dev',
        port: 8081,
        status: 'running',
        url: 'http://localhost:8081',
        logs: [],
        startedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: 'project-2',
    name: 'api-backend',
    path: '/Users/dev/projects/api-backend',
    language: 'typescript',
    framework: 'nestjs',
    lastModified: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    deviceId: 'device-1',
    tools: [
      { toolType: 'copilot', enabled: true, settings: {} },
    ],
    terminals: [],
    servers: [
      {
        id: 'server-2',
        projectId: 'project-2',
        name: 'API Server',
        type: 'dev',
        port: 3000,
        status: 'stopped',
        logs: [],
      },
    ],
  },
  {
    id: 'project-3',
    name: 'landing-page',
    path: '/Users/dev/projects/landing-page',
    language: 'typescript',
    framework: 'nextjs',
    lastModified: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    deviceId: 'device-2',
    tools: [
      { toolType: 'cursor', enabled: true, settings: {} },
    ],
    terminals: [],
    servers: [],
  },
  {
    id: 'project-4',
    name: 'ml-pipeline',
    path: '/home/dev/ml-pipeline',
    language: 'python',
    framework: 'pytorch',
    lastModified: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    deviceId: 'device-3',
    tools: [
      { toolType: 'claude-terminal', enabled: true, settings: {} },
    ],
    terminals: [],
    servers: [],
  },
  {
    id: 'project-5',
    name: 'rust-cli-tool',
    path: '/Users/dev/rust/cli-tool',
    language: 'rust',
    lastModified: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    deviceId: 'device-1',
    tools: [],
    terminals: [],
    servers: [],
  },
];

export default mockProjects;
