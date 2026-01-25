import { ChatSession, ChatMessage } from '@/types';

export const mockChatSessions: ChatSession[] = [
  {
    id: 'session-1',
    projectId: 'project-1',
    toolType: 'cursor',
    tool: 'cursor',
    title: 'Implement auth flow',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [],
    lastMessage: 'Can you also add the login screen component?',
    unreadCount: 1,
    hasPendingApproval: true,
  },
  {
    id: 'session-2',
    projectId: 'project-1',
    toolType: 'claude-terminal',
    tool: 'claude-terminal',
    title: 'Fix navigation bug',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    messages: [],
    lastMessage: 'I see the issue. The crash is happening because...',
    unreadCount: 0,
    hasPendingApproval: false,
  },
  {
    id: 'session-3',
    projectId: 'project-2',
    toolType: 'copilot',
    tool: 'copilot',
    title: 'Add API endpoints',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    messages: [],
    lastMessage: 'Created 5 new API endpoints for user management',
    unreadCount: 0,
    hasPendingApproval: false,
  },
];

export const mockChatMessages: ChatMessage[] = [
  {
    id: 'msg-1',
    sessionId: 'session-1',
    role: 'user',
    content: 'Can you help me implement the authentication flow using Supabase?',
    status: 'complete',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'msg-2',
    sessionId: 'session-1',
    role: 'assistant',
    content: `I'll help you implement authentication with Supabase. Let me create the auth service and related hooks.

First, I'll set up the Supabase client and auth service:`,
    status: 'complete',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 + 30000).toISOString(),
    codeChanges: [
      {
        id: 'change-1',
        filePath: 'services/auth.service.ts',
        language: 'typescript',
        oldContent: '',
        newContent: `import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export const authService = {
  signIn: async (email: string, password: string) => {
    return supabase.auth.signInWithPassword({ email, password });
  },
  signUp: async (email: string, password: string) => {
    return supabase.auth.signUp({ email, password });
  },
  signOut: async () => {
    return supabase.auth.signOut();
  },
};`,
        status: 'approved',
      },
    ],
  },
  {
    id: 'msg-3',
    sessionId: 'session-1',
    role: 'user',
    content: 'Looks good! Can you also add the login screen component?',
    status: 'complete',
    timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'msg-4',
    sessionId: 'session-1',
    role: 'assistant',
    content: `I'll create a login screen with email and password fields, along with proper validation.`,
    status: 'complete',
    timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000 + 20000).toISOString(),
    approvalRequest: {
      id: 'approval-1',
      type: 'file_creation',
      description: 'Create login screen component',
      changes: [
        {
          id: 'change-2',
          filePath: 'app/(auth)/login.tsx',
          language: 'typescriptreact',
          oldContent: '',
          newContent: `import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useState } from 'react';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <View className="flex-1 justify-center p-6">
      <Text className="text-3xl font-bold mb-8">Welcome Back</Text>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        className="border p-4 rounded-lg mb-4"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        className="border p-4 rounded-lg mb-6"
      />
      <TouchableOpacity className="bg-primary-500 p-4 rounded-lg">
        <Text className="text-white text-center font-semibold">Sign In</Text>
      </TouchableOpacity>
    </View>
  );
}`,
          status: 'pending',
        },
      ],
      status: 'pending',
      requestedAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000 + 25000).toISOString(),
    },
  },
  {
    id: 'msg-5',
    sessionId: 'session-2',
    role: 'user',
    content: 'The navigation is crashing when going back from the details screen',
    status: 'complete',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'msg-6',
    sessionId: 'session-2',
    role: 'assistant',
    content: `I see the issue. The crash is happening because the navigation state isn't being properly reset. Let me fix this by adding proper cleanup in the useEffect.`,
    status: 'complete',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000 + 45000).toISOString(),
    codeChanges: [
      {
        id: 'change-3',
        filePath: 'app/device/[id].tsx',
        language: 'typescriptreact',
        oldContent: `useEffect(() => {
  loadDeviceData();
}, [id]);`,
        newContent: `useEffect(() => {
  loadDeviceData();
  return () => {
    // Cleanup subscription on unmount
    unsubscribeFromDevice();
  };
}, [id]);`,
        status: 'approved',
      },
    ],
  },
];

export default { mockChatSessions, mockChatMessages };
