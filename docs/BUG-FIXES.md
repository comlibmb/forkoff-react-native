# Bug Fixes

Documented bugs found and fixes applied.

---

## Bug 1: Elevated Privilege Mode (`dangerouslySkipPermissions` not threaded)

**Symptom:** User toggles "Unrestricted Mode" on mobile, but Claude Code still runs with `--permission-mode acceptEdits` because the `dangerouslySkipPermissions` flag was dropped at every layer.

**Root Cause:** The flag was sent by the mobile app but:
1. Backend gateway handlers (`handleClaudeStartSession`, `handleClaudeResumeSession`) didn't include it in the data interface or forwarded payload
2. CLI `startSession()` and `resumeSession()` didn't accept the parameter
3. CLI event handlers in `index.ts` didn't pass `data.dangerouslySkipPermissions` to the process manager
4. The flag wasn't preserved across process respawns (CLI kills and respawns Claude for each message due to SDK 1-turn limitation)

**Fix:**
- **Backend** (`websocket.gateway.ts`): Added `dangerouslySkipPermissions?: boolean` to both handler data interfaces, forwarded in payload with `?? false` default
- **CLI** (`claude-process.ts`):
  - Added `dangerouslySkipPermissions` to `ClaudeProcessInfo` and `SessionRestartInfo` interfaces
  - `startSession()`: Accepts flag, conditionally pushes `--dangerouslySkipPermissions` to spawn args
  - `resumeSession()`: Accepts flag, uses `--dangerouslySkipPermissions` instead of `--permission-mode acceptEdits` when true
  - `registerSession()`: Accepts and stores flag
  - `sendInput()`: Reads flag from `restartInfo.dangerouslySkipPermissions` and passes to `resumeSession()`
  - Close handler: Preserves `dangerouslySkipPermissions` from `processInfo` into `closedSessions`
- **CLI** (`index.ts`): Both `claude_start_session` and `claude_resume_session` handlers pass `data.dangerouslySkipPermissions`

**Files changed:** `websocket.gateway.ts`, `claude-process.ts`, `index.ts`

---

## Bug 2: False Approval Dialogs in SDK Mode

**Symptom:** In SDK mode, every `tool_use` message from Claude triggered a blocking approval dialog on mobile. When user tapped "Yes", a raw `'y'` character was written to stdin, which JSONL mode interpreted as a malformed message. The tool had already executed, so the response went nowhere.

**Root Cause:** Two problems:
1. `checkForToolUseInSdkMessage()` treated every `tool_use` block as a `claude_approval_request`, creating pending approvals with timeouts — but these were informational, not blocking
2. `checkForApprovalPattern()` used regex to detect `[y]es, [n]o` patterns in raw output — but SDK mode output is JSON, and approval-like strings inside JSON triggered false positives
3. `handleApprovalResponse()` wrote raw characters to stdin — but SDK mode only accepts JSONL input, so raw chars corrupted the stream

**Fix:**
- **`checkForToolUseInSdkMessage()`**: Completely refactored to emit a new `tool_activity` event instead of `claude_approval_request`. No pending approval tracking, no timeouts — just a non-blocking notification
- **`checkForApprovalPattern()`**: Disabled entirely (early return) — all current processes are SDK mode
- **`handleApprovalResponse()`**: Added guard — logs a warning instead of writing to stdin for SDK processes
- **New event**: `tool_activity` with `{ terminalSessionId, sessionKey, toolName, toolId, inputSummary }`
- **CLI websocket**: Added `sendToolActivity()` method
- **CLI index.ts**: Added `tool_activity` event handler
- **Backend**: Added `handleToolActivity()` gateway handler that forwards to `user:<userId>`
- **Mobile**: Added `tool_activity` to `EventCallbacks`, registered in `setupListeners()`, session screen uses it to update activity status bar (non-blocking)

**Files changed:** `claude-process.ts`, `websocket.ts` (CLI), `index.ts` (CLI), `websocket.gateway.ts` (API), `websocket.service.ts` (mobile), `[sessionKey].tsx` (mobile)

---

---

## Bug 3: `interactivePermissions` flag not sent on session resume

**Symptom:** After implementing the hook-based permission system, the CLI never configured hooks because it never received `interactivePermissions: true`. Permission prompts were never generated, and users saw no approval UI.

**Root Cause:** The `claude_resume_session` emit (session screen line 1038) only sent `dangerouslySkipPermissions` — it never included `interactivePermissions`. Same for `user_message` in auto-prompt flow.

**Fix:**
- **Mobile** (`[sessionKey].tsx`): Added `interactivePermissions: !sessionUnrestricted` to `claude_resume_session` emit, auto-prompt `sendUserMessage`, and regular `sendUserMessage`
- **Mobile** (`websocket.service.ts`): Added `interactivePermissions?: boolean` to `sendUserMessage` options
- **CLI** (`index.ts`): Pass `data.interactivePermissions` through `user_message` handler to `startAndSendMessage`

---

## Bug 4: Permission prompt silently filtered out (session key mismatch)

**Symptom:** Push notification arrived saying "Claude needs to use Write" but no in-app approval modal appeared.

**Root Cause:** The session screen's event filter for `permission_prompt` used:
```typescript
if (data.sessionKey && data.sessionKey !== sessionKey) return;
```
The CLI set `sessionKey` to the real Claude session ID (`de50fdc7-...`) but the mobile's route param was the mobile-generated key (`brainstorm-1770921795921`). They didn't match, so the event was silently dropped. However, `data.terminalSessionId` DID match.

**Fix:** Updated all event filters to check both keys:
```typescript
if (data.sessionKey && data.sessionKey !== sessionKey && data.terminalSessionId !== sessionKey) return;
```
Applied to: `permission_prompt`, `tool_activity`, `thinking_content`, `token_usage`, `task_progress`

Also added `terminalSessionId?: string` to `ThinkingContentEvent`, `TokenUsageEvent`, and `TaskProgressEvent` interfaces.

**Files changed:** `[sessionKey].tsx`, `websocket.service.ts`

---

## Bug 5: Hook script returning deny instead of allow ("unreachable" error)

**Symptom:** User approved Write permission on mobile, CLI received "allow", but Claude Code still got a deny. Transcript showed: `PreToolUse:Write hook error: [forkoff-hook] Error: unreachable`

**Root Cause:** The hook's `respond()` function used:
```typescript
process.stdout.write(JSON.stringify(output) + '\n', () => {
  process.exit(decision === 'allow' ? 0 : 2);
});
throw new Error('unreachable'); // THIS FIRES IMMEDIATELY!
```
`process.stdout.write()` is async — the throw executes before the write callback, caught by the error handler which sends deny with "unreachable" message.

**Fix:** Changed to synchronous write:
```typescript
fs.writeSync(1, JSON.stringify(output) + '\n');
process.exit(decision === 'allow' ? 0 : 2);
```
Applied to both `respond()` and the `main().catch()` handler.

**Files changed:** `forkoff-cli/src/tools/permission-hook.ts`

---

## Bug 6: Session loading shows empty state prematurely

**Symptom:** When entering a session, the loading animation ends but the screen shows "It's quiet in here" (empty state) for 5-10 seconds before messages appear.

**Root Cause:** Three issues:
1. `sdk_session_history` handler did `setEntries(data.entries || [])` which wiped optimistic entries added by auto-prompt
2. The 3-second loading timeout was too aggressive — CLI history responses often take 4-5 seconds
3. No distinction between "empty and waiting" vs "genuinely empty" states

**Fix:**
- **Race condition**: `sdk_session_history` handler now merges with existing optimistic entries (`local-*` and `auto-*` prefixed IDs) instead of overwriting
- **Timeout**: Increased from 3s to 10s
- **Contextual empty state**: Added a third render branch — when `entries.length === 0` AND `isWaitingForResponse || autoPromptSent || isTakingOver`, show `TerminalLoader variant="minimal"` ("Waiting for Claude...") instead of the empty state

**Files changed:** `[sessionKey].tsx`

---

## Testing

Tests for bugs 1-2 are in `forkoff-cli/src/__tests__/tools/claude-process.test.ts`:
- **Bug 1** (7 tests): Verifies flag threading through `startSession`, `resumeSession`, `registerSession`, and `sendInput` respawn path
- **Bug 2** (7 tests): Verifies `tool_activity` emission, no false `claude_approval_request`, disabled regex detection, and guarded stdin writes

Tests for the hook system are in `forkoff-cli/src/__tests__/tools/`:
- `permission-hook.test.ts` — `loadRules()`, `matchesAnyPattern()`, glob matching, dynamic rule loading
- `permission-ipc.test.ts` — IPC polling, request/response file management
- `claude-process.test.ts` — `updatePermissionRules()`, hook configuration
