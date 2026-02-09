# CLAUDE.md

## Critical Rules

- When I say "website", I mean the marketing/landing page repo — NOT the mobile app repo. Never apply website changes to the app codebase or vice versa. Always confirm which repo you're targeting before making changes.
- Do NOT make UI changes unless explicitly asked. When asked to fix logic, fix only the logic. Do not refactor, restyle, or rewrite UI components unprompted.

## Project Structure

This is a multi-repo project: CLI (`forkoff-cli/`), API/backend (`forkoff-api/`, NestJS), mobile app (`forkoff/`, React Native/Expo), and marketing website (`forkoff-website/`). Always confirm which repo context you're working in before editing files. Never apply changes meant for one repo to another.

## Debugging

When debugging, identify and fix the actual root cause before proposing changes. Do not shotgun-fix by modifying multiple files hoping something works. If the first fix doesn't work, step back and re-analyze the data flow from end to end.

## Build & Verification

After making changes, always run `npx tsc --noEmit` to verify TypeScript compilation before committing. This project is TypeScript-first.

## Git Workflow

- When committing changes, commit ALL uncommitted files across ALL relevant repos in a single pass. Always run `git status` in each repo directory before finishing to confirm nothing is left uncommitted.
- Never commit `.env` files or secrets to git. Before any `git add`/`git commit`, verify `.gitignore` includes `.env*` patterns and check staged files for secrets.

## Deployment & Infrastructure

When deploying to EC2 via SSM, use base64 encoding for multi-line scripts to avoid heredoc/escaping issues. Never use raw heredocs with SSM send-command. Write the script to a local file, `base64` encode it, then decode on the remote host.
