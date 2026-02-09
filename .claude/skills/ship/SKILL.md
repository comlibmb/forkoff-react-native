# Ship Workflow

Multi-repo commit, verify, push, and deploy in one pass.

## Repos

| Alias | Path | Type |
|---|---|---|
| app | `C:/Users/User/Desktop/test/forkoff` | React Native/Expo |
| api | `C:/Users/User/Desktop/test/forkoff-api` | NestJS |
| cli | `C:/Users/User/Desktop/test/forkoff-cli` | Node.js TypeScript |
| website | `C:/Users/User/Desktop/test/forkoff-website` | Marketing site |

## Steps

1. Run `git status` in each repo. Report which repos have changes.
2. For repos with changes, run `npx tsc --noEmit` to verify TypeScript compiles (skip for non-TS repos).
3. If compilation fails, STOP and fix before continuing.
4. Stage and commit all changes in each repo with a descriptive commit message. Never commit `.env` files.
5. Push all repos to origin.
6. Ask the user if they want to:
   - Deploy backend via SSM (run deploy.sh on EC2)
   - Publish CLI to npm
7. Report final status: which repos were pushed, any deploy/publish results.
