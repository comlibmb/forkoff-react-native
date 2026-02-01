<p align="center">
  <img src="repo-assets/logo.png" alt="ForkOff Logo" width="200"/>
</p>

<h1 align="center">ForkOff Mobile App</h1>

<p align="center">
  <strong>Control your AI coding tools from anywhere</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#screenshots">Screenshots</a> •
  <a href="#installation">Installation</a> •
  <a href="#development">Development</a> •
  <a href="#architecture">Architecture</a>
</p>

<p align="center">
  <a href="https://apps.apple.com/app/forkoff">
    <img src="https://img.shields.io/badge/Download_on_the-App_Store-black?style=for-the-badge&logo=apple" alt="App Store"/>
  </a>
  <a href="https://play.google.com/store/apps/details?id=com.forkoff.app">
    <img src="https://img.shields.io/badge/Get_it_on-Google_Play-green?style=for-the-badge&logo=google-play" alt="Google Play"/>
  </a>
</p>

---

## Features

### 🎮 Remote Control for AI Coding

- **Send prompts** to Claude Code, Cursor, and other AI tools
- **Approve code changes** with a single tap
- **View live responses** as they stream in
- **Monitor terminal output** in real-time

### 📱 Multi-Device Management

- **Pair multiple computers** via QR code
- **Switch between devices** seamlessly
- **Track device status** (online/offline)
- **Manage Claude sessions** across machines

### 📊 Analytics & Insights

- **Token usage tracking** - daily, weekly, monthly
- **Session history** - review past conversations
- **Cost estimates** - monitor API spending
- **Usage streaks** - track your coding habits

### 🏆 Achievements & Gamification

- **Unlock achievements** for milestones
- **Track progress** towards goals
- **Showcase badges** on your profile

### ⏰ Smart Queue System

- **Queue prompts** during rate limits
- **Schedule execution** for later
- **Automatic retry** when limits reset

---

## Screenshots

<p align="center">
  <i>Screenshots coming soon</i>
</p>

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **React Native** | Cross-platform mobile framework |
| **Expo** | Development & build tooling |
| **Expo Router** | File-based navigation |
| **Zustand** | State management |
| **TanStack Query** | Server state & caching |
| **Socket.io** | Real-time communication |
| **Supabase** | Authentication |
| **NativeWind** | Tailwind CSS for React Native |

---

## Installation

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator
- Expo Go app on your device (for physical testing)

### 1. Clone & Install

```bash
git clone https://github.com/Forkoff-app/forkoff-react-native.git
cd forkoff-react-native
npm install
```

### 2. Configure Environment

Create a `.env` file:

```bash
# API Configuration
EXPO_PUBLIC_API_URL=https://api.forkoff.dev/api
EXPO_PUBLIC_WS_URL=wss://api.forkoff.dev

# Supabase (for auth)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# PostHog (analytics - optional)
EXPO_PUBLIC_POSTHOG_KEY=your-posthog-key
```

### 3. Start Development Server

```bash
# Start Expo
npx expo start

# Run on iOS simulator
npx expo run:ios

# Run on Android emulator
npx expo run:android
```

---

## Development

### Project Structure

```
app/
├── (auth)/             # Authentication screens
│   ├── login.tsx
│   ├── register.tsx
│   └── forgot-password.tsx
├── (tabs)/             # Main tab navigation
│   ├── devices.tsx     # Device list (home)
│   ├── projects.tsx    # Projects list
│   └── settings.tsx    # Settings
├── device/
│   ├── [id].tsx        # Device detail
│   └── pair.tsx        # QR pairing
├── claude/
│   └── session/[key].tsx  # Claude session view
├── queue/              # Prompt queue
├── achievements/       # Achievements
└── _layout.tsx         # Root layout

components/
├── ui/                 # Reusable UI components
├── claude/             # Claude-specific components
├── device/             # Device components
├── chat/               # Chat components
└── analytics/          # Charts & stats

stores/
├── auth.store.ts       # Authentication state
├── approval.store.ts   # Approval requests
├── connection.store.ts # Connection status
├── queue.store.ts      # Prompt queue
└── theme.store.ts      # Theme preferences

services/
├── api.client.ts       # HTTP client
├── websocket.service.ts # WebSocket handling
├── notification.service.ts
└── analytics.service.ts
```

### Key Commands

```bash
# Start development server
npx expo start

# Clear cache and restart
npx expo start --clear

# Build for production (iOS)
eas build --platform ios

# Build for production (Android)
eas build --platform android

# Run tests
npm test

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

### Local Backend Development

To test with a local backend:

1. Start the backend server on your machine
2. Get your local IP address
3. Update `.env`:
   ```
   EXPO_PUBLIC_API_URL=http://YOUR_IP:3000/api
   EXPO_PUBLIC_WS_URL=ws://YOUR_IP:3000
   ```
4. Restart Expo

---

## Architecture

### State Management

- **Zustand** for client state (auth, UI, preferences)
- **TanStack Query** for server state (API data, caching)
- **WebSocket** for real-time updates

### Authentication Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Supabase  │────>│  JWT Token  │────>│   Backend   │
│    Auth     │     │   Storage   │     │     API     │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Real-time Communication

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Mobile App │<───>│   Backend   │<───>│     CLI     │
│  (Socket)   │     │  (Socket)   │     │  (Socket)   │
└─────────────┘     └─────────────┘     └─────────────┘
```

---

## Building for Production

### EAS Build

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure build
eas build:configure

# Build for app stores
eas build --platform all
```

### Environment Variables

Production builds use EAS Secrets:

```bash
eas secret:create --name EXPO_PUBLIC_API_URL --value "https://api.forkoff.dev/api"
eas secret:create --name EXPO_PUBLIC_WS_URL --value "wss://api.forkoff.dev"
```

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## Related Projects

- [ForkOff Backend](https://github.com/Forkoff-app/forkoff-backend) - API server
- [ForkOff CLI](https://github.com/Forkoff-app/forkoff-cli) - Command line tool
- [ForkOff Website](https://github.com/Forkoff-app/forkoff-website) - Landing page

---

<p align="center">
  Made with ❤️ by the ForkOff team
</p>
