<p align="center">
  <img src="repo-assets/logo.png" alt="ForkOff Logo" width="200"/>
</p>

<h1 align="center">ForkOff Mobile App</h1>

<p align="center">
  <strong>Control your AI coding sessions from your phone</strong>
</p>

<p align="center">
  <a href="https://github.com/Forkoff-app/forkoff-react-native/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Forkoff-app/forkoff-react-native" alt="MIT License"></a>
  <a href="https://testflight.apple.com/join/dhh5FrN7"><img src="https://img.shields.io/badge/TestFlight-Open_Beta-blue?logo=apple" alt="TestFlight"></a>
</p>

<p align="center">
  <a href="#features">Features</a> &bull;
  <a href="#installation">Installation</a> &bull;
  <a href="#development">Development</a> &bull;
  <a href="#architecture">Architecture</a> &bull;
  <a href="#security">Security</a>
</p>

---

ForkOff is a React Native mobile app that connects to [Claude Code](https://claude.ai/code) running on your laptop via the [ForkOff CLI](https://github.com/Forkoff-app/forkoff-cli). Monitor sessions, approve tool use, and track usage &mdash; all from your phone.

> **Open Source** &mdash; MIT licensed. Contributions welcome!
>
> **Open Beta** &mdash; [Join the iOS TestFlight](https://testflight.apple.com/join/dhh5FrN7)

---

## Features

### Remote Control for AI Coding
- **Monitor live sessions** &mdash; See Claude Code output as it streams in real-time
- **Interactive approvals** &mdash; Approve or deny file edits, bash commands, and other tool use
- **Configurable permissions** &mdash; Auto-approve safe tools, require approval for destructive ones
- **Send prompts** &mdash; Start new sessions or continue existing ones from mobile

### Multi-Device Management
- **Pair via QR code** &mdash; Scan to link your laptop in seconds
- **Multiple devices** &mdash; Connect several machines, switch between them
- **Device status** &mdash; See which devices are online in real-time
- **Project hub** &mdash; Browse projects, view CLAUDE.md, launch quick actions

### Analytics & Insights
- **Token usage tracking** &mdash; Daily, weekly, monthly breakdowns
- **Multi-device aggregation** &mdash; Stats summed across all connected CLIs
- **Usage streaks** &mdash; Track your coding consistency
- **Real-time updates** &mdash; Token counts update as you code

### Achievements
- **Unlock badges** for usage milestones
- **Showcase achievements** on your profile

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **React Native 0.81** | Cross-platform mobile framework |
| **Expo SDK 54** | Development, builds, OTA updates |
| **Expo Router** | File-based navigation (typed routes) |
| **Zustand** | State management |
| **TanStack Query** | Server state & caching |
| **Socket.io** | Real-time communication |
| **TweetNaCl** | End-to-end encryption (X25519, XSalsa20-Poly1305) |
| **Supabase** | Authentication |
| **NativeWind** | Tailwind CSS for React Native |
| **PostHog** | Product analytics |
| **Sentry** | Error tracking |

---

## Installation

### Prerequisites

- Node.js 18+
- iOS Simulator (Mac) or Android Emulator
- [ForkOff CLI](https://www.npmjs.com/package/forkoff) (`npm install -g forkoff`)

### 1. Clone & Install

```bash
git clone https://github.com/Forkoff-app/forkoff-react-native.git
cd forkoff-react-native
npm install
```

### 2. Configure Environment

Create a `.env` file:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional
EXPO_PUBLIC_POSTHOG_API_KEY=your-posthog-key
EXPO_PUBLIC_SENTRY_DSN=your-sentry-dsn
```

### 3. Start Development

```bash
npx expo start             # Start dev server
npx expo start --ios       # iOS simulator
npx expo start --android   # Android emulator
```

---

## Development

### Project Structure

```
app/
├── (onboarding)/          # First-run setup flow
├── (tabs)/                # Bottom tab navigation
│   ├── projects.tsx       # Projects list
│   ├── devices.tsx        # Paired devices
│   ├── analytics.tsx      # Usage analytics
│   └── settings.tsx       # Settings
├── claude/
│   └── session/[key].tsx  # Live session view (streaming, approvals)
├── device/
│   ├── [id].tsx           # Device detail
│   └── pair.tsx           # QR pairing
├── project-hub.tsx        # Per-project command center
├── achievements/          # Achievement badges
├── settings/
│   └── permissions.tsx    # Tool permission rules
└── _layout.tsx            # Root layout

components/
├── ui/                    # Reusable UI (AlertModal, OfflineBanner, etc.)
├── claude/                # Session components (PermissionQueue, ToolUseBlock)
│   └── tools/             # Tool renderers (Bash, Edit, Read, Write, etc.)
├── analytics/             # Charts & summary cards
├── achievements/          # Achievement badges & unlock modal
└── tutorial/              # Guided tutorial overlay

stores/
├── claude.store.ts        # Claude sessions per device
├── device.store.ts        # Paired devices & status
├── approval.store.ts      # Pending approval requests
├── analytics.store.ts     # Token usage & multi-device aggregation
├── connection.store.ts    # WebSocket connection state
├── permission-rules.store.ts  # Tool approval rules
└── ...

services/
├── websocket.service.ts   # Socket.io client, E2EE, event routing
├── crypto/                # E2EE implementation (NaCl)
│   ├── e2eeManager.ts     # Key exchange, encryption, TOFU
│   ├── encryption.ts      # XSalsa20-Poly1305
│   ├── keyGeneration.ts   # X25519 key pairs
│   └── keyStorage.ts      # SecureStore persistence
├── api.client.ts          # Axios HTTP client
├── notification.service.ts # Push notifications
├── analytics.service.ts   # PostHog
└── sentry.service.ts      # Error tracking
```

### Commands

```bash
npx expo start             # Dev server
npx expo start --clear     # Clear cache and restart
npm test                   # Run tests
npx tsc --noEmit           # Type check
eas build --platform ios   # Production build (iOS)
eas build --platform android  # Production build (Android)
```

---

## Architecture

### State Management

- **Zustand** stores in `stores/*.store.ts` with `create<State>((set, get) => ({...}))`
- **Module-level WebSocket listeners** for global events (analytics sync, achievements)
- **AsyncStorage** for persistence, **SecureStore** for cryptographic keys
- **Optimistic updates** &mdash; Messages appear instantly, replaced when server confirms

### Real-time Communication

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Mobile App │<───>│   Relay     │<───>│  CLI Tool   │
│  (E2EE)     │     │  (opaque)   │     │  (E2EE)     │
└─────────────┘     └─────────────┘     └─────────────┘
```

The relay server only sees encrypted payloads. All session content, approvals, file contents, and terminal output are end-to-end encrypted between the mobile app and CLI.

### Permission System

The mobile app configures tool permission rules that sync to the CLI:

1. User configures rules in **Settings > Permissions** (which tools auto-approve vs require approval)
2. On session takeover, rules sync to CLI via `permission_rules_sync` event
3. CLI installs a **PreToolUse hook** into Claude Code's settings
4. Hook script reads rules and auto-approves or prompts mobile for approval
5. Approval requests appear in a **queued modal** on mobile with approve/deny controls

---

## Security

All communication between the mobile app and CLI is end-to-end encrypted:

| Layer | Implementation |
|-------|---------------|
| **Key exchange** | X25519 ECDH with Ed25519 identity signatures |
| **Encryption** | XSalsa20-Poly1305 authenticated encryption (NaCl) |
| **Identity** | TOFU (Trust On First Use) with key pinning |
| **Replay protection** | Per-peer monotonic message counters |
| **Key storage** | Expo SecureStore (iOS Keychain / Android Keystore) |
| **Enforcement** | Sensitive events never sent in plaintext; enforced at both ends |
| **Validation** | Encrypted payloads validated for structure before dispatch |

E2EE is established automatically on device pairing. No configuration required.

---

## Building for Production

### EAS Build

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform all
```

### Environment Variables

Production builds use EAS Secrets:

```bash
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://..."
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "..."
```

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit changes (`git commit -m 'Add my feature'`)
4. Push to branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

## Related Projects

- [ForkOff CLI](https://github.com/Forkoff-app/forkoff-cli) &mdash; CLI tool (`npm install -g forkoff`)
- [ForkOff Website](https://forkoff.app) &mdash; Landing page

## License

[MIT](LICENSE)
