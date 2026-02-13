# WebSocket Events Reference

All WebSocket events in ForkOff, with direction, payload shape, and handler locations.

## Event Flow

```
Mobile App  ←──→  Backend (NestJS)  ←──→  CLI
(user-scoped)      (gateway)         (session-scoped)
```

Mobile connects as `clientType: 'user-scoped'` and receives events via `user:<userId>` room.
CLI connects as `clientType: 'session-scoped'` and receives events via `device:<deviceId>` room.

---

## Session Lifecycle Events

### `claude_start_session`
**Direction:** Mobile → Backend → CLI

Start a new Claude session in a directory.

| Field | Type | Description |
|---|---|---|
| `deviceId` | string | Target device |
| `directory` | string | Working directory |
| `terminalSessionId` | string | Unique session ID |
| `dangerouslySkipPermissions` | boolean? | Unrestricted mode flag |

**Backend:** `handleClaudeStartSession()` — forwards to `device:<deviceId>`
**CLI:** `index.ts` `claude_start_session` handler → `claudeProcessManager.startSession()`

### `claude_resume_session`
**Direction:** Mobile → Backend → CLI

Resume an existing session (register for later spawn on first message).

| Field | Type | Description |
|---|---|---|
| `deviceId` | string | Target device |
| `sessionKey` | string | Session to resume |
| `directory` | string | Working directory |
| `terminalSessionId` | string | Unique session ID |
| `dangerouslySkipPermissions` | boolean? | Unrestricted mode flag |
| `interactivePermissions` | boolean? | Enable hook-based approval (mutually exclusive with unrestricted) |

**Backend:** `handleClaudeResumeSession()` — forwards to `device:<deviceId>`
**CLI:** `index.ts` `claude_resume_session` handler → `claudeProcessManager.registerSession()`

### `claude_session_update`
**Direction:** CLI → Backend → Mobile

Session state change notification.

| Field | Type | Description |
|---|---|---|
| `sessionKey` | string | Session identifier |
| `directory` | string | Working directory |
| `state` | `'active' \| 'inactive'` | Session state |
| `lastUsedAt` | string | ISO timestamp |
| `transcriptPath` | string? | Path to transcript file |

### `claude_session_event`
**Direction:** CLI → Backend → Mobile

Session lifecycle events (ready, mode switch, etc.).

| Field | Type | Description |
|---|---|---|
| `sessionKey` | string | Session identifier |
| `event.type` | string | `'ready'`, `'switch'`, `'permission-mode-changed'` |

---

## Message Events

### `user_message`
**Direction:** Mobile → Backend → CLI

User sends a message to Claude.

| Field | Type | Description |
|---|---|---|
| `deviceId` | string | Target device |
| `message` | string | Message content |
| `sessionKey` | string? | Target session |
| `directory` | string? | Working directory (for auto-prompt sessions that spawn fresh) |
| `interactivePermissions` | boolean? | Enable hook-based approval for this session |
| `mode.permissionMode` | string? | Permission mode override |
| `mode.model` | string? | Model override |

### `claude_message`
**Direction:** CLI → Backend → Mobile

Streamed SDK message from Claude.

| Field | Type | Description |
|---|---|---|
| `sessionKey` | string | Session identifier |
| `message.id` | string | Message ID |
| `message.type` | string | `'user'`, `'assistant'`, `'tool_use'`, `'tool_result'` |
| `message.content` | string? | Text content |
| `message.toolName` | string? | Tool name (for tool_use) |
| `message.toolInput` | any? | Tool input (for tool_use) |
| `message.partial` | boolean? | Whether this is a partial (streaming) message |

> **Tool Rendering:** Messages with `type: 'tool_use'` are rendered by `ToolUseBlock` in the mobile app. Plan mode tools (`EnterPlanMode`/`ExitPlanMode`) receive special banner treatment instead of the standard collapsible block. See `docs/TOOL-RENDERING.md` for the full component mapping.

---

## Tool Activity Events

### `tool_activity` (new)
**Direction:** CLI → Backend → Mobile

Non-blocking notification that Claude is using a tool. Replaces the old `claude_approval_request` for SDK tool_use detections.

| Field | Type | Description |
|---|---|---|
| `terminalSessionId` | string | Terminal session |
| `sessionKey` | string? | Session identifier |
| `toolName` | string | Tool being used (e.g., `Read`, `Bash`, `Glob`) |
| `toolId` | string | Tool use block ID |
| `inputSummary` | string | Human-readable summary (e.g., `File: /path/to/file.ts`) |
| `deviceId` | string? | Added by backend |
| `timestamp` | string? | Added by backend |

**CLI:** `claude-process.ts` `checkForToolUseInSdkMessage()` → emits `tool_activity`
**CLI:** `index.ts` forwards via `wsClient.sendToolActivity()`
**Backend:** `handleToolActivity()` — forwards to `user:<userId>`
**Mobile:** `websocket.service.ts` listens, session screen updates activity status bar

---

## Approval Events

### `claude_approval_request`
**Direction:** CLI → Backend → Mobile

Real permission approval request (only from non-SDK mode processes, currently unused).

| Field | Type | Description |
|---|---|---|
| `approvalId` | string | Unique approval ID |
| `terminalSessionId` | string | Terminal session |
| `sessionKey` | string? | Session identifier |
| `context` | string[] | Recent output lines |
| `options` | string[] | Available options (e.g., `['y:yes', 'n:no', 'p:plan']`) |
| `promptText` | string | The prompt text |

> **Note:** In SDK mode, tool_use is now reported via `tool_activity` instead. This event is retained for potential future non-SDK use.

### `claude_approval_response`
**Direction:** Mobile → Backend → CLI

User responds to an approval request.

| Field | Type | Description |
|---|---|---|
| `approvalId` | string | Approval being responded to |
| `response` | string | Response character (`'y'`, `'n'`, `'p'`) |
| `deviceId` | string? | Target device |
| `sessionKey` | string? | Target session |

### `permission_prompt`
**Direction:** CLI → Backend → Mobile

Hook-based permission request. The CLI's IPC manager detects a `.request.json` from the PreToolUse hook and forwards it to mobile.

| Field | Type | Description |
|---|---|---|
| `promptId` | string | Unique prompt ID (matches temp file name) |
| `terminalSessionId` | string | Terminal session |
| `sessionKey` | string? | Claude's internal session ID |
| `toolName` | string | Tool being requested (`Bash`, `Write`, `Edit`, etc.) |
| `toolInput` | any | Tool input details |
| `toolUseId` | string | Claude's tool_use block ID |
| `deviceId` | string? | Added by backend |

**CLI:** `permission-ipc.ts` detects `.request.json` → `index.ts` emits via WebSocket
**Backend:** `handlePermissionPrompt()` — forwards to `user:<userId>`
**Mobile:** Session screen listens, adds to `permissionQueue` state, shows `PermissionQueue` modal

### `permission_response`
**Direction:** Mobile → Backend → CLI

User responds to a hook-based permission prompt.

| Field | Type | Description |
|---|---|---|
| `promptId` | string | Prompt being responded to |
| `decision` | `'allow' \| 'deny'` | User's decision |
| `reason` | string? | Reason for decision |
| `deviceId` | string? | Source device |
| `sessionKey` | string? | Target session |

**Mobile:** `websocket.service.ts` `respondToPermissionPrompt()` emits this event
**Backend:** `handlePermissionResponse()` — forwards to `device:<deviceId>`
**CLI:** `index.ts` receives, writes `.response.json` via IPC manager → hook script reads it

### `pending_permissions_sync`
**Direction:** CLI → Backend → Mobile

Sync pending permission prompts when mobile takes over or reconnects. Catches up on any prompts that arrived before mobile was listening.

| Field | Type | Description |
|---|---|---|
| `sessionKey` | string | Session identifier |
| `prompts` | array | Array of pending prompts (same shape as `permission_prompt`) |

### `permission_rules_sync`
**Direction:** Mobile → Backend → CLI

Sync user-configured permission rules to the CLI. Sent on session start, take-over, and when rules change.

| Field | Type | Description |
|---|---|---|
| `deviceId` | string | Target device |
| `sessionKey` | string | Session identifier |
| `terminalSessionId` | string | Terminal session |
| `rules` | PermissionRule[] | Array of `{ tool, action, patterns? }` rules |

**Mobile:** Sent from session screen on take-over and auto-prompt
**Backend:** Relays to `device:<deviceId>`
**CLI:** `index.ts` receives, calls `claudeProcessManager.updatePermissionRules(rules)` which writes `rules.json`

---

## Transcript Events

### `transcript_fetch`
**Direction:** Mobile → Backend → CLI

Request transcript history for a session.

### `transcript_history`
**Direction:** CLI → Backend → Mobile

Response with transcript entries.

### `transcript_subscribe` / `transcript_unsubscribe`
**Direction:** Mobile → Backend → CLI

Subscribe/unsubscribe to live transcript updates.

### `transcript_update`
**Direction:** CLI → Backend → Mobile

New transcript entry.

---

## Status Events

### `device_heartbeat`
**Direction:** CLI → Backend

Keep-alive heartbeat with device status.

### `tool_status_update`
**Direction:** CLI → Backend → Mobile

Tool availability change (e.g., Claude active/inactive).

### `thinking_content`
**Direction:** CLI → Backend → Mobile

Extended thinking text from Claude (streamed).

### `token_usage`
**Direction:** CLI → Backend → Mobile

Token usage for a turn.

### `task_progress`
**Direction:** CLI → Backend → Mobile

Task list progress updates (created, updated, completed).

---

## Other Events

### `session_connected` / `session_disconnected`
CLI session lifecycle.

### `session_alive`
Keep-alive from CLI with thinking/mode state.

### `limit_reached`
Server-side rate limit enforcement.

### `prompt_queued` / `queue_item_executing` / `queue_item_executed` / `queue_updated`
Prompt queue events for rate-limited sessions.
