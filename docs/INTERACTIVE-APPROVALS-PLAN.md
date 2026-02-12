# Plan: Full Interactive Approval System

> **Status: IMPLEMENTED** — This plan has been fully implemented. See `docs/PERMISSION-MODEL.md` for current documentation of the system.

## The Problem

When unrestricted mode is OFF, Claude tries to use tools (Bash, Write, etc.) that get silently blocked by `--permission-mode acceptEdits`. The user on mobile sees nothing — no notification, no approval prompt, no way to allow the action. The action just fails silently.

**Expected behavior:** Mobile user gets a notification showing what Claude wants to do, with options to Approve or Deny. If approved, the tool executes. If denied, Claude gets an error result.

## Key Discovery: `--permission-prompt-tool stdio`

Claude Code has a built-in mechanism for exactly this: `--permission-prompt-tool stdio`. When this flag is set:

1. Instead of showing an interactive text prompt, Claude Code writes a **JSON permission request** to a designated handler via stdin/stdout
2. The handler reads the request, makes a decision, and outputs a **JSON response**
3. Claude Code reads the response and either allows or blocks the tool

The JSON format:
```json
// Permission request (Claude Code → handler):
{
  "tool_name": "Bash",
  "tool_input": { "command": "rm -rf /tmp/test" },
  "tool_use_id": "toolu_01ABC"
}

// Permission response (handler → Claude Code):
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",  // or "deny"
    "permissionDecisionReason": "User approved via mobile"
  }
}
// Exit code 0 = allow the decision, Exit code 2 = block
```

## Architecture

```
Claude Code Process
    │
    ├── --permission-prompt-tool stdio
    │   (blocks waiting for permission decision)
    │
    ▼
Permission Handler (child process spawned by our CLI)
    │
    ├── Reads JSON permission request from stdin
    ├── Emits WebSocket event: permission_prompt
    │       │
    │       ▼
    │   Backend Gateway → Mobile App
    │       │
    │       ├── Shows approval modal with tool details
    │       ├── User taps Approve/Deny
    │       │
    │       ▼
    │   Mobile → Backend → CLI WebSocket
    │       │
    │       ▼
    ├── Receives permission_response event
    ├── Writes JSON decision to stdout
    └── Exits with code 0 (allow) or 2 (block)
    │
    ▼
Claude Code Process continues (tool executes or gets error)
```

**Wait — simpler approach:** We don't need a separate child process. The `--permission-prompt-tool` can also be implemented as a **hook** in Claude Code's hooks system. But even simpler: we can spawn Claude with `--permission-mode default` and use the hooks system (`PreToolUse` hook) to intercept permission requests.

### Simplest Approach: PreToolUse Hook as IPC

Actually, the cleanest way is:

1. **CLI creates a small hook script** (Node.js) that:
   - Reads the hook JSON from stdin (tool name, input, etc.)
   - Writes a temp file or uses a named pipe/socket to communicate with the main CLI process
   - Main CLI process forwards the request to mobile via WebSocket
   - Waits for mobile response (with timeout)
   - Outputs the permission decision JSON to stdout
   - Exits with appropriate code

2. **CLI registers the hook** by writing to `.claude/hooks.json` or passing via `--permission-prompt-tool`

But hooks run as separate processes, which adds complexity. Let me think about the simplest viable approach...

### Recommended Approach: Use `--permission-mode default` + Intercept SDK Messages

Actually, re-reading the Claude Code docs more carefully:

When using `--permission-mode default` with `--output-format stream-json`, Claude Code emits a **special SDK message** when it needs permission. The `result` message includes `permission_denials` showing what was blocked. But that's AFTER the fact.

**The actual mechanism** is: Claude Code checks permissions BEFORE executing. With `--permission-prompt-tool stdio`, it spawns a subprocess and waits for a decision.

### Final Recommended Architecture

```
                        CLI Process (index.ts)
                              │
                    spawns Claude with:
                    --permission-prompt-tool <path-to-hook-script>
                    --permission-mode default
                              │
                              ▼
                    Claude Code Process
                        │
                        │ (wants to use Bash)
                        │
                        ▼
                    Spawns hook script
                    (permission-hook.ts)
                        │
                        ├── Reads tool info from stdin
                        ├── Connects to CLI via IPC (localhost TCP or temp file)
                        ├── CLI forwards to mobile via WebSocket
                        │       │
                        │       ▼
                        │   Mobile shows approval modal
                        │   User taps Approve/Deny
                        │       │
                        │       ▼
                        │   Response flows back to CLI via WebSocket
                        │   CLI writes response to IPC
                        │       │
                        ├── Reads response from IPC
                        ├── Outputs JSON decision to stdout
                        └── Exits with code 0 or 2
                        │
                        ▼
                    Claude Code executes (or blocks) tool
```

## Implementation Steps

### Step 1: Create the permission hook script (`src/tools/permission-hook.ts`)

A standalone Node.js script that:
- Reads hook context JSON from stdin
- Extracts `tool_name`, `tool_input`, `tool_use_id`
- Connects to the main CLI process via a local TCP server (localhost:PORT)
- Sends the permission request
- Waits for response (with 5-minute timeout)
- Outputs the decision JSON to stdout
- Exits with code 0 (allow decision) or 2 (block)

### Step 2: Add IPC server to CLI (`src/tools/permission-ipc.ts`)

A simple TCP server on localhost that:
- Listens on a random port (writes port to a known temp file)
- Accepts connections from hook scripts
- Routes permission requests to the WebSocket client
- Routes WebSocket responses back to the hook script
- Handles timeouts (auto-deny after 5 minutes)

### Step 3: Update claude-process.ts

- When `dangerouslySkipPermissions` is FALSE:
  - Start the IPC server
  - Spawn Claude with `--permission-prompt-tool <hook-script-path>` and `--permission-mode default`
  - The hook script path points to the compiled permission-hook.js
- When `dangerouslySkipPermissions` is TRUE:
  - Keep current behavior: `--dangerouslySkipPermissions` flag, no hook

### Step 4: Add WebSocket events

**CLI → Backend → Mobile:**
```typescript
// permission_prompt event
{
  promptId: string;        // Unique ID for this prompt
  terminalSessionId: string;
  sessionKey?: string;
  toolName: string;        // "Bash", "Write", "Edit", etc.
  toolInput: any;          // { command: "npm install" } or { file_path: "..." }
  toolUseId: string;       // Claude's tool_use_id
}
```

**Mobile → Backend → CLI:**
```typescript
// permission_response event
{
  promptId: string;
  decision: 'allow' | 'deny';
  reason?: string;         // Optional user reason
}
```

### Step 5: Update mobile app

- The existing `PermissionRequest` component (`components/claude/PermissionRequest.tsx`) already has the UI for approval modals
- Wire it to listen for `permission_prompt` events
- Send `permission_response` when user taps Approve/Deny

### Step 6: Backend gateway

- Add `@SubscribeMessage('permission_prompt')` handler (CLI → mobile)
- Add `@SubscribeMessage('permission_response')` handler (mobile → CLI)
- Both route through `user:<userId>` room

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `forkoff-cli/src/tools/permission-hook.ts` | **CREATE** | Standalone hook script for Claude Code |
| `forkoff-cli/src/tools/permission-ipc.ts` | **CREATE** | Local TCP IPC server |
| `forkoff-cli/src/tools/claude-process.ts` | MODIFY | Spawn with hook flag, manage IPC lifecycle |
| `forkoff-cli/src/index.ts` | MODIFY | Wire permission events between IPC and WebSocket |
| `forkoff-cli/src/websocket.ts` | MODIFY | Add sendPermissionPrompt(), listen for permission_response |
| `forkoff-api/src/websocket/websocket.gateway.ts` | MODIFY | Add permission_prompt + permission_response handlers |
| `forkoff/services/websocket.service.ts` | MODIFY | Add permission_prompt to EventCallbacks |
| `forkoff/app/claude/session/[sessionKey].tsx` | MODIFY | Wire PermissionRequest component to new events |

## Difficulty Assessment

**Medium-hard.** The main challenges:

1. **IPC between hook subprocess and main CLI** — Hook runs as a separate process spawned by Claude Code, so it can't directly access the WebSocket. Need a local TCP/IPC bridge.
2. **Async waiting in a sync hook** — The hook must block until the mobile user responds. Need to hold the TCP connection open.
3. **Timeout handling** — If mobile user doesn't respond in 5 minutes, auto-deny.
4. **Race conditions** — Multiple tools could need permission simultaneously.
5. **Hook script compilation** — The hook script needs to be compiled to JS and included in the npm package.

**Estimated scope:** ~300-400 lines of new code across 2 new files + modifications to 6 existing files. The mobile side is minimal since the `PermissionRequest` component already exists.

## Alternative: Simpler but Less Clean

Instead of IPC, the hook script could:
1. Write the permission request to a temp file (e.g., `/tmp/forkoff-permission-<id>.json`)
2. Poll for a response file (e.g., `/tmp/forkoff-permission-<id>.response.json`)
3. Main CLI process watches for request files, forwards to mobile, writes response files

This avoids TCP but adds filesystem polling latency (~100-500ms). Much simpler to implement though.

## Open Questions (Resolved)

1. ~~Does `--permission-prompt-tool` work with the hook being a path to a JS file?~~ → We used `PreToolUse` hooks in `.claude/settings.json` instead, which is the documented mechanism.
2. ~~Can we use `PreToolUse` hooks in `.claude/hooks.json` instead?~~ → Yes, this is what we implemented. The CLI writes hook config to `.claude/settings.json` with the compiled hook script path.
3. ~~Should we auto-approve "safe" tools?~~ → Yes, implemented with user-configurable rules. Default safe tools: Read, Glob, Grep, WebSearch, WebFetch, all Task tools, etc. Users can customize from Settings > Tool Permissions.

## Implementation Notes (Post-Implementation)

**Approach chosen:** PreToolUse hooks + temp file IPC (the "simpler" alternative mentioned above). This avoids TCP complexity while keeping latency acceptable (~200ms poll interval).

**Key implementation files:**
- `forkoff-cli/src/tools/permission-hook.ts` — Standalone hook script
- `forkoff-cli/src/tools/permission-ipc.ts` — Temp file IPC manager
- `forkoff-cli/src/tools/claude-process.ts` — Hook configuration and lifecycle
- `forkoff/components/claude/PermissionQueue.tsx` — Mobile approval modal
- `forkoff/stores/permission-rules.store.ts` — User-configurable rules
- `forkoff/app/settings/permissions.tsx` — Rules configuration UI

**Critical gotcha:** The hook's `respond()` function must use `fs.writeSync(1, ...)` for synchronous stdout write. `process.stdout.write()` is async and causes a race condition with `process.exit()`. See Bug 5 in `docs/BUG-FIXES.md`.
