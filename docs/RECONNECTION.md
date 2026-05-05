# ForkOff Reconnection Mechanism Design

## Background

ForkOff is a React Native app that controls Claude Code CLI via cloudflare tunnels. The mobile app communicates with the CLI through:

```
Mobile App ↔ Socket.IO ↔ Cloudflare Tunnel ↔ CLI ↔ Claude Code
```

The tunnel URL is ephemeral — it changes every time cloudflared restarts. This document describes the reconnection mechanism that handles various disconnect scenarios.

---

## Architecture Overview

### Components

| Component | File | Role |
|-----------|------|------|
| WebSocket Service | `forkoff-react-native/services/websocket.service.ts` | Socket.IO client, reconnection logic, tunnel URL polling |
| Root Layout | `forkoff-react-native/app/_layout.tsx` | AppState monitoring, foreground reconnection, cold start |
| Connection Store | `forkoff-react-native/stores/connection.store.ts` | Zustand store tracking `isServerConnected` state |
| Tunnel Notifier | `forkoff-cli/src/tunnel-notifier.ts` | Writes tunnel URL to Supabase `tunnel_sessions` table |
| CLI Index | `forkoff-cli/src/index.ts` | Session TTL, graceful vs network disconnect handling |
| Pairing Service | `forkoff-react-native/services/pairing.service.ts` | Stores relay URL in SecureStore |

### Key State

- `tunnel_sessions` Supabase table: stores `device_id`, `tunnel_url`, `pairing_code`, `expires_at`
- `pairingService.relayUrl` (SecureStore): the ws/wss URL the mobile is currently using
- `wsService.lastKnownTunnelUrl`: last tunnel URL seen from Supabase polling
- `wsService._lastReconnectAttemptAt`: timestamp of last reconnect attempt (cooldown guard)

---

## Disconnect Scenarios

### Scenario 1: Tunnel Restart (cloudflared killed)

**Sequence:**
1. cloudflared process dies → tunnel URL becomes invalid
2. CLI detects tunnel failure → restarts cloudflared → gets new URL
3. `TunnelNotifier.notifyTunnelUrl()` writes new URL to Supabase
4. Mobile `pollTunnelUrl` (every 10s) detects URL change → `handleTunnelUrlChange()` → `disconnect()` + `connect()`

**Recovery time:** ~10-30 seconds (tunnel restart ~10s + poll interval 10s)

### Scenario 2: App Backgrounded / Foregrounded

**Sequence:**
1. User switches app to background
2. iOS/Android suspends timers — `pollTunnelUrl` may pause
3. User switches back to app → AppState fires `inactive|background → active`
4. `_layout.tsx` foreground handler runs reconnect loop:
   - Fetch current tunnel URL from Supabase
   - If URL changed → update SecureStore relay URL
   - `wsService.disconnect()` + `wsService.connect()`
   - Wait up to 5 seconds for connection result
   - If failed → retry every 5 seconds, up to 6 attempts (30 seconds total)
5. Direct `setServerConnected(wsService.isConnected)` updates UI immediately

**Recovery time:** 0-30 seconds depending on network availability

### Scenario 3: Network Interruption (WiFi off/on)

**Sequence:**
1. WiFi disconnects → Socket.IO detects connection loss
2. Socket.IO auto-reconnect kicks in (up to 10 attempts, 2s-30s backoff)
3. If Socket.IO gives up → `reconnect_failed` event → `isConnecting = false`
4. `pollTunnelUrl` detects disconnected state → triggers reconnect (with 30s cooldown)
5. When WiFi returns → next poll or Socket.IO retry connects

**Recovery time:** 2-60 seconds

### Scenario 4: App Killed + Relaunch (Cold Start)

**Sequence:**
1. App killed → all in-memory state lost
2. App relaunch → `_layout.tsx` `initializeApp()` runs
3. `useIdentityStore.initialize()` loads device ID + paired devices from SecureStore
4. If `isPaired && isReady` → fetch tunnel URL from Supabase → `wsService.connect()`
5. E2EE re-establishes via TOFU (key exchange on `mobile_connected`)

**Recovery time:** 3-10 seconds

### Scenario 5: Long-Term Disconnect (30+ minutes background)

**Sequence:**
1. App backgrounded for 30+ minutes
2. CLI-side: session TTL (30 minutes) may expire → taken-over sessions released
3. Mobile foregrounded → same as Scenario 2 (foreground handler)
4. Sessions need re-take-over, but connection re-establishes normally

**Recovery time:** 0-30 seconds for connection; sessions need re-take-over if TTL expired

---

## Reconnection Mechanisms (Layered)

Three independent mechanisms provide reconnection coverage:

### Layer 1: Socket.IO Auto-Reconnect

```typescript
// websocket.service.ts - connect()
this.socket = io(socketUrl, {
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 10,        // Up to 10 retries
  reconnectionDelay: 2000,         // Start at 2 seconds
  reconnectionDelayMax: 30000,     // Max 30 seconds between retries
  randomizationFactor: 0.5,        // ±50% jitter to avoid thundering herd
});
```

Handles: transient network glitches, brief WiFi drops. Socket.IO tries up to 10 times with exponential backoff (2s → 4s → 8s → ... → 30s max).

On `reconnect_failed`: resets `isConnecting` flag so other layers can take over.

### Layer 2: Tunnel URL Polling (`pollTunnelUrl`)

```typescript
// websocket.service.ts - subscribeToTunnelUpdates()
this.tunnelPollTimer = setInterval(() => {
  this.pollTunnelUrl(deviceId);
}, 10000); // Every 10 seconds
```

Polls Supabase `tunnel_sessions` table every 10 seconds. **Only handles two cases:**

1. **URL changed** → always reconnect immediately via `handleTunnelUrlChange()`
2. **Socket.IO gave up** (`_socketIoGaveUp = true`) → fallback reconnect to same URL

```typescript
private async pollTunnelUrl(deviceId: string): Promise<void> {
  const tunnelUrl = await this.fetchCurrentTunnelUrl(deviceId);
  if (!tunnelUrl) return;

  if (this.lastKnownTunnelUrl && tunnelUrl !== this.lastKnownTunnelUrl) {
    // URL changed — always reconnect immediately
    await this.handleTunnelUrlChange(tunnelUrl);
  } else if (!this.socket?.connected && this._socketIoGaveUp && this.lastKnownTunnelUrl) {
    // Socket.IO gave up — poll takes over as fallback
    this._socketIoGaveUp = false;
    this.disconnect();
    this.connect();
  }
  this.lastKnownTunnelUrl = tunnelUrl;
}
```

**Critical design decision:** `pollTunnelUrl` does NOT do same-URL reconnect while Socket.IO is still trying. This prevents the connect/disconnect loop where poll kills in-progress Socket.IO connections. Socket.IO handles same-URL reconnects; poll only takes over after Socket.IO gives up (`reconnect_failed` event sets `_socketIoGaveUp = true`).

### Layer 3: AppState Foreground Handler (`_layout.tsx`)

```typescript
// _layout.tsx - AppState.addEventListener('change', ...)
if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
  if (isPaired && isReady && pairedDevices.length > 0) {
    for (let attempt = 0; attempt < 6; attempt++) {
      if (wsService.isConnected) {
        setServerConnected(true);
        break;
      }
      for (const device of pairedDevices) {
        const tunnelUrl = await wsService.fetchCurrentTunnelUrl(device.id);
        if (tunnelUrl) {
          // URL conversion and SecureStore update
          wsService.disconnect();
          wsService.connect();
          // Wait up to 5s for connection
          await waitForConnection(5000);
          setServerConnected(wsService.isConnected);
        }
      }
      if (wsService.isConnected) break;
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}
```

Handles: app returning from background. Fetches latest tunnel URL from Supabase, reconnects with 6 retries at 5-second intervals (30 seconds total). Directly updates `connectionStore.isServerConnected` for immediate UI feedback.

### Layer 4: Cold Start (`_layout.tsx`)

```typescript
// _layout.tsx - useEffect([isPaired, isReady, pairedDevices])
if (isPaired) {
  if (pairedDevices.length > 0) {
    for (const device of pairedDevices) {
      const tunnelUrl = await wsService.fetchCurrentTunnelUrl(device.id);
      if (tunnelUrl) {
        await pairingService.setRelayUrl(wsUrl);
      }
    }
  }
  wsService.connect();
  notificationService.registerForPushNotifications();
}
```

Handles: fresh app launch. Loads identity from SecureStore, fetches tunnel URL from Supabase, connects.

---

## CLI-Side Session Preservation

### Session TTL (30 minutes)

When mobile disconnects due to network interruption (not graceful close), the CLI preserves taken-over sessions for 30 minutes:

```typescript
// index.ts - wsClient.on('disconnected')
const isGraceful = reason === 'client namespace disconnect';
if (isGraceful) {
  claudeProcessManager.cleanupAllPermissionState();
  claudeProcessManager.clearAllTakenOver();
} else {
  // Network interruption — keep sessions for 30 min
  claudeProcessManager.startSessionTTL(30 * 60 * 1000);
}
```

When mobile reconnects, the CLI cancels the TTL:

```typescript
// index.ts - wsClient.on('connected')
claudeProcessManager.cancelSessionTTL();
```

### Pairing Code Preservation

On tunnel restart, `TunnelNotifier` preserves the existing pairing code:

```typescript
// tunnel-notifier.ts - notifyTunnelUrl()
const upsertData: any = {
  device_id: deviceId,
  tunnel_url: normalizedUrl,
  provider: 'cloudflared',
  expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
};
// Only set pairing_code when provided — don't overwrite existing code
if (pairingCode) {
  upsertData.pairing_code = pairingCode;
}
```

---

## UI State Management

### Connection Store

`connection.store.ts` tracks `isServerConnected`:

```typescript
// Updated by:
// 1. wsService.on('connected') → isServerConnected = true
// 2. wsService.on('disconnected') → isServerConnected = false
// 3. _layout.tsx foreground handler → setServerConnected(wsService.isConnected)
```

### OfflineBanner

Shows "Connecting to server..." when `isPaired && !isServerConnected`.

The Socket.IO `connect` event handler calls `this.emitInternal('connected')`, which triggers the connection store to set `isServerConnected = true`. No manual `emitInternal('connected')` calls are needed elsewhere.

---

## What Was Fixed (Changelog)

### Fix 1: Connect/Disconnect Loop (Critical)

**Problem:** `pollTunnelUrl` ran every 10 seconds and called `disconnect() + connect()` when socket was disconnected. This killed Socket.IO's in-progress auto-reconnect attempts, creating an infinite connect/disconnect loop (connect → poll fires → disconnect → connect → poll fires → ...).

**Solution:** Separated responsibilities clearly:
- Socket.IO `reconnection` handles same-URL reconnects (network glitches)
- `pollTunnelUrl` only handles **URL changes** (tunnel restarts)
- `pollTunnelUrl` only does same-URL reconnect when `_socketIoGaveUp = true` (Socket.IO exhausted all 10 retries)

Added `_socketIoGaveUp` flag: set by `reconnect_failed` event, cleared on successful `connect`.

**File:** `forkoff-react-native/services/websocket.service.ts`

### Fix 2: Manual emitInternal('connected') Hack Removed

**Problem:** Previous fix added `await new Promise(r => setTimeout(r, 3000)); this.emitInternal('connected')` after reconnect in `pollTunnelUrl`. This was a race-prone hack that could fire before connection was actually established, or fire duplicate events.

**Solution:** Removed the hack entirely. The Socket.IO `connect` event handler already calls `this.emitInternal('connected')` reliably.

**File:** `forkoff-react-native/services/websocket.service.ts`

### Fix 3: Socket.IO Reconnect Configuration

**Problem:** Original config had `maxReconnectAttempts: Infinity` conflicting with manual reconnect logic, later changed to 3 which was too few for mobile networks.

**Solution:** Set to 10 attempts with proper backoff:
- `reconnectionAttempts: 10`
- `reconnectionDelay: 2000` (start at 2s)
- `reconnectionDelayMax: 30000` (max 30s)
- `randomizationFactor: 0.5` (jitter)

**File:** `forkoff-react-native/services/websocket.service.ts`

### Fix 4: Foreground Reconnection with Retry

**Problem:** Original AppState handler only tried reconnecting once. If network wasn't ready yet, the app stayed disconnected.

**Solution:** Added 6-retry loop with 5-second intervals (30 seconds total), fetching fresh tunnel URL each time and directly updating connection store state.

**File:** `forkoff-react-native/app/_layout.tsx`

### Fix 5: Session TTL Extended to 30 Minutes

**Problem:** Original 5-minute TTL was too short — users who put their phone away for 10-15 minutes would lose all taken-over sessions.

**Solution:** Extended to 30 minutes, covering most "phone in pocket" scenarios.

**File:** `forkoff-cli/src/index.ts`

### Fix 6: Pairing Code Flow

**Problem:** The onboarding `add-device.tsx` page required both relay address and pairing code, confusing users who just had a code.

**Solution:** "Enter Code" button now redirects to `device/pair.tsx?method=code`, which has the proper pairing flow with only a code field.

**File:** `forkoff-react-native/app/(onboarding)/add-device.tsx`, `forkoff-react-native/app/device/pair.tsx`

### Fix 7: Pairing Code Preservation on Tunnel Restart

**Problem:** `TunnelNotifier.notifyTunnelUrl()` always set `pairing_code` in the upsert, overwriting it with `null` on tunnel restart (no code provided on restart).

**Solution:** Only include `pairing_code` in upsert data when explicitly provided.

**File:** `forkoff-cli/src/tunnel-notifier.ts`

### Fix 8: Dead Code Removed

**Removed:** `checkTunnelUrlOnDisconnect()` method — caused race conditions with `pollTunnelUrl` (both tried to handle reconnection simultaneously). All reconnect handling now goes through `pollTunnelUrl` + AppState foreground handler.

**Removed:** `_tunnelCheckInProgress` flag (only used by deleted method).

**File:** `forkoff-react-native/services/websocket.service.ts`

### Fix 9: Environment Variable Configuration

**Problem:** `tunnel-notifier.ts` had hardcoded Supabase credentials.

**Solution:** Changed to use environment variables with fallback chain:
```typescript
const supabaseUrl = process.env.FORKOFF_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.FORKOFF_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
```

**File:** `forkoff-cli/src/tunnel-notifier.ts`

---

## Testing Checklist

1. **Normal pairing** — QR code scan, confirm E2EE established, sessions usable
2. **Manual pairing code** — Enter code on `device/pair.tsx?method=code`, confirm connection
3. **App background/foreground** — Switch to background 20+ seconds, return → auto-reconnect
4. **WiFi off/on** — Disable WiFi 10+ seconds, re-enable → auto-reconnect
5. **Tunnel restart** — Kill cloudflared process → CLI restarts tunnel → mobile reconnects to new URL within 30s
6. **App kill + relaunch** — Force close app, reopen → cold start connects, sessions preserved (within 30 min TTL)
7. **Long-term background (30+ min)** — Background app for 30+ minutes → foreground → connection re-establishes, sessions may need re-take-over
8. **UI state** — After any reconnect scenario, OfflineBanner should not show "Connecting to server..."
