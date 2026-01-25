import { Device } from '@/types';

export const mockDevices: Device[] = [
  {
    id: 'device-1',
    name: 'MacBook Pro',
    type: 'laptop',
    status: 'online',
    platform: 'macos',
    lastSeen: new Date().toISOString(),
    ipAddress: '192.168.1.100',
    userId: 'user-1',
    connectedTools: [
      {
        id: 'tool-1',
        type: 'cursor',
        name: 'Cursor',
        version: '0.42.0',
        status: 'active',
        lastActivity: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      },
      {
        id: 'tool-2',
        type: 'claude-terminal',
        name: 'Claude Terminal',
        version: '1.2.0',
        status: 'active',
        lastActivity: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: 'device-2',
    name: 'Home Desktop',
    type: 'desktop',
    status: 'offline',
    platform: 'windows',
    lastSeen: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    ipAddress: '192.168.1.101',
    userId: 'user-1',
    connectedTools: [
      {
        id: 'tool-3',
        type: 'copilot',
        name: 'GitHub Copilot',
        version: '1.150.0',
        status: 'inactive',
      },
      {
        id: 'tool-4',
        type: 'vscode',
        name: 'VS Code',
        version: '1.85.0',
        status: 'inactive',
      },
    ],
  },
  {
    id: 'device-3',
    name: 'Work Laptop',
    type: 'laptop',
    status: 'syncing',
    platform: 'linux',
    lastSeen: new Date().toISOString(),
    ipAddress: '10.0.0.50',
    userId: 'user-1',
    connectedTools: [
      {
        id: 'tool-5',
        type: 'cursor',
        name: 'Cursor',
        version: '0.42.0',
        status: 'active',
      },
    ],
  },
];

export default mockDevices;
