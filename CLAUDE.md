@AGENTS.md

# CLAUDE.md — Financentury Web Frontend

Guidance for any AI assistant operating in this Next.js 16 + React 19 repository.

## Operating mode

You are authorized to act autonomously on **everything except git state**. You can:

- Read, edit, create, and delete source files.
- Run `npm install`, `npm run build`, `npm run dev`, `npm run lint`, `npm test`.
- Start the dev server on `:3000`.
- Modify `next.config.ts`, Tailwind config, theme tokens, components, store, i18n.

## Git is user-only

**Only the user runs git.** Do NOT execute any of these without an explicit, in-message instruction that names the action:

- `git add`, `git commit`, `git commit --amend`
- `git push`, `git push --force`, `git push --force-with-lease`
- `git checkout -b`, `git branch`, `git branch -D`, `git switch -c`
- `git reset`, `git revert`, `git restore`, `git rm` (incl. `--cached`)
- `git tag`, `git stash`, `git merge`, `git rebase`, `git cherry-pick`
- `gh pr create`, `gh pr merge`, `gh release create`, `gh repo *`

Phrases like "validate", "make it run", "fix it", "improve the UI" do NOT authorize git operations. Authorization requires explicit phrases like "commit this", "push it", "open a PR", "create a tag".

When unsure, stop and ask.

## Security

- `.env.local` is gitignored — keep it that way.
- The only env vars that ship to the client are `NEXT_PUBLIC_*`. Never expose backend secrets via `NEXT_PUBLIC_*`.
- Auth uses JWT issued by the Go backend. Don't switch storage strategy without explicit user approval.
- Don't weaken CSP, CORS, or auth middleware without an explicit reason.
- Don't introduce third-party analytics / tracking scripts unless asked.

## Project conventions

- **Next.js 16 (Turbopack):** breaking changes vs. older Next. See `node_modules/next/dist/docs/` before writing routing / RSC code.
- **React 19 + Compiler:** `babel-plugin-react-compiler` is on. Avoid manual `useMemo`/`useCallback` unless profiling proves it's needed.
- **Tailwind v4:** uses `@tailwindcss/postcss`. Theme tokens live in `globals.css` `@theme` blocks.
- **shadcn-style components:** look in `src/components/ui/` first before adding a new primitive.
- **i18n:** message files in `messages/{en,es}.json`. Keep keys aligned with the mobile app where possible.
- **Forms:** `react-hook-form` + `zod` resolvers.
- **State:** zustand. No Redux / context for global state.
- **Charts:** `recharts`.

## Useful commands

```bash
npm install              # install deps
npm run dev              # Turbopack dev server, http://localhost:3000
npm run build            # production build
npm run lint
npm test                 # vitest
```

The frontend assumes the Go backend is reachable at `NEXT_PUBLIC_API_URL` (default `http://localhost:8080/api`) — start that first.

## House style

- No WHAT-comments. WHY only, when the reason is non-obvious.
- No drive-by refactors.
- For UI changes, verify in the running dev server. If something can't be tested in a browser, say so explicitly.
