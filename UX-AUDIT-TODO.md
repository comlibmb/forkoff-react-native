# UX Audit Todo List

Comprehensive UX audit conducted across all screens, evaluated from 5 user personas:
- **Alex** — Solo indie dev, 1 device, values simplicity
- **Maya** — Senior engineer, multi-device power user
- **Sam** — Multi-project freelancer, many clients, context-switches constantly
- **Jordan** — Junior dev, new to AI coding
- **Priya** — DevOps/infra engineer, monitors servers, wants reliability

---

## Priority Legend
- **P0** — Critical, breaks core experience
- **P1** — High impact, should fix soon
- **P2** — Medium impact, quality-of-life
- **P3** — Low impact, polish

---

## Tab Bar (`app/(tabs)/_layout.tsx`)

- [ ] **P1** — Tab order puts Projects first but new users have 0 projects. Consider making Devices the first tab for users with 0 paired devices, then auto-switch to Projects once they pair.
- [ ] **P2** — No badge/indicator on Projects tab when there's an active session. Add a small dot when any session is ACTIVE for at-a-glance awareness.
- [ ] **P3** — Tab bar height 85px with 28px bottom padding may feel oversized on Android devices without home indicator. Test on various Android phones.

---

## Projects Tab (`app/(tabs)/projects.tsx`)

- [ ] **P0** — Cold start requires manual curation. New users see "No projects in focus" even with 20 projects. Auto-pin all projects on first use (when `pinnedProjects` is empty and projects exist) so default shows everything.
- [ ] **P1** — SlidersHorizontal manage button has no label or tooltip. Jordan/Sam might not discover it. Add a subtle label, tooltip, or first-time hint.
- [ ] **P2** — No search/filter in the manage modal. Sam with 30+ projects across 3 devices has to scroll through entire list. Add search bar for 10+ projects.
- [ ] **P2** — Project count badge says "0 projects" when none pinned but projects exist. Change to "0 of 12 projects" to show total context.
- [ ] **P2** — Scan animation runs every cold start. Cache scan state and skip animation if last scan was < 5 minutes ago. Charming once, tedious on repeat.
- [ ] **P3** — No way to pin/unpin from the project card itself. Swipe-to-remove or context menu would be faster than opening the modal.
- [ ] **P3** — Subtitle "Claude sessions grouped by directory" is developer jargon. Change to "Your active workspaces" or similar.

---

## Devices Tab (`app/(tabs)/devices.tsx`)

- [ ] **P1** — No "last seen" timestamp for offline devices. Priya can't tell if a device went offline 5 minutes or 5 days ago. Add "Last seen 2h ago" to offline device cards.
- [ ] **P2** — Filter pills don't show counts. Add "Online (2)" / "Offline (3)" format.
- [ ] **P2** — No way to delete/unpair a device from the list. Add swipe-to-delete or long-press menu with "Unpair Device".
- [ ] **P2** — ToolBadge only shows Claude-related tools (filter on line 81-84). Show all connected tools so users see the full picture.
- [ ] **P3** — "Add" button doesn't explain the pairing flow. Jordan gets thrown into QR scanner with no preview of what happens next.
- [ ] **P3** — No sorting options. Devices listed in API return order. Add sort by name, status, or last activity.
- [ ] **P3** — Accent bar color meaning (green = online) isn't explained anywhere.

---

## Analytics Tab (`app/(tabs)/analytics.tsx`)

- [ ] **P1** — "Total Tokens" is meaningless to most users. Add context: "~$4.20 this month" or "150K tokens = ~300 pages of text".
- [ ] **P1** — No cost tracking/estimation. Users pay per token. Show estimated cost based on token counts and Anthropic pricing.
- [ ] **P2** — Chart "Usage Trend" doesn't label what the Y-axis measures (tokens? sessions? messages?).
- [ ] **P2** — 30-day hardcoded date range for `fetchDailyUsage` (line 51-58) regardless of `selectedPeriod`. Ensure PeriodSelector actually filters chart data.
- [ ] **P2** — Streak counter has no visual reward. Add flame icon, color change at milestones (compare to Duolingo).
- [ ] **P3** — "No achievements yet" empty state is demotivating. Show "Next achievement: Send 100 messages (72/100)" progress.
- [ ] **P3** — No export or share functionality for usage data.

---

## Settings Tab (`app/(tabs)/settings.tsx`)

- [ ] **P2** — Notifications toggle is fake — `useState(true)` local state on line 122, not persisted. Wire up to actual push notification permissions or a persisted store.
- [ ] **P2** — "Unrestricted Mode" name is scary with unclear scope. Add more context about what it means in practice. Consider moving to a dedicated "Security" section.
- [ ] **P2** — Subscription subtitle "Free plan - Upgrade for more features" is hardcoded (line 342). Fix to reflect actual plan: use `user?.subscription`.
- [ ] **P2** — Too many items (13 across 5 sections). Critical settings buried alongside low-priority items.
- [ ] **P3** — "Usage Analytics" and "Achievements" links duplicate the Analytics tab. Creates confusion about where the "real" home is.
- [ ] **P3** — Prompt Queue is in "Analytics & Achievements" section. It's an active workflow tool, not analytics. Move to its own section or into Projects tab.
- [ ] **P3** — "Redeem Voucher" is rarely used but prominent. Move inside Manage Subscription page.
- [ ] **P3** — Support section only has external links. No in-app FAQ or feedback mechanism.

---

## Device Pairing (`app/device/pair.tsx`)

- [ ] **P2** — Camera permission permanently denied = dead end. Detect permanent denial and show "Open Settings" button via `Linking.openSettings()`.
- [ ] **P2** — No explanation of what "pairing" means. Add brief explainer: "Pairing connects your phone to your computer. Only you can control sessions."
- [ ] **P3** — Code input accepts any characters with no real-time validation feedback. Add character validation hint.
- [ ] **P3** — Success screen "Done" button goes `router.back()` which might not land on Devices tab. Navigate explicitly.
- [ ] **P3** — No QR code timeout handling. If CLI QR expires, show helpful error suggesting to refresh on CLI.

---

## Device Detail (`app/device/[id].tsx`)

- [ ] **P2** — 100% inline styles, no StyleSheet. Every element creates new style objects on every render. Extract to `StyleSheet.create` for performance.
- [ ] **P2** — Connected Tools section filters to Claude tools only (line 399-401). Non-Claude tools are hidden entirely. Show all tools so "Coming soon" badge actually appears.
- [ ] **P3** — Refresh button has no loading indicator or disabled state while refreshing.
- [ ] **P3** — Terminal list doesn't show last command or activity. Sam with 3 terminals can't tell which was running what.
- [ ] **P3** — No max length on device name edit. Could type 200+ characters.
- [ ] **P3** — No way to see device session history. Add a "Sessions" section or link to "View sessions on this device".

---

## Project Hub (`app/project-hub.tsx`)

- [ ] **P0** — Quick Actions are always enabled even when device is offline (`disabled={false}` line 399). Status Check and Brainstorm silently fail. Visually disable buttons when offline.
- [ ] **P1** — No "New Session" or "Continue" quick action. The most common action (start/continue working) requires navigating away. Add a prominent "Continue" primary action.
- [ ] **P2** — CLAUDE.md truncated to 200 chars with "...". No way to expand or read more. Add "Read More" expand or tappable modal.
- [ ] **P2** — "Tap to open session" is a tiny 13px text link. Make the whole "Where you left off" card tappable.
- [ ] **P3** — No loading skeleton for CLAUDE.md — just an ActivityIndicator. Layout jumps when content appears.
- [ ] **P3** — Todos toggle state is ephemeral (lost on scroll/navigation).

---

## Claude Session (`app/claude/session/[sessionKey].tsx`)

- [ ] **P0** — No markdown rendering for assistant messages. Claude responds with `#`, `**`, `` ` `` characters that render as raw text. Add a markdown renderer (`react-native-markdown-display` or similar).
- [ ] **P1** — "Take Over" concept is confusing for new users. Add first-time tooltip: "Take over starts a live connection to Claude on your laptop. You'll be able to send messages and approve actions."
- [ ] **P1** — No way to stop/cancel a running Claude session. No "Stop" or Ctrl+C equivalent. Add an interrupt button in the status bar or header.
- [ ] **P1** — File is 2012 lines — critical tech debt. Extract subcomponents: `SessionHeader`, `SessionMessages`, `SessionInput`, `TakeOverCard`, `LimitReachedCard`.
- [ ] **P2** — Hardcoded dark theme colors (`colors.dark[900]`, etc.) instead of theme system. If intentional (terminal feel), document it. If not, use theme.
- [ ] **P2** — Token usage display shows raw numbers with no cost estimation or session total.
- [ ] **P2** — Assistant text is not selectable. Can't long-press to copy. Add `selectable` prop to assistant `<Text>` components.
- [ ] **P3** — Plan Mode Banner is purely informational. Users can't approve/exit plan mode from the banner.
- [ ] **P3** — Input field: Enter creates newline (`blurOnSubmit={false}`). Consider a quick-send option or send-on-Enter toggle.

---

## Terminal (`app/terminal/[sessionId].tsx`)

- [ ] **P2** — Quick commands are hardcoded. Sam's common commands might be `docker compose up` or `cargo build`. Make customizable or learned from history.
- [ ] **P2** — MoreVertical (three-dot) icon directly clears terminal without confirmation (line 270). Users expect a dropdown menu. Replace with menu: "Clear Terminal", "Copy All", "Disconnect".
- [ ] **P2** — Git branch in cursor line is hardcoded as `git:(main)` (line 320). This is fake data. Remove or fetch actual branch.
- [ ] **P3** — No local command history. Arrow keys send escape sequences to remote shell but no local recall.
- [ ] **P3** — No resize/font size control. 12px font may be small on larger phones.
- [ ] **P3** — `keyboardVerticalOffset` is hardcoded (90 iOS / 30 Android). May not be correct on all devices.

---

## Permission Rules (`app/settings/permissions.tsx`)

- [ ] **P2** — No explanation of when these rules apply. Add hint: "These rules are sent to your laptop at the start of each session."
- [ ] **P3** — No search in the expanded safe tools list (16 tools). Will matter more as MCP tools are added.
- [ ] **P3** — Pattern examples could be richer. Explain that `*` matches anything. Jordan might not know glob syntax.
- [ ] **P3** — No per-project permission overrides. All rules are global.

---

## Subscription (`app/settings/subscription.tsx`)

- [ ] **P2** — No annual billing toggle. Standard SaaS pattern that increases conversions ~20-30%.
- [ ] **P2** — Feature descriptions are vague ("Basic chat" vs "Unlimited chat"). "100 messages/day" limitation is buried. Make limits more prominent.
- [ ] **P2** — Verify that features listed as Pro-only (e.g., "Code diff viewer") are actually gated in the app. Misleading if not.
- [ ] **P3** — No intermediate tier. Only Free ($0) and Pro ($9.99/month).
- [ ] **P3** — Checkout opens in external browser via `WebBrowser.openBrowserAsync`. User might get lost.

---

## Achievements (`app/achievements/index.tsx`)

- [ ] **P2** — No visual distinction for tiers. Achievements have a `tier` prop but no visual hierarchy (bronze/silver/gold). Add tier-based styling.
- [ ] **P3** — No sharing capability. Can't share unlocked achievements to social media.
- [ ] **P3** — No animation on unlock. If you unlock while on this screen, it just appears. Add confetti/glow/celebration.
- [ ] **P3** — Only 3 real categories (Tokens, Sessions, Engagement). Should scale as app grows.

---

## Cross-Cutting Issues

### Design Consistency
- [ ] **P2** — Haptic feedback is inconsistent: Projects and Session screens have it, Device Detail / Terminal / most Settings screens don't. Standardize.
- [ ] **P2** — Header back button pattern is inconsistent: some screens use custom back buttons, others use `Stack.Screen` header. Pick one pattern.
- [ ] **P3** — Loading transitions are inconsistent: Analytics has skeleton+crossfade, Projects has scan animation, Devices and Settings have no loading transitions.

### Performance
- [ ] **P2** — Device Detail (`device/[id].tsx`) uses 100% inline styles creating new objects every render. Migrate to StyleSheet.
- [ ] **P1** — Session screen (2012 lines) should be broken into subcomponents for maintainability and render performance.

### Accessibility
- [ ] **P3** — No accessibility labels on icon-only buttons (manage button, refresh, delete). Screen readers can't identify them.
- [ ] **P3** — Color-only status indicators (green dot = online) need text labels for colorblind users. Most screens do have text labels, but the accent bars on cards don't.

---

## Summary: Top 10 Priority Items

| # | Item | Screen | Priority |
|---|------|--------|----------|
| 1 | Auto-pin all projects on first use (empty screen problem) | Projects | P0 |
| 2 | Add markdown rendering for assistant messages | Session | P0 |
| 3 | Disable Quick Actions when device is offline | Project Hub | P0 |
| 4 | Add "Continue/New Session" action to Project Hub | Project Hub | P1 |
| 5 | Add "Take Over" explainer for new users | Session | P1 |
| 6 | Add stop/cancel button for running sessions | Session | P1 |
| 7 | Break session screen into subcomponents (2012 lines) | Session | P1 |
| 8 | Add "last seen" timestamp to offline devices | Devices | P1 |
| 9 | Add cost estimation to analytics | Analytics | P1 |
| 10 | Add label/tooltip to manage button in Projects | Projects | P1 |
