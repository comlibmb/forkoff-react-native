# UX Audit — ForkOff Mobile App

Comprehensive UX audit conducted across all screens, evaluated from 5 user personas.

---

## Personas

| Name | Profile | Key Trait |
|------|---------|-----------|
| **Alex** | Solo indie dev, 1 device, values simplicity | Wants to try things fast, low patience for setup |
| **Maya** | Senior engineer, multi-device power user | Expects polish, notices every inconsistency |
| **Sam** | Multi-project freelancer, many clients | Context-switches constantly, 20+ projects across 3 devices |
| **Jordan** | Junior dev, new to AI coding tools | Needs hand-holding, easily confused by jargon |
| **Priya** | DevOps/infra engineer, monitors servers | Wants reliability indicators, trusts nothing, checks everything |

## Priority Legend

- **P0** — Critical, breaks core experience
- **P1** — High impact, should fix soon
- **P2** — Medium impact, quality-of-life
- **P3** — Low impact, polish

---

## Login (`app/(auth)/login.tsx`)

### What Works
- Clean layout, email + OTP is modern and secure
- GitHub OAuth provides a fast alternative
- Info box explains "no password" approach
- Form validation clears errors on type

### Issues by Persona

**Who: Jordan (junior)**
Problem: "Welcome back" on login assumes returning user — but this is the first screen a new user might land on if they tap the wrong link. The sign-up link is buried at the very bottom.

**Who: All**
Problem: The logo container is 80x80 but the image is 187x187 with `overflow: visible` (line 117-131) — this is a layout hack that could clip on smaller devices or look weird with different aspect ratios.

**Who: Maya (senior)**
Problem: No indication of what ForkOff *is* on the login screen. If someone gets a "try this app" link, they land on a login form with zero context. The onboarding welcome screen only appears *after* auth.

**Who: All**
Problem: Register requires agreeing to Terms before GitHub OAuth works — but there's no visual feedback explaining *why* the GitHub button is dimmed. Users will tap it and nothing happens.

**Who: Priya (power user)**
Problem: `console.log` statements left in production code (lines 78, 83, 87, 90, 93). Not a UX issue but unprofessional.

**Who: Alex (indie)**
Problem: Email validation regex (`/\S+@\S+\.\S+/` line 39) is too permissive — accepts `a@b.c`. Not a blocker but sloppy.

### Recommendations
- [ ] **P1** — Add a brief tagline or value prop below the logo ("Control Claude Code from your phone")
- [ ] **P2** — Fix logo container: either size the container to match the image or constrain the image to the container
- [ ] **P2** — Validate email more strictly or validate server-side with clear feedback
- [ ] **P2** — If GitHub OAuth redirect fails (deep link not registered), user is stuck in browser with no fallback
- [ ] **P3** — Remove `console.log` statements from production code
- [ ] **P3** — Add "Remember me" / saved email for returning users
- [ ] **P3** — Consider showing a "New here?" prompt more prominently than the bottom text link

---

## Register (`app/(auth)/register.tsx`)

### What Works
- Terms checkbox is explicit and required
- OTP explanation box is clear
- GitHub sign-up available as alternative

### Issues by Persona

**Who: All**
Problem: Terms checkbox blocks *both* email AND GitHub sign-up. The GitHub OAuth button is dimmed at 0.7 opacity (line 325) with no tooltip or explanation. Users will repeatedly tap it, thinking it's broken. There's no visual hint saying "agree to terms first."

**Who: Jordan (junior)**
Problem: "No password required!" might confuse users who expect one. The phrasing implies something is missing rather than being a feature.

**Who: Maya (senior)**
Problem: Name field label just says "Name" (line 159). Ambiguous — display name? Full name? Username? Users might enter "lol" not realizing it's shown in the app.

**Who: Priya (power user)**
Problem: Same `console.log` statements in production (lines 91, 95, 98, 101, 104). Terms/Privacy links use `Linking.openURL` which could fail silently if no default browser is set.

### Recommendations
- [ ] **P1** — Show inline hint when Terms unchecked and user taps a disabled button: "Please agree to Terms first"
- [ ] **P2** — Rephrase "No password required!" to "We use secure email verification instead of passwords"
- [ ] **P2** — Change "Name" label to "Display Name" with helper text "This is how you'll appear in the app"
- [ ] **P3** — Remove `console.log` from production
- [ ] **P3** — Consider in-app WebView for Terms/Privacy instead of external browser

---

## Onboarding Flow (Overall Structure)

### What Works
- Each step has a clear purpose and skip option
- Success states use consistent green checkmark pattern

### Issues by Persona

**Who: Alex (indie)**
Problem: 4 screens before reaching the product (Welcome -> Add Device -> Connect GitHub -> Referral Code). Only 1 step is essential (Add Device). Alex just wants to try the app — he'll quit before finishing a 4-step onboarding.

**Who: All**
Problem: No progress indicator. Users don't know they're on step 1 of 4 or how much is left. This makes onboarding feel endless.

**Who: Sam (freelancer)**
Problem: Every screen has a "Skip" option but it's styled as low-contrast tertiary text at the bottom (`theme.textTertiary`, lines like `referral-code.tsx:197`). Sam who wants to skip fast might not notice it.

**Who: Jordan (junior)**
Problem: No way to return to a skipped step later. If Jordan skips GitHub connection, there's no prompt to set it up later — it's buried in settings.

### Recommendations
- [ ] **P1** — Add a step indicator/progress bar at the top of each onboarding screen
- [ ] **P1** — Reduce to 2 essential steps: Welcome + Add Device. Move GitHub + Referral to post-onboarding prompts
- [ ] **P2** — Make "Skip" more visible — larger text, secondary button style instead of text link

---

## Onboarding: Welcome (`app/(onboarding)/index.tsx`)

### What Works
- Feature cards clearly communicate the app's capabilities
- Primary CTA "Add Your First Device" is prominent
- Clean, organized layout

### Issues by Persona

**Who: Jordan (junior)**
Problem: "Add Your First Device" is the primary CTA, but the user hasn't been told what a "device" is in this context. Is it their phone? Their laptop? The subtitle "Your AI coding companion in your pocket" doesn't clarify.

**Who: Maya (senior)**
Problem: The "F" logo is a plain text character in a colored square (line 54). For a brand-first impression, this feels generic compared to the actual logo image used on login/register screens.

**Who: Alex (indie)**
Problem: "Skip for now" routes to `router.replace('/(tabs)')` (line 129) which lands on Projects tab with 0 projects, 0 devices — a completely empty app with no guidance.

### Recommendations
- [ ] **P2** — Add brief explainer under CTA: "Connect your laptop to control Claude Code from your phone"
- [ ] **P2** — Add subtle entrance animations to feature cards (staggered fade-in)
- [ ] **P3** — Use actual logo image instead of text "F" character
- [ ] **P3** — If user skips, route to Devices tab (not Projects) so they see "Add Device" prompt

---

## Onboarding: Add Device (`app/(onboarding)/add-device.tsx`)

### What Works
- Two methods (QR + Code) with clear toggle
- Code entry auto-uppercases and limits to 8 chars
- Success state with "Continue" and "Add Another Device" options

### Issues by Persona

**Who: Jordan (junior)**
Problem: QR scanning opens a separate full screen (`router.push('/device/pair')` line 212) via navigation. The user has to navigate away from onboarding, pair, then come back. The back-detection hack (`devices.length > deviceCountOnMount.current` line 22) works but is fragile.

**Who: Maya (senior)**
Problem: The QR code placeholder (big QrCode icon + "Camera access required" text, lines 193-209) is shown *before* the user taps anything. This looks like a broken/empty state rather than an action prompt.

**Who: All**
Problem: Code entry uses "forkoff pair" in the instruction box (line 273) but the welcome screen says "npx forkoff pair". Inconsistent CLI command references.

**Who: Sam (freelancer)**
Problem: Success state "Continue" goes to Connect GitHub (line 91). No option to skip straight to the app after pairing.

### Recommendations
- [ ] **P2** — Show "Open Camera" button prominently, hide the QR placeholder until tapped
- [ ] **P2** — Fix inconsistent CLI command: always use `npx forkoff pair` everywhere
- [ ] **P3** — Add "Skip to app" option on the success state in addition to Continue
- [ ] **P3** — Consider embedding QR scanner inline instead of navigating to a separate screen

---

## Onboarding: Connect GitHub (`app/(onboarding)/connect-github.tsx`)

### What Works
- Benefits list clearly explains the value
- External redirect notice manages expectations
- Skip option available

### Issues by Persona

**Who: Maya (senior)**
Problem: Users who just signed up with GitHub OAuth are now asked to "Connect GitHub" again. If they used GitHub login, this should auto-detect and skip or show "GitHub already connected."

**Who: Priya (power user)**
Problem: No indication of what GitHub permissions/scopes are requested. Privacy-conscious users want to know before authorizing. The `forkoff://auth/callback` redirect (line 22) is the same as the login flow — could cause routing confusion.

**Who: Sam (freelancer)**
Problem: Benefits listed ("Browse and clone repos", "Create new repos", "View commit history", "Manage pull requests") oversell what the app currently does. If any aren't fully implemented, this sets wrong expectations.

### Recommendations
- [ ] **P2** — Auto-detect if user already connected GitHub via login and skip/show confirmation
- [ ] **P2** — Verify all listed benefits are actually implemented; remove any that aren't
- [ ] **P3** — Show a brief note about what GitHub permissions are requested
- [ ] **P3** — Use a separate redirect path for GitHub-connect vs GitHub-login to avoid routing ambiguity

---

## Onboarding: Referral Code (`app/(onboarding)/referral-code.tsx`)

### What Works
- Clean, focused UI for a single input
- Code validation requires exactly 8 characters
- Success state celebration before entering app

### Issues by Persona

**Who: Alex (indie)**
Problem: Referral code is a full onboarding step, but most users won't have one. This creates a "dead" screen where the majority just tap Skip. This should be a banner inside the app, not a dedicated step.

**Who: Jordan (junior)**
Problem: No real-time feedback on code format — button stays disabled at `code.length !== 8` (line 171) with no explanation of what's wrong. User types 7 characters and doesn't understand why they can't submit.

**Who: All**
Problem: "If a friend invited you, enter their code to get started" — but what's the reward? Free month? Extra features? Users need an incentive to find a code.

**Who: Maya (senior)**
Problem: "Get Started" after applying goes to `router.replace('/(tabs)')` (line 70). Same empty-app problem if the user skipped device pairing earlier.

### Recommendations
- [ ] **P2** — Move referral code to a post-onboarding banner or Settings screen, not a dedicated onboarding step
- [ ] **P3** — Add character count hint: "8 characters required" with visual progress
- [ ] **P3** — Explain the referral reward: "Get 1 free month of Pro" or similar incentive text
- [ ] **P3** — If device pairing was skipped, route to Devices tab on "Get Started" instead of Projects

---

## Tab Bar (`app/(tabs)/_layout.tsx`)

### What Works
- Clean 4-tab layout: Projects, Devices, Analytics, Settings
- Active tab color distinction with primary color
- Referral notification dot on Settings icon
- Tutorial auto-starts on first visit

### Issues by Persona

**Who: Jordan (junior)**
Problem: Tab order puts Projects first but new users have 0 projects. Jordan opens the app to an empty screen and doesn't know what to do next. Devices tab would be a better default for users with no paired devices.

**Who: Maya (senior)**
Problem: No badge/indicator on Projects tab when there's an active session running. Maya has to open the tab to check status. A small dot when any session is ACTIVE would give at-a-glance awareness.

**Who: All**
Problem: Tab bar height 85px with 28px bottom padding (lines 30-33) may feel oversized on Android devices without a home indicator. iOS home indicator needs this space, Android doesn't.

### Recommendations
- [ ] **P1** — Dynamic first tab: show Devices for users with 0 paired devices, Projects once they have at least one
- [ ] **P2** — Add activity dot on Projects tab when any session is ACTIVE
- [ ] **P3** — Adjust tab bar padding based on platform/device (use `useSafeAreaInsets`)

---

## Projects Tab (`app/(tabs)/projects.tsx`)

### What Works
- macOS-window styled device groups are visually distinctive
- Memoized components for FlatList performance
- Project cards show session count, last used time, active dot
- Manage modal with Switch toggles for each project
- Traffic-light dots on device group headers

### Issues by Persona

**Who: Sam (freelancer)**
Problem: Cold start requires manual curation. Sam just installed the app, has 20 projects across 3 devices — and sees "No projects in focus" empty state. He has to open the manage modal and manually toggle each project on. This is the first thing you see after onboarding, and it's empty.

**Who: Jordan (junior)**
Problem: SlidersHorizontal manage button (line 621-627) has no label or tooltip. It's a 36x36 icon-only button. Jordan doesn't know what it does.

**Who: Sam (freelancer)**
Problem: No search/filter in the manage modal. Sam with 30+ projects across 3 devices has to scroll through the entire list to find what he needs.

**Who: Maya (senior)**
Problem: Project count badge says "0 projects" when none are pinned but projects exist. Should say "0 of 12 projects" to show total context.

**Who: All**
Problem: Scan animation runs every cold start (lines 349-403). Charming once, tedious on repeat. Should cache scan state and skip animation if last scan was < 5 minutes ago.

**Who: Alex (indie)**
Problem: Subtitle "Claude sessions grouped by directory" (line 615) is developer jargon. Alex doesn't think in terms of "directories" and "sessions."

### Recommendations
- [ ] **P0** — Auto-pin all projects on first use (when `pinnedProjects` is empty and projects exist). Default should show everything, let users curate down.
- [ ] **P1** — Add a label or first-time tooltip to the SlidersHorizontal manage button: "Manage Projects"
- [ ] **P2** — Add search bar to manage modal for 10+ projects
- [ ] **P2** — Fix project count badge: "0 of 12 projects" when none pinned
- [ ] **P2** — Cache scan state, skip animation if last scan was < 5 minutes ago
- [ ] **P3** — Change subtitle to "Your active workspaces" or "Projects across your devices"
- [ ] **P3** — Add swipe-to-remove or context menu on project cards as shortcut to unpin

---

## Devices Tab (`app/(tabs)/devices.tsx`)

### What Works
- Filter pills (All/Online/Offline) are intuitive
- Device cards show status badge, platform, tools
- AllOfflineBanner with CLI command is helpful
- Memoized components with proper performance optimizations
- Connected tool badges show active state

### Issues by Persona

**Who: Priya (DevOps)**
Problem: No "last seen" timestamp for offline devices. Priya can't tell if a device went offline 5 minutes ago or 5 days ago. This is critical for server monitoring. The `formatLastSeen()` function exists in `device/[id].tsx` but isn't used on the list screen.

**Who: Sam (freelancer)**
Problem: Filter pills don't show counts. "Online" could mean 1 or 5 devices. Add "Online (2)" / "Offline (3)" format so Sam can see distribution at a glance.

**Who: Maya (senior)**
Problem: ToolBadge filters to Claude-only tools (line 81-84): `['claude_code', 'claude-code', 'claude_terminal']`. Other connected tools are hidden entirely. Show all tools — it's useful to know what's connected.

**Who: Alex (indie)**
Problem: No way to delete/unpair a device from the list view. Alex has to navigate into the device detail to find the remove option. Add swipe-to-delete or long-press menu.

**Who: Jordan (junior)**
Problem: "Add" button in header doesn't explain the pairing flow. Jordan gets thrown into QR scanner with no preview of what's about to happen.

**Who: All**
Problem: Accent bar color meaning (green = online, gray = offline) isn't explained. Color-only indicator without text for the bar.

### Recommendations
- [ ] **P1** — Add "Last seen 2h ago" to offline device cards
- [ ] **P2** — Add counts to filter pills: "Online (2)" / "Offline (3)"
- [ ] **P2** — Show all connected tools, not just Claude-related ones
- [ ] **P2** — Add swipe-to-delete or long-press menu with "Unpair Device"
- [ ] **P3** — Add brief description or tooltip to the "Add" button
- [ ] **P3** — Add sort options: by name, status, or last activity
- [ ] **P3** — Add text labels alongside color indicators for accessibility

---

## Analytics Tab (`app/(tabs)/analytics.tsx`)

### What Works
- Skeleton crossfade loading transition is smooth and professional
- PeriodSelector, WaveAreaChart, token breakdown — solid data layout
- Real-time token usage updates via WebSocket
- Recent achievements section with "See All" link
- Streak tracking with active days count

### Issues by Persona

**Who: Jordan (junior)**
Problem: "Total Tokens" (line 141) is meaningless. Jordan doesn't know what a token is, how many he's used, or whether that's a lot. Add context: "~$4.20 this month" or "150K tokens = ~300 pages of text."

**Who: Priya (DevOps)**
Problem: No cost tracking/estimation anywhere. Users pay per token via Anthropic. Show estimated cost based on token counts and current Anthropic pricing. This is the #1 metric Priya cares about.

**Who: Maya (senior)**
Problem: Chart "Usage Trend" (line 164) doesn't label what the Y-axis measures. Is it tokens? Sessions? Messages? Unlabeled chart is unusable.

**Who: All**
Problem: 30-day hardcoded date range for `fetchDailyUsage` (lines 51-58) regardless of `selectedPeriod`. The PeriodSelector is decorative — it doesn't actually filter chart data.

**Who: Alex (indie)**
Problem: Streak counter has no visual reward or celebration. It's just "3 days" in plain text. Compare to Duolingo's flame icon, color changes at milestones, celebratory animations.

**Who: Jordan (junior)**
Problem: "No achievements yet" empty state is demotivating (line 209). Show progress: "Next achievement: Send 100 messages (72/100)" with a progress bar.

### Recommendations
- [ ] **P1** — Add cost estimation: "~$X.XX this month" based on token counts and Anthropic pricing
- [ ] **P1** — Make PeriodSelector actually filter chart data (currently decorative only)
- [ ] **P2** — Add context to "Total Tokens": human-readable equivalent or cost
- [ ] **P2** — Label the chart Y-axis (tokens per day)
- [ ] **P2** — Add visual reward to streak: flame icon, color at milestones
- [ ] **P3** — Show next-achievement progress in empty state instead of "No achievements yet"
- [ ] **P3** — Add export/share functionality for usage data

---

## Settings Tab (`app/(tabs)/settings.tsx`)

### What Works
- Profile card with initials avatar is clean
- Section grouping is logical
- Dark mode toggle works instantly
- Unrestricted mode has proper warning dialog
- Sign out has confirmation dialog

### Issues by Persona

**Who: Maya (senior)**
Problem: Notifications toggle is fake — `useState(true)` local state (line 122), never persisted and not wired to actual push notification permissions. Toggling it does nothing.

**Who: All**
Problem: Subscription subtitle is hardcoded: "Free plan - Upgrade for more features" (line 342). Even Pro users see "Free plan." Should use `user?.subscription`. Note: the profile card badge (line 209) correctly shows `{user?.subscription || 'Free'} Plan` — so the fix is just the subtitle.

**Who: Priya (power user)**
Problem: "Unrestricted Mode" name is scary with unclear scope. "Skip permission prompts" subtitle doesn't explain what permissions or what the risk is. Consider a dedicated "Security" section.

**Who: Sam (freelancer)**
Problem: Too many items (13 across 5 sections). Critical settings like Permission Rules are buried alongside Replay Tutorial. Settings page needs hierarchy.

**Who: Maya (senior)**
Problem: "Usage Analytics" and "Achievements" links in Settings duplicate the Analytics tab. Creates confusion about where the canonical home is for these features.

**Who: All**
Problem: "Prompt Queue" is in "Analytics & Achievements" section. It's an active workflow tool (manage queued prompts), not analytics. Should have its own section or live in Projects.

### Recommendations
- [ ] **P2** — Wire up Notifications toggle to actual push permissions or remove it
- [ ] **P2** — Fix subscription subtitle to use `user?.subscription` instead of hardcoded "Free plan"
- [ ] **P2** — Add more context to "Unrestricted Mode" — explain what it allows and doesn't
- [ ] **P2** — Move Prompt Queue out of "Analytics & Achievements" into its own section
- [ ] **P3** — Remove duplicate Analytics/Achievements links (they have their own tab)
- [ ] **P3** — Move "Redeem Voucher" inside the Manage Subscription page
- [ ] **P3** — Add in-app FAQ or feedback mechanism to Support section

---

## Device Pairing (`app/device/pair.tsx`)

### What Works
- QR scanner with custom corner brackets looks polished
- Flashlight toggle for low-light scanning
- QR/Code method toggle with clear visual distinction
- Loading overlay during pairing
- Success state shows paired device name

### Issues by Persona

**Who: Priya (power user)**
Problem: Camera permission permanently denied = dead end. The "Grant Permission" button (line 154-170) re-requests permission, but if the OS has permanently denied it, the button does nothing. No `Linking.openSettings()` fallback.

**Who: Jordan (junior)**
Problem: No explanation of what "pairing" means or what happens next. The screen jumps straight into QR scanner / code input. A one-liner would help: "Pairing connects your phone to your computer. Only you can control sessions."

**Who: All**
Problem: Code entry instruction says `forkoff pair` (line 302, 365) without the `npx` prefix. Inconsistent with other screens.

**Who: Maya (senior)**
Problem: Success screen "Done" button goes `router.back()` (line 114) which might not land on the expected screen depending on navigation history. Should navigate explicitly.

### Recommendations
- [ ] **P2** — Detect permanent permission denial and show "Open Settings" button via `Linking.openSettings()`
- [ ] **P2** — Add brief explainer: "Pairing connects your phone to your computer"
- [ ] **P3** — Fix CLI command to `npx forkoff pair` consistently
- [ ] **P3** — Navigate explicitly on "Done" instead of `router.back()`
- [ ] **P3** — Add QR code timeout handling — if CLI QR expires, show helpful error

---

## Device Detail (`app/device/[id].tsx`)

### What Works
- Device info display is comprehensive (name, status, platform, type)
- Inline rename with edit/save/cancel buttons
- Connected tools section with active state
- Terminal list with quick-open
- Delete device with confirmation

### Issues by Persona

**Who: Maya (senior)**
Problem: 100% inline styles, no `StyleSheet.create`. Every element creates new style objects on every render. This is the only major screen without extracted styles — a performance and maintainability issue.

**Who: Sam (freelancer)**
Problem: Connected Tools section filters to Claude tools only (same filter as Devices tab). Non-Claude tools are hidden entirely. Show all tools with appropriate badges.

**Who: Priya (DevOps)**
Problem: Refresh button has no loading indicator or disabled state while refreshing. Priya will tap it multiple times thinking it didn't work.

**Who: Sam (freelancer)**
Problem: Terminal list doesn't show last command or activity preview. Sam with 3 terminals can't tell which was running what.

### Recommendations
- [ ] **P2** — Extract inline styles to `StyleSheet.create` for performance
- [ ] **P2** — Show all connected tools, not just Claude-related ones
- [ ] **P3** — Add loading indicator to refresh button while refreshing
- [ ] **P3** — Show last command or activity in terminal list items
- [ ] **P3** — Add max length validation on device name edit
- [ ] **P3** — Add "Sessions" section or link to "View sessions on this device"

---

## Project Hub (`app/project-hub.tsx`)

### What Works
- CLAUDE.md preview gives project context
- "Where you left off" card shows last prompt and task progress
- Quick Actions grid for common tasks
- Session list with "See all" pagination
- "Initialize Project" option when no CLAUDE.md found
- Refresh control for manual data reload

### Issues by Persona

**Who: Priya (DevOps)**
Problem: Quick Actions are always enabled even when device is offline (`disabled={false}` line 399). Status Check and Brainstorm will silently fail because `handleQuickAction` checks `isDeviceOnline` (lines 150, 163) but the button doesn't look disabled. User taps, nothing happens.

**Who: Alex (indie)**
Problem: No "New Session" or "Continue" quick action. The most common action (start/continue working on the project) requires tapping into a session from the list. This should be the primary, most prominent action.

**Who: Maya (senior)**
Problem: CLAUDE.md is truncated to 200 chars (line 301) with "..." and no way to expand or read more. For a project with a rich CLAUDE.md, this is frustratingly limited.

**Who: Jordan (junior)**
Problem: "Tap to open session" is a tiny 13px text link (line 382). The entire "Where you left off" card should be tappable, not just this small text.

### Recommendations
- [ ] **P0** — Visually disable Quick Action buttons when device is offline (pass `disabled={!isDeviceOnline}`)
- [ ] **P1** — Add a prominent "Continue" or "New Session" primary action at the top
- [ ] **P2** — Add "Read More" expand or tappable modal for full CLAUDE.md
- [ ] **P2** — Make the entire "Where you left off" card tappable, not just the "Tap to open session" text
- [ ] **P3** — Add loading skeleton for CLAUDE.md instead of ActivityIndicator
- [ ] **P3** — Persist Todos toggle state (currently lost on navigation)

---

## Claude Session (`app/claude/session/[sessionKey].tsx`)

### What Works
- Take-over flow prevents accidental interference
- Permission queue with batch approve/deny
- Thinking block rendering with expand/collapse
- Token usage tracking with inline display
- StatusBar showing current tool activity
- Tool use blocks with specialized renderers
- Plan mode banner and indicators
- Auto-prompt from project hub quick actions

### Issues by Persona

**Who: All**
Problem: No markdown rendering for assistant messages. Claude responds with `#`, `**`, `` ` `` code blocks that render as raw text. This is the core product screen — raw markdown text makes the AI look broken.

**Who: Jordan (junior)**
Problem: "Take Over" concept is confusing. There's no explanation of what it means, why it's needed, or what happens. Jordan sees a button and doesn't know if pressing it will break something. Add a first-time tooltip.

**Who: Priya (power user)**
Problem: No way to stop/cancel a running Claude session. No "Stop" button or Ctrl+C equivalent. If Claude is running a long operation, Priya has no way to interrupt it from the phone.

**Who: Maya (senior)**
Problem: File is 2012+ lines — critical tech debt. This single screen handles: take-over flow, message rendering, permission queue, thinking blocks, token usage, task progress, plan mode, auto-prompt, and more. Should be broken into subcomponents.

**Who: Maya (senior)**
Problem: Hardcoded dark theme colors (`colors.dark[900]`, `colors.dark[950]`, etc.) instead of the theme system. If the user switches to light mode, this screen stays dark. If intentional (terminal feel), it should be documented; if not, use theme.

**Who: Sam (freelancer)**
Problem: Token usage display shows raw numbers with no cost estimation or session total. Sam needs to know how much this session is costing.

**Who: All**
Problem: Assistant text is not selectable. Can't long-press to copy a specific piece of code or response. Need `selectable` prop on assistant `<Text>` components.

### Recommendations
- [ ] **P0** — Add markdown rendering for assistant messages (e.g., `react-native-markdown-display`)
- [ ] **P1** — Add "Take Over" explainer tooltip for new users
- [ ] **P1** — Add stop/cancel button for running sessions
- [ ] **P1** — Break session screen into subcomponents: `SessionHeader`, `SessionMessages`, `SessionInput`, `TakeOverCard`, `LimitReachedCard`
- [ ] **P2** — Use theme system instead of hardcoded dark colors (or document the intentional choice)
- [ ] **P2** — Add cost estimation to token usage display
- [ ] **P2** — Make assistant text selectable (add `selectable` prop)
- [ ] **P3** — Plan Mode Banner: allow approve/exit plan mode actions, not just informational
- [ ] **P3** — Add send-on-Enter toggle (currently Enter creates newline via `blurOnSubmit={false}`)

---

## Terminal (`app/terminal/[sessionId].tsx`)

### What Works
- Keyboard toolbar with Ctrl+C, Ctrl+D, Tab, arrows is smart for mobile
- Copy/Paste buttons in toolbar
- Quick command suggestions strip
- Theme-aware terminal colors
- Gradient fade at the top of terminal output

### Issues by Persona

**Who: Sam (freelancer)**
Problem: Quick commands are hardcoded (line 43-50): `git status`, `npm install`, etc. Sam's common commands might be `docker compose up` or `cargo build`. These should be customizable or learned from history.

**Who: Maya (senior)**
Problem: MoreVertical (three-dot) button directly clears terminal without confirmation. Users expect a dropdown menu. Replace with menu: "Clear Terminal", "Copy All", "Disconnect."

**Who: Priya (power user)**
Problem: Git branch in cursor line is hardcoded as `git:(main)`. This is fake data — it doesn't reflect the actual branch. Remove it or fetch the real branch from the terminal session.

**Who: All**
Problem: No local command history. Arrow keys send escape sequences to the remote shell but there's no local recall of previous commands.

### Recommendations
- [ ] **P2** — Make quick commands customizable or learned from command history
- [ ] **P2** — Replace three-dot clear with dropdown menu: "Clear Terminal", "Copy All", "Disconnect" (with confirmation for clear)
- [ ] **P2** — Remove fake `git:(main)` branch from cursor line or fetch actual branch
- [ ] **P3** — Add local command history (arrow up to recall previous commands)
- [ ] **P3** — Add font size control (12px may be small on larger phones)
- [ ] **P3** — Dynamic `keyboardVerticalOffset` instead of hardcoded values

---

## Permission Rules (`app/settings/permissions.tsx`)

### What Works
- Tap-to-toggle permission rules per tool
- Trusted command patterns with add/remove
- Summary banner showing current rule counts
- Collapsible safe tools section
- Clear explanation of what each permission level means

### Issues by Persona

**Who: Jordan (junior)**
Problem: No explanation of *when* these rules apply. Add a hint: "These rules are sent to your laptop at the start of each session and used when Claude requests permission to use tools."

**Who: Sam (freelancer)**
Problem: No per-project permission overrides. All rules are global. Sam might want different rules for client projects vs personal projects.

**Who: Jordan (junior)**
Problem: Pattern examples could be richer. "Explain that `*` matches anything" — Jordan might not know glob syntax. Add inline help: "`npm *` matches any npm command."

### Recommendations
- [ ] **P2** — Add hint explaining when rules apply
- [ ] **P3** — Add search in expanded safe tools list (16 tools, will grow with MCP)
- [ ] **P3** — Add richer pattern examples with inline help
- [ ] **P3** — Consider per-project permission overrides (future enhancement)

---

## Subscription (`app/settings/subscription.tsx`)

### What Works
- Active subscription status card with renewal date
- Plan cards with feature comparison
- Manage Subscription button opens Stripe portal
- Free/Pro pricing clearly displayed
- Loading states for checkout flow

### Issues by Persona

**Who: Sam (freelancer)**
Problem: No annual billing toggle. Standard SaaS pattern that increases conversions 20-30%. Sam would prefer to pay less per month with an annual plan.

**Who: Jordan (junior)**
Problem: Feature descriptions are vague: "Basic chat" vs "Unlimited chat". The 100 messages/day limitation is buried in the Free plan's "limitations" array (line 46). Make limits prominent so users know what they're hitting.

**Who: Priya (power user)**
Problem: Verify that features listed as Pro-only (e.g., "Code diff viewer", "Terminal access") are actually gated in the app. Misleading if they're available to free users.

### Recommendations
- [ ] **P2** — Add annual billing toggle (common SaaS pattern)
- [ ] **P2** — Make limits more prominent: "100 messages/day" should be a headline feature difference
- [ ] **P2** — Verify Pro features are actually gated — remove any that aren't
- [ ] **P3** — Consider an intermediate tier between Free and Pro
- [ ] **P3** — Keep user in-app during checkout flow if possible

---

## Achievements (`app/achievements/index.tsx`)

### What Works
- Category filter pills
- Progress bars on locked achievements
- Showcase toggle for unlocked achievements
- Summary header with unlock count
- Pull-to-refresh

### Issues by Persona

**Who: Maya (senior)**
Problem: No visual distinction for tiers. Achievements have a `tier` prop (line 179) but no visual hierarchy — bronze, silver, gold should look different. Currently all achievements have the same visual weight.

**Who: Alex (indie)**
Problem: No animation on unlock. If an achievement unlocks while viewing this screen, it just appears in the list. Add confetti, glow, or celebration animation.

### Recommendations
- [ ] **P2** — Add tier-based visual styling: bronze/silver/gold backgrounds, borders, or icons
- [ ] **P3** — Add unlock celebration animation
- [ ] **P3** — Add sharing capability for unlocked achievements
- [ ] **P3** — Only 3 categories now (Tokens, Sessions, Engagement) — plan for scaling

---

## Cross-Cutting Issues

### Design Consistency

**Who: Maya (senior)**
Problem: Haptic feedback is inconsistent. Projects tab and Session screen use `Haptics.impactAsync`, but Device Detail, Terminal, most Settings screens don't. Standardize haptics on all interactive elements.

**Who: Maya (senior)**
Problem: Header back button pattern is inconsistent. Some screens use custom back buttons (`ArrowLeft` + "Back" text), others use `Stack.Screen` headerLeft, some use Expo Router's default header. Pick one pattern.

**Who: All**
Problem: Loading transitions are inconsistent. Analytics has skeleton+crossfade (professional), Projects has terminal scan animation (charming), Devices and Settings have no loading transitions (jarring).

### Performance

**Who: Maya (senior)**
Problem: Device Detail (`device/[id].tsx`) uses 100% inline styles. Every render creates new style objects. Migrate to StyleSheet.create.

**Who: All**
Problem: Session screen (2012+ lines) is a maintainability and performance concern. Breaking into subcomponents would reduce re-render scope.

### Accessibility

**Who: All**
Problem: No accessibility labels on icon-only buttons (manage button on Projects, refresh on Device Detail, three-dot on Terminal). Screen readers can't identify them.

**Who: All**
Problem: Color-only status indicators (green dot = online, accent bars) need text labels for colorblind users. Most screens *do* have text labels alongside colors, but the accent bars on device/project cards don't.

### Recommendations
- [ ] **P2** — Standardize haptic feedback across all interactive elements
- [ ] **P2** — Pick one header/back-button pattern and use it everywhere
- [ ] **P2** — Extract Device Detail inline styles to StyleSheet
- [ ] **P3** — Add consistent loading transitions (skeleton or fade) to all screens
- [ ] **P3** — Add accessibility labels to all icon-only buttons
- [ ] **P3** — Add text alongside color-only indicators for accessibility

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
| 7 | Break session screen into subcomponents (2012+ lines) | Session | P1 |
| 8 | Add "last seen" timestamp to offline devices | Devices | P1 |
| 9 | Add cost estimation to analytics | Analytics | P1 |
| 10 | Reduce onboarding to 2 essential steps | Onboarding | P1 |
