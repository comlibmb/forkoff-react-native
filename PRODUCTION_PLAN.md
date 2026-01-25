# ForkOff Production Implementation Plan

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLOUD INFRASTRUCTURE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │   Supabase      │    │  Node.js API    │    │  WebSocket      │         │
│  │   - Auth        │◄──►│  (Railway)      │◄──►│  Server         │         │
│  │   - PostgreSQL  │    │  - REST API     │    │  (Socket.io)    │         │
│  │   - Storage     │    │  - Business     │    │  - Real-time    │         │
│  │                 │    │    Logic        │    │    Events       │         │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘         │
│           │                      │                      │                   │
│           └──────────────────────┼──────────────────────┘                   │
│                                  │                                          │
└──────────────────────────────────┼──────────────────────────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
        ┌───────────▼───────────┐     ┌──────────▼──────────┐
        │    Mobile App         │     │   Desktop Companion  │
        │    (React Native)     │     │   (CLI + Electron)   │
        │                       │     │                      │
        │  - Device monitoring  │     │  - Tool integration  │
        │  - Chat relay         │     │  - File system       │
        │  - Approvals          │     │  - Terminal access   │
        │  - Notifications      │     │  - Project scanning  │
        └───────────────────────┘     └──────────────────────┘
                                               │
                              ┌────────────────┼────────────────┐
                              │                │                │
                      ┌───────▼──────┐ ┌──────▼──────┐ ┌───────▼──────┐
                      │ Claude Code  │ │   Cursor    │ │   Copilot    │
                      │ (CLI hooks)  │ │ (Extension) │ │ (VS Code)    │
                      └──────────────┘ └─────────────┘ └──────────────┘
```

---

## Phase 1: Backend Infrastructure

### 1.1 Database Schema (Supabase PostgreSQL)

```sql
-- Users (managed by Supabase Auth, extended)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Devices
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- desktop, laptop, server
  platform TEXT NOT NULL, -- windows, macos, linux
  status TEXT DEFAULT 'offline',
  last_seen TIMESTAMPTZ,
  public_key TEXT, -- For E2E encryption
  device_fingerprint TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Device Pairing Codes (temporary)
CREATE TABLE pairing_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_fingerprint TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  language TEXT,
  framework TEXT,
  github_repo_id INTEGER,
  github_repo_full_name TEXT,
  last_modified TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Connected Tools
CREATE TABLE connected_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  tool_type TEXT NOT NULL, -- cursor, copilot, claude-terminal
  name TEXT NOT NULL,
  version TEXT,
  status TEXT DEFAULT 'inactive',
  config JSONB DEFAULT '{}',
  last_activity TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat Sessions
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  tool_type TEXT NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat Messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- user, assistant, system
  content TEXT NOT NULL,
  status TEXT DEFAULT 'complete',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Approval Requests
CREATE TABLE approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- file_change, command_execution, file_creation
  description TEXT,
  changes JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending',
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

-- Push Notification Tokens
CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL, -- ios, android
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security Policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
-- ... (policies for each table)
```

### 1.2 Node.js API Server Structure

```
forkoff-server/
├── src/
│   ├── index.ts                 # Entry point
│   ├── config/
│   │   ├── database.ts          # Supabase client
│   │   ├── redis.ts             # Redis for sessions/cache
│   │   └── env.ts               # Environment validation
│   ├── middleware/
│   │   ├── auth.ts              # JWT validation via Supabase
│   │   ├── rateLimit.ts         # Rate limiting
│   │   └── deviceAuth.ts        # Device token validation
│   ├── routes/
│   │   ├── auth.ts              # Auth endpoints (proxy to Supabase)
│   │   ├── devices.ts           # Device management
│   │   ├── projects.ts          # Project CRUD
│   │   ├── chat.ts              # Chat sessions
│   │   ├── approvals.ts         # Approval handling
│   │   └── pairing.ts           # Device pairing
│   ├── services/
│   │   ├── deviceService.ts
│   │   ├── projectService.ts
│   │   ├── chatService.ts
│   │   ├── notificationService.ts
│   │   └── encryptionService.ts # E2E encryption helpers
│   ├── websocket/
│   │   ├── index.ts             # Socket.io setup
│   │   ├── handlers/
│   │   │   ├── deviceEvents.ts
│   │   │   ├── chatEvents.ts
│   │   │   ├── terminalEvents.ts
│   │   │   └── approvalEvents.ts
│   │   └── rooms.ts             # Room management
│   └── types/
│       └── index.ts
├── package.json
├── tsconfig.json
├── Dockerfile
└── railway.toml
```

### 1.3 Key API Endpoints

```
Authentication (via Supabase):
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
POST   /auth/github

Device Management:
GET    /devices                    # List user's devices
GET    /devices/:id                # Get device details
POST   /devices/pair/initiate      # Generate pairing code (mobile)
POST   /devices/pair/complete      # Complete pairing (desktop)
DELETE /devices/:id                # Remove device
PATCH  /devices/:id                # Update device name

Projects:
GET    /projects                   # List projects across devices
GET    /projects/:id               # Get project details
GET    /projects/:id/files         # Get file tree
GET    /projects/:id/files/content # Get file content

Chat:
GET    /chat/sessions              # List sessions
GET    /chat/sessions/:id          # Get session with messages
POST   /chat/sessions/:id/message  # Send message to tool

Approvals:
GET    /approvals/pending          # List pending approvals
POST   /approvals/:id/respond      # Approve/reject
```

---

## Phase 2: Desktop Companion App

### 2.1 Shared Core Package

```
forkoff-core/
├── src/
│   ├── index.ts
│   ├── auth/
│   │   ├── deviceAuth.ts        # Device authentication
│   │   └── pairing.ts           # QR/code pairing logic
│   ├── connection/
│   │   ├── websocket.ts         # WebSocket client
│   │   └── api.ts               # API client
│   ├── tools/
│   │   ├── detector.ts          # Detect installed tools
│   │   ├── claude/
│   │   │   ├── index.ts
│   │   │   ├── hooks.ts         # Claude Code hooks integration
│   │   │   └── parser.ts        # Parse Claude output
│   │   ├── cursor/
│   │   │   ├── index.ts
│   │   │   ├── extension.ts     # Cursor extension API
│   │   │   └── parser.ts
│   │   └── copilot/
│   │       ├── index.ts
│   │       └── vscode.ts        # VS Code extension integration
│   ├── projects/
│   │   ├── scanner.ts           # Scan for projects
│   │   ├── watcher.ts           # File system watcher
│   │   └── git.ts               # Git operations
│   ├── terminal/
│   │   ├── pty.ts               # Pseudo-terminal
│   │   └── relay.ts             # Terminal I/O relay
│   ├── security/
│   │   ├── encryption.ts        # E2E encryption
│   │   ├── keystore.ts          # Secure key storage
│   │   └── fingerprint.ts       # Device fingerprinting
│   └── types/
│       └── index.ts
├── package.json
└── tsconfig.json
```

### 2.2 CLI Tool

```
forkoff-cli/
├── src/
│   ├── index.ts                 # CLI entry point
│   ├── commands/
│   │   ├── pair.ts              # `forkoff pair` - start pairing
│   │   ├── status.ts            # `forkoff status` - show status
│   │   ├── projects.ts          # `forkoff projects` - list/add projects
│   │   ├── tools.ts             # `forkoff tools` - manage tool connections
│   │   └── daemon.ts            # `forkoff daemon` - run background service
│   ├── daemon/
│   │   ├── index.ts             # Background service
│   │   ├── toolMonitor.ts       # Monitor AI tools
│   │   └── projectSync.ts       # Sync project state
│   └── ui/
│       ├── qrcode.ts            # Terminal QR code display
│       └── spinner.ts           # Loading indicators
├── package.json
└── bin/
    └── forkoff                  # Executable
```

**CLI Usage:**
```bash
# Install globally
npm install -g @forkoff/cli

# Initial setup - shows QR code for mobile pairing
forkoff pair

# Run daemon (background process)
forkoff daemon start

# Check status
forkoff status

# Add project to sync
forkoff projects add /path/to/project

# Connect a tool
forkoff tools connect cursor
```

### 2.3 Electron App

```
forkoff-desktop/
├── src/
│   ├── main/
│   │   ├── index.ts             # Main process
│   │   ├── tray.ts              # System tray
│   │   ├── autoLaunch.ts        # Start on boot
│   │   ├── updater.ts           # Auto-updates
│   │   └── ipc.ts               # IPC handlers
│   ├── renderer/
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── Pairing.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Projects.tsx
│   │   │   ├── Tools.tsx
│   │   │   └── Settings.tsx
│   │   └── components/
│   ├── preload/
│   │   └── index.ts
│   └── shared/
│       └── types.ts
├── package.json
├── electron-builder.yml
└── forge.config.js
```

---

## Phase 3: Tool Integrations

### 3.1 Claude Code Integration

Claude Code supports hooks that can intercept events. We'll use:

**~/.claude/settings.json:**
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": ".*",
        "hooks": ["forkoff-hook"]
      }
    ],
    "PostToolUse": [
      {
        "matcher": ".*",
        "hooks": ["forkoff-hook"]
      }
    ],
    "Notification": [
      {
        "matcher": ".*",
        "hooks": ["forkoff-hook"]
      }
    ]
  }
}
```

**Hook Implementation:**
```typescript
// forkoff-hook executable
// Receives JSON on stdin with hook data
// Can block tool execution by returning non-zero exit

interface HookInput {
  hook_type: 'PreToolUse' | 'PostToolUse' | 'Notification';
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_output?: string;
  session_id: string;
  message?: string;
}

// For PreToolUse - can request approval
// For PostToolUse - relay results to mobile
// For Notification - push to mobile
```

### 3.2 Cursor Integration

Cursor exposes an extension API. We create a VS Code extension:

```typescript
// cursor-forkoff-extension
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  // Listen to Cursor AI events via their API
  // Intercept file changes before applying
  // Relay chat messages to mobile

  // Register approval provider
  vscode.commands.registerCommand('forkoff.approveChange', async (change) => {
    // Show notification, wait for mobile approval
  });
}
```

### 3.3 GitHub Copilot Integration

Copilot is harder to intercept directly. Options:
1. VS Code extension that monitors Copilot suggestions
2. Proxy completions through our service (complex)
3. Focus on Copilot Chat which has better extension points

---

## Phase 4: Security Architecture

### 4.1 Device Pairing Flow

```
Mobile App                    Server                    Desktop App
    │                           │                           │
    │  1. POST /pair/initiate   │                           │
    │  ─────────────────────────>                           │
    │                           │                           │
    │  { code: "ABC123",        │                           │
    │    qrData: "..." }        │                           │
    │  <─────────────────────────                           │
    │                           │                           │
    │  2. Display QR Code       │                           │
    │  ═══════════════════════════════════════════════════> │
    │                                                       │
    │                           │  3. POST /pair/complete   │
    │                           │  { code, deviceFingerprint,│
    │                           │    publicKey }            │
    │                           │  <─────────────────────────
    │                           │                           │
    │                           │  4. Verify code,          │
    │                           │     store device          │
    │                           │                           │
    │  5. WebSocket: device_paired                          │
    │  <─────────────────────────                           │
    │                           │  { deviceToken }          │
    │                           │  ─────────────────────────>
    │                           │                           │
```

### 4.2 Message Encryption

```typescript
// All sensitive data encrypted client-to-client
// Server only stores encrypted blobs

interface EncryptedMessage {
  nonce: string;      // Random nonce
  ciphertext: string; // NaCl box encrypted
  fromDevice: string; // Device ID
  toDevice: string;   // Target device ID
}

// Key exchange during pairing
// Mobile and desktop exchange public keys
// Derive shared secret for symmetric encryption
```

### 4.3 Authentication Layers

1. **User Auth**: Supabase JWT (mobile app login)
2. **Device Auth**: Device-specific tokens (desktop daemon)
3. **WebSocket Auth**: Short-lived tokens, refreshed automatically
4. **E2E Encryption**: NaCl/libsodium for message encryption

---

## Phase 5: Mobile App Updates

### 5.1 Update Services for Production

```typescript
// services/api.client.ts - Remove mock fallbacks, add error handling
// services/device.service.ts - Real API calls
// services/websocket.service.ts - Production WebSocket URL
// services/auth.service.ts - Already using Supabase
```

### 5.2 New Features Needed

1. **Device Pairing Screen**: QR scanner + manual code entry
2. **Push Notifications**: Expo Push + server integration
3. **E2E Encryption**: Decrypt messages from desktop
4. **Offline Support**: Queue actions when offline

---

## Phase 6: Implementation Order

### Sprint 1: Backend Foundation (Week 1-2)
- [ ] Set up Node.js server on Railway
- [ ] Configure Supabase database with schema
- [ ] Implement core REST API endpoints
- [ ] Set up WebSocket server with Socket.io
- [ ] Implement device pairing flow

### Sprint 2: Desktop CLI (Week 3-4)
- [ ] Create forkoff-core shared package
- [ ] Build CLI with pairing command
- [ ] Implement daemon mode
- [ ] Add Claude Code hooks integration
- [ ] Test end-to-end pairing

### Sprint 3: Real-time Features (Week 5-6)
- [ ] Chat relay from Claude to mobile
- [ ] Approval request flow
- [ ] Terminal output streaming
- [ ] File tree sync

### Sprint 4: Electron App (Week 7-8)
- [ ] Build Electron shell with system tray
- [ ] Implement pairing UI with QR code
- [ ] Dashboard showing connected mobile
- [ ] Auto-updater integration

### Sprint 5: Additional Tools (Week 9-10)
- [ ] Cursor extension development
- [ ] GitHub Copilot basic integration
- [ ] Tool detection and status

### Sprint 6: Polish & Security (Week 11-12)
- [ ] E2E encryption implementation
- [ ] Push notifications
- [ ] Error handling & retry logic
- [ ] Security audit
- [ ] Documentation

---

## Environment Variables

### Mobile App (.env)
```
EXPO_PUBLIC_API_URL=https://api.forkoff.app
EXPO_PUBLIC_WS_URL=wss://ws.forkoff.app
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=xxx
EXPO_PUBLIC_USE_MOCKS=false
```

### Server (.env)
```
DATABASE_URL=postgresql://...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx
REDIS_URL=redis://...
JWT_SECRET=xxx
PUSH_NOTIFICATION_KEY=xxx
```

### Desktop App
```
API_URL=https://api.forkoff.app
WS_URL=wss://ws.forkoff.app
```

---

## Tech Stack Summary

| Component | Technology |
|-----------|------------|
| Mobile App | React Native + Expo |
| Backend API | Node.js + Express + TypeScript |
| WebSocket | Socket.io |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth |
| Cache | Redis (Upstash) |
| Desktop CLI | Node.js + Commander |
| Desktop GUI | Electron + React |
| Hosting | Railway (API), Supabase (DB) |
| Push Notifications | Expo Push + Firebase |
| Encryption | TweetNaCl.js |
