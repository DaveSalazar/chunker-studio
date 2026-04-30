# Contributing

Thanks for taking a look! Chunker Studio is a free desktop tool for
chunking legal documents — issues, ideas, and PRs are welcome.

This is a maintainer-driven project (one human in spare time), so
please read this short guide before opening anything substantial.

## TL;DR

1. **Bug?** Open an issue using the bug-report template.
2. **Idea?** Open an issue using the feature-request template **before**
   coding it — saves you time if it's already on the roadmap or out
   of scope.
3. **Small fix or doc tweak?** Skip the issue, send a PR.
4. PRs go to `main`, get squash-merged once CI is green.

## Setting up

Requires Node 18+ and a working C toolchain (`better-sqlite3` is a
native module).

```bash
git clone https://github.com/YOUR-HANDLE/chunker-studio.git
cd chunker-studio
npm install            # postinstall rebuilds native deps for Electron
npm run dev            # Electron with hot-reload
npm run storybook      # http://localhost:6006
npm run typecheck      # both node + web tsconfigs
npm run build          # production bundle
```

## Branch + PR conventions

- Branch from `main`. Branch names: `feat/<short-name>`, `fix/<short-name>`,
  `docs/<short-name>`, `chore/<short-name>`.
- Write a descriptive PR title — it becomes the squash-merge commit
  message and the release-notes line.
- Add a label that matches the change (`feature`, `bug`, `docs`,
  `chore`) — release notes auto-categorize from labels (see
  [`.github/release.yml`](.github/release.yml)).
- CI must pass (typecheck + build).
- One PR, one logical change. Big rewrites should start as an issue.

## Code conventions

- **Stateless components, ≤180 lines each.** This is a hard rule. If
  a file grows past ~150 lines, look for a split before you ship.
  Translation files (`src/renderer/src/lib/i18n/*.ts`) are exempt.
- **Strict TypeScript.** No `any`, no `// @ts-ignore`. If you hit a
  wall, leave a comment explaining why.
- **Path aliases.** `@/*` → `src/renderer/src/*`, `@shared/*` →
  `src/shared/*`.
- **Hexagonal architecture in main process.** New features that need
  IPC should add a use case under the right feature
  (`filesystem` / `parsing` / `chunking` / `session` / `embedding` /
  `ingest`), bind it in `core/index.ts`, write a thin handler in
  `src/main/ipc/`, and update `src/shared/types.ts`.
- **Storybook-first for UI.** Every component in `components/`
  ships with a `*.stories.tsx`. Add a story when you add a component;
  add states (loading, error, empty) when they're worth visualizing.
- **i18n.** All user-facing strings go through `useT()` and live in
  both `en.ts` and `es.ts`. The TS compiler enforces parity (the
  Spanish file imports the type derived from English).

## What's out of scope

- **OCR for scanned PDFs.** Bundle-size cost is too high; recommend
  upstream pre-processing.
- **Other vector stores.** Chunker Studio targets pgvector
  specifically. PRs that abstract the ingest layer for "any vector
  store" will be closed.
- **Cloud sync, accounts, telemetry.** It's local-first by design.
- **Plugins / extension API.** Maybe later, not now.

## Licensing

By contributing, you agree your contribution is licensed under the
[MIT License](LICENSE). No CLA — MIT covers it.

## Code of conduct

Be kind. Disagree without being rude. If something feels off, email
the maintainer instead of escalating in public.
