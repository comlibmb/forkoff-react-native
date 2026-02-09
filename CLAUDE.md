# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is ForkOff?

ForkOff is a React Native mobile app that lets developers control AI coding sessions (Claude Code) on their laptop from their phone. The app communicates with a NestJS backend via WebSockets, which relays events to/from a CLI tool running on the developer's machine.

## Build & Development Commands

```bash
npx expo start             # development server
npx expo start --android   # Android
npx expo start --ios       # iOS
npx jest                   # run all tests
npx jest --testPathPattern=<pattern>  # run a single test
```

Tests: jest-expo preset, matches `**/__tests__/**/*.test.{ts,tsx}` and `**/*.test.{ts,tsx}`, `testEnvironment: jsdom`. Coverage collected from `stores/`, `services/`, `components/`.

## Architecture

### Routing
Expo Router (file-based, like Next.js). Routes live in `app/`:
- `app/(tabs)/` — Bottom tab screens: Projects, Devices, Analytics, Settings
- `app/(auth)/` — Login, register, forgot-password, OTP verification
- `app/(onboarding)/` — First-run setup flow
- `app/claude/session/[sessionKey].tsx` — Core session view (streaming messages, approvals, thinking)
- `app/project-hub.tsx` — Per-project command center (CLAUDE.md preview, quick actions, session list)

Typed routes enabled (`typedRoutes: true` in app.json experiments).

### State Management
Zustand stores in `stores/*.store.ts`, created with `create<State>((set, get) => ({...}))`. Key stores:
- `auth.store` — Supabase auth, user profile, OTP flow
- `device.store` — Paired devices, status tracking
- `claude.store` — Claude sessions per device, session lifecycle
- `connection.store` — WebSocket connection state
- `approval.store` — Pending code approval requests
- `project-hub.store` — Per-project cache (CLAUDE.md content, last activity, tasks)
- `theme.store` — Dark/light mode preference
- `usage.store` — Token/message usage tracking

### Services
Singleton instances in `services/*.service.ts`:
- `websocket.service` — Socket.io client, event routing, all real-time communication
- `api.client` — Axios HTTP client with Supabase JWT injection
- `auth.service` — Supabase auth wrapper
- `notification.service` — Expo push notifications
- `sentry.service` — Error tracking

### WebSocket Events (Adding New Events)
The mobile app is one of three components in the event flow: **CLI ↔ Backend ↔ Mobile**.

To add a new event on the mobile side:
1. Add the event type interface in `services/websocket.service.ts`
2. Add to `EventCallbacks` interface (the type map for all events)
3. Initialize the callback array in the constructor
4. Register `this.socket.on('event_name', ...)` in `setupListeners()` that calls `this.emitInternal()`
5. Use `wsService.on('event_name', callback)` in stores/components to listen

The websocket service uses an internal event emitter pattern — socket events are forwarded via `emitInternal()` to registered callbacks.

### Theme
Always use `useTheme()` from `theme/ThemeProvider.tsx` for colors. Returns `ThemeColors` with: `background`, `backgroundSecondary`, `text`, `textSecondary`, `primary`, `card`, `border`, `success`, `warning`, `error`, etc. Plus `isDark` and `toggleTheme`. Never hardcode colors.

### Path Aliases
```
@/components/*  →  components/*
@/stores/*      →  stores/*
@/services/*    →  services/*
@/hooks/*       →  hooks/*
@/types/*       →  types/*
@/theme/*       →  theme/*
```

### Session Screen (`app/claude/session/[sessionKey].tsx`)
The most complex screen. Handles:
- Two modes: legacy transcript watching (JSONL files) and SDK streaming (real-time JSON messages)
- Auto-prompt flow: quick actions from project hub pass `autoPrompt` + `autoDirectory` params to auto-start sessions
- "Take Over" flow: user must explicitly take over a session before sending messages
- Permission requests: modal approval for tool use (file edits, bash commands)
- Thinking content: extended thinking blocks streamed in real-time
- Token usage and task progress tracking

### Project Hub (`app/project-hub.tsx`)
Navigated to from the Projects tab with `deviceId`, `directory`, `deviceName` params. Fetches CLAUDE.md via `read_file` WebSocket event (routed through backend to CLI). Quick actions (Status Check, Brainstorm, View Todos) start new sessions with pre-defined prompts.

## Key Patterns

- **Optimistic updates**: User messages are added to the UI immediately with `local-` prefixed IDs, then replaced when the real message arrives from the server
- **Cache with TTL**: `project-hub.store` caches CLAUDE.md and activity data for 5 minutes per project
- **Device room subscription**: Mobile must call `wsService.subscribeToDevice(deviceId)` to join a device's Socket.io room and receive events routed to `device:<id>`
- **Session-scoped routing**: Some events route through `transcript:<sessionKey>` rooms instead of device rooms
