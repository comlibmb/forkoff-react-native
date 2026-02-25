# Tool Rendering Architecture

How Claude Code tool operations are displayed in the mobile chat.

## Overview

The `ToolUseBlock` orchestrator (`components/claude/tools/ToolUseBlock.tsx`) routes each `tool_use` transcript entry to a specialized display component based on `toolName`. This replaces the previous inline rendering in the session screen.

## Component Mapping

| Tool Name | Component | Visual Style |
|---|---|---|
| `Bash` | `BashToolBlock` | Terminal-styled `$ command` with dark background |
| `Edit` | `EditToolBlock` | Inline diff: red deletions + green additions |
| `Read` | `ReadToolBlock` | File path + line range, green accent |
| `Write` | `WriteToolBlock` | Green addition lines (new file diff style) |
| `Grep`, `Glob` | `SearchToolBlock` | Pattern always visible, blue accent |
| `EnterPlanMode` | `PlanModeBlock` | Blue banner "Entering Plan Mode" (not collapsible) |
| `ExitPlanMode` | `PlanModeBlock` | Green banner "Plan Complete" (not collapsible) |
| `TaskCreate`, `TaskUpdate`, `TaskList`, `TaskGet`, `TaskStop` | `TaskToolBlock` | Task subject/status with list icon, purple accent |
| Everything else | `GenericToolBlock` | Tool name + optional file name, neutral gray |

## File Structure

```
components/claude/tools/
  ToolUseBlock.tsx          — Orchestrator: routes to correct renderer
  BashToolBlock.tsx         — Terminal-styled command display
  EditToolBlock.tsx         — Inline diff (old_string → new_string)
  ReadToolBlock.tsx         — File path + line range display
  SearchToolBlock.tsx       — Grep/Glob pattern display
  PlanModeBlock.tsx         — Plan mode enter/exit banner (inline in chat)
  TaskToolBlock.tsx         — Inline task operations
  WriteToolBlock.tsx        — New file content as green additions
  GenericToolBlock.tsx      — Fallback for unknown tools

components/claude/PlanModeBanner.tsx  — Session-level banner when plan mode is active
```

## Plan Mode

Plan mode is tracked at the session level by scanning entries for the most recent `EnterPlanMode` or `ExitPlanMode` tool_use:

- **Inline**: `PlanModeBlock` renders a non-collapsible banner in the chat flow
- **Session panel**: `PlanModeBanner` shows "Plan Mode Active" above the message list (alongside TaskProgress)
- **StatusBar**: Activity state `'planning'` with clipboard icon and blue accent

## Adding a New Tool Renderer

1. Create `components/claude/tools/MyToolBlock.tsx` with props: `isExpanded`, `onToggleExpand`, plus tool-specific fields
2. Add a `testID` to the root View for testing
3. Add routing in `ToolUseBlock.tsx` — check `toolName` and render the new component
4. Add icon mocks to `jest.setup.js` if using new lucide icons
5. Create test file in `__tests__/components/claude/tools/MyToolBlock.test.tsx`
6. Optionally add a new `ActivityState` to `StatusBar.tsx` if the tool needs a distinct status indicator

## Color Conventions

Each tool type uses a consistent accent color from the StatusBar activity config:

| Tool Type | Accent Color | Matches StatusBar State |
|---|---|---|
| Bash/Running | `colors.error[400]` (red) | `running` |
| Edit/Write | `colors.warning[400]` (amber) / `colors.primary[400]` (violet) | `editing` / `writing` |
| Read | `colors.success[400]` (green) | `reading` |
| Grep/Glob | `colors.info[400]` (blue) | `searching` |
| Plan Mode | `colors.info[400]` (blue) / `colors.success[400]` (green) | `planning` |
| Task | `colors.primary[400]` (violet) | `formulating` |
| Generic | `colors.dark[300]` (gray) | `responding` |
