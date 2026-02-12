# Permission Model

How ForkOff manages Claude Code permission modes across the mobile app, backend, and CLI.

## Permission Modes

Claude Code supports these permission modes via `--permission-mode`:

| Mode | Behavior |
|---|---|
| `default` | Prompts for every tool use (file edits, bash, etc.) |
| `acceptEdits` | Auto-approves file edits, prompts for bash/dangerous ops |
| `bypassPermissions` | Auto-approves everything except destructive operations |
| `plan` | Plan-only mode, no execution |

Additionally, `--dangerouslySkipPermissions` bypasses ALL permission checks, including destructive operations.

## Interactive Permissions (Hook-Based Approval)

When unrestricted mode is OFF, ForkOff uses Claude Code's `PreToolUse` hook system to intercept tool calls and route approval decisions through the mobile app.

### Architecture

```
Claude Code Process
    │ (wants to use Bash)
    ▼
Spawns PreToolUse hook script (permission-hook.ts)
    │
    ├── Reads tool info from stdin JSON
    ├── Checks user-configured rules (rules.json)
    │   ├── Safe tool? → Auto-approve (exit 0)
    │   ├── Bash with matching pattern? → Auto-approve
    │   └── Dangerous tool? → Write .request.json, poll for .response.json
    │
    │   (Main CLI process detects .request.json)
    │   ├── Forwards to mobile via WebSocket (permission_prompt)
    │   ├── Mobile shows PermissionQueue modal
    │   ├── User taps Approve/Deny
    │   ├── Response flows back to CLI (permission_response)
    │   └── CLI writes .response.json
    │
    ├── Reads .response.json
    ├── Outputs JSON decision to stdout (fs.writeSync for sync write)
    └── Exits with code 0 (allow) or 2 (deny)
    │
    ▼
Claude Code executes (or blocks) tool
```

### Key Files

- **Hook script**: `forkoff-cli/src/tools/permission-hook.ts` — Standalone Node.js script spawned by Claude Code
- **IPC manager**: `forkoff-cli/src/tools/permission-ipc.ts` — Polls for `.request.json` files, manages responses
- **CLI process**: `forkoff-cli/src/tools/claude-process.ts` — Spawns Claude with hook configured, manages IPC lifecycle
- **CLI main**: `forkoff-cli/src/index.ts` — Routes `permission_prompt`/`permission_response` between IPC and WebSocket
- **Mobile session**: `forkoff/app/claude/session/[sessionKey].tsx` — Listens for prompts, shows approval UI
- **Mobile UI**: `forkoff/components/claude/PermissionQueue.tsx` — Modal queue for pending approvals

### IPC Mechanism (Temp File Polling)

The hook script and main CLI process communicate via temp files in `os.tmpdir()/forkoff-permissions/`:

1. Hook writes `<promptId>.request.json` with tool details
2. Main CLI detects the file, forwards to mobile via WebSocket
3. Mobile user approves/denies
4. Response flows back to CLI via WebSocket
5. CLI writes `<promptId>.response.json` with decision
6. Hook reads response, outputs to stdout, exits

Both files are cleaned up after use.

### Critical Implementation Detail: Synchronous stdout

The hook's `respond()` function **must** use `fs.writeSync(1, ...)` (synchronous write to fd 1 = stdout), NOT `process.stdout.write()` (async). Using async write with `process.exit()` causes a race condition where the process exits before the write completes, resulting in Claude Code receiving no output and treating it as an error.

## Configurable Permission Rules

Users can configure which tools auto-approve vs require manual approval from the mobile Settings screen.

### Rule Structure

```typescript
interface PermissionRule {
  tool: string;           // e.g. 'Read', 'Bash', 'Write'
  action: 'allow' | 'ask'; // auto-approve or require approval
  patterns?: string[];    // For Bash: glob patterns that auto-approve
}
```

### Default Rules

- **Auto-approve (allow)**: Read, Glob, Grep, WebSearch, WebFetch, TaskCreate, TaskUpdate, TaskGet, TaskList, TaskOutput, TaskStop, AskUserQuestion, Skill, EnterPlanMode, ExitPlanMode, mcp__ide__getDiagnostics, mcp__ide__executeCode
- **Require approval (ask)**: Bash, Write, Edit, NotebookEdit

### Bash Command Patterns

When Bash is set to "ask", users can add glob patterns for commands that should auto-approve:
- `npm *` — auto-approves `npm test`, `npm install`, etc.
- `git status` — auto-approves exactly `git status`
- `ls *` — auto-approves any `ls` command

Pattern matching uses simple glob: `*` matches any sequence of characters.

### Sync Flow

```
Mobile (permission-rules.store)  →  Backend (relay)  →  CLI (writes rules.json)
        │                                                      │
        ├── On session start/take-over                         ├── Writes to
        │   emits permission_rules_sync                        │   os.tmpdir()/forkoff-permissions/rules.json
        │   with current rules                                 │
        │                                                      └── Hook script reads rules.json
        │                                                          on each invocation
```

### Key Files

- **Mobile store**: `forkoff/stores/permission-rules.store.ts` — Zustand + AsyncStorage persistence
- **Mobile UI**: `forkoff/app/settings/permissions.tsx` — Settings screen for configuring rules
- **CLI process**: `forkoff-cli/src/tools/claude-process.ts` — `updatePermissionRules()` writes rules.json
- **Hook script**: `forkoff-cli/src/tools/permission-hook.ts` — `loadRules()` reads rules.json, falls back to defaults

## Unrestricted Mode Flow

When a user toggles "Unrestricted Mode" on mobile:

```
Mobile (session screen)           Backend (gateway)           CLI (claude-process.ts)
─────────────────────            ──────────────────          ───────────────────────
Toggle ON sets                   Receives event with         Receives event with
sessionUnrestricted=true         dangerouslySkipPermissions  dangerouslySkipPermissions
        │                                │                           │
        ├── claude_resume_session ───────┤── forwards flag ──────────┤
        │   { dangerouslySkipPerm..     │   to device room          │── pushes
        │     : true,                    │                           │   '--dangerouslySkipPermissions'
        │     interactivePermissions:    │                           │   to spawn args
        │     false }                    │                           │── does NOT configure hooks
        │                                │                           │
        │                                │                           │── stores flag in
        │                                │                           │   closedSessions for respawns
```

When unrestricted mode is OFF, `interactivePermissions: true` is sent:

```
Mobile                            Backend                     CLI
──────                           ───────                     ────
{ dangerouslySkipPerm..          Forwards                    Receives
  : false,                                                   interactivePermissions=true
  interactivePermissions:                                    │
  true }                                                     ├── Configures PreToolUse hook
                                                             ├── Syncs permission rules
                                                             └── Starts IPC polling
```

### Key files

- **Mobile**: `app/claude/session/[sessionKey].tsx` — sends both `dangerouslySkipPermissions` and `interactivePermissions` on take-over, auto-prompt, and user messages
- **Backend**: `websocket.gateway.ts` — forwards both flags
- **CLI**: `tools/claude-process.ts` — `startSession()`, `resumeSession()`, `registerSession()`, `sendInput()` all thread both flags
- **CLI**: `index.ts` — event handlers pass flags to process manager

### Flag preservation across respawns

The CLI spawns a fresh Claude process for each user message (SDK limitation: 1 turn per process with `--resume`). Both `dangerouslySkipPermissions` and `interactivePermissions` flags are stored in `SessionRestartInfo` and passed through `sendInput()` → `resumeSession()` on each respawn.

## SDK Mode and Approval

In SDK mode (`--input-format stream-json`, `--output-format stream-json`), Claude Code does NOT emit interactive text prompts like `[y]es, [n]o`. Instead:

- Tool use is reported via structured JSON `assistant` messages with `tool_use` content blocks
- The PreToolUse hook intercepts before execution
- Raw character writes to stdin (`'y'`, `'n'`) are interpreted as malformed JSONL, not approval responses

This means:
1. The regex-based `checkForApprovalPattern()` is disabled (returns immediately) — it would false-positive on JSON containing approval-like text
2. Tool use is reported as **non-blocking `tool_activity` events** in addition to the hook-based approval system
3. `handleApprovalResponse()` does not write to stdin — it logs a warning instead

## Default Behavior (No Unrestricted Mode)

When unrestricted mode is OFF and interactive permissions are enabled:
- `resumeSession()` spawns Claude with `--permission-mode default` and configures the PreToolUse hook
- Safe tools (per user rules) are auto-approved by the hook script
- Dangerous tools trigger a `permission_prompt` event to mobile
- User approves/denies via the PermissionQueue modal
- Response flows back through the IPC system to the hook script
