# Contributing to ForkOff

Thanks for your interest in contributing! Here's how to get started.

## Getting Started

1. Fork the repo and clone your fork
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and fill in your values
4. Start the dev server: `npx expo start`

## Development

- **Run tests:** `npx jest`
- **Run a single test:** `npx jest --testPathPattern=<pattern>`
- **Start on Android:** `npx expo start --android`
- **Start on iOS:** `npx expo start --ios`

## Architecture

See `CLAUDE.md` for a full architecture overview, including routing, state management, services, and key patterns.

Detailed docs are in `docs/`:
- `docs/TOOL-RENDERING.md` — How tool results are rendered
- `docs/SECURITY.md` — E2EE security whitepaper
- `docs/E2EE-DESIGN.md` — Original E2EE design doc (historical)

## Submitting Changes

1. Create a branch from `main`
2. Make your changes
3. Ensure tests pass: `npx jest`
4. Open a pull request with a clear description of the change

## Code Style

- Use TypeScript throughout
- Use `useTheme()` for colors — never hardcode them
- Use path aliases (`@/components/*`, `@/stores/*`, etc.)
- Zustand for state management — stores live in `stores/*.store.ts`
- Keep components focused and composable

## Reporting Bugs

Open an issue with:
- Steps to reproduce
- Expected vs actual behavior
- Device/OS info if relevant

## Security

If you find a security vulnerability, please report it privately to `security@forkoff.app` instead of opening a public issue. See `docs/SECURITY.md` for details.
