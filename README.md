# Chunker Studio

> Preview every chunk before you embed.

Chunker Studio is a free desktop tool for slicing legal documents — laws,
codes, jurisprudence — into clean, article-aware chunks. Tune the
sliders, watch the preview update live, and ship to **pgvector** when it
looks right. Local-first; nothing leaves your machine until you click
**Index**.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-blue)
![Status](https://img.shields.io/badge/status-freeware-brightgreen)

> **Like it?** Chunker Studio is free forever. If it saved you time,
> consider [buying me a coffee on Ko-fi](https://ko-fi.com/YOUR-KOFI-HANDLE) —
> it keeps me motivated to ship more freeware tools.

---

<!-- Add a screenshot here once you have one ready, e.g.:
![Workspace screenshot](docs/screenshots/workspace.png)
-->

## Why this exists

Most chunkers treat every document like prose. Legal text is **not**
prose — it's structured by article, layered with running headers and
footers, and worth zero if a stray page break splits an article in
half. Chunker Studio gives you a real-time preview of how the chunker
sees your corpus *before* a single token is embedded.

## Features

- **Article-aware chunking** — detects `Art. N` markers (including
  sub-articles like `140.1` and lettered points) and splits on
  semantic boundaries.
- **Live preview** — drag a slider, every chunk re-chunks instantly.
  Tune chunk size, heading lookback, and the letter-ratio noise
  filter side-by-side with the source text.
- **Manual boundary editing** — drag a chunk boundary in the parsed
  view when the chunker gets it wrong. Manual edits persist.
- **Duplicate detection** — flags repeated headers, footers, and
  boilerplate that survived the parser. One-click drop, with the
  ingest payload kept in sync.
- **OpenAI + Ollama** — pick OpenAI `text-embedding-3-{small,large}`
  with a live cost preview, or run fully offline with Ollama.
- **Postgres + pgvector** — push chunks straight to your existing
  pgvector schema. Configurable column names, source-typed for RAG,
  idempotent re-ingest replaces prior rows.
- **Schema profiles** — pin together a target table, column mapping,
  per-document fields, and embedding model. Reuse profiles across docs.
- **Session cache** — re-opening a doc you've already parsed is
  instant (parse + chunk results cached in a local SQLite store).
- **English + Spanish UI** — switch in Preferences.
- **No telemetry. No accounts. Free forever.**

## Download

Pre-built binaries (when published):

- **macOS** (Apple Silicon + Intel) — `.dmg`
- **Windows** — `.exe` installer
- **Linux** — `.AppImage` / `.deb`

Until binaries are published, build from source (see below).

## Run from source

```bash
git clone https://github.com/DaveSalazar/chunker-studio.git
cd chunker-studio
npm install
npm run dev          # Electron with hot-reload
npm run storybook    # http://localhost:6006 — every component in isolation
npm run build        # production bundle
npm run typecheck    # both node + web tsconfigs
```

Requires **Node 18+** and a C toolchain (`better-sqlite3` is a native
module — `electron-builder install-app-deps` rebuilds it for Electron's
ABI on `npm install`).

## Usage walkthrough

1. **Open a folder** — point Chunker Studio at a directory of PDFs,
   DOCX, TXT, or Markdown. The folder panel walks recursively and
   stamps a green check next to anything you've already parsed.
2. **Click a file** — first click opens it in a *preview* tab (italic,
   replaceable). Click another file and the preview slot swaps.
   Double-click — or click **Parse** — to keep it permanently.
3. **Tune the chunker** — drag sliders for max chunk tokens, min chunk
   chars, heading lookback, and the letter-ratio noise filter. Article
   detection kicks in automatically when ≥3 `Art. N` markers are
   found.
4. **Pick a schema profile** — Preferences → Schemas. Map your
   pgvector columns and pick an embedding model (probe the dimensions
   with one click for Ollama models).
5. **Index** — embeddings stream up, with a cost preview for OpenAI,
   and land in pgvector. Re-ingesting the same source replaces its
   prior rows.

## Architecture

The main process follows a clean / hexagonal architecture:
**domain** (entities + ports) → **application** (use cases) →
**infrastructure** (adapters), wired through Inversify. IPC handlers in
`src/main/ipc/` are thin: resolve a use case from the container and
call `.execute(...)`.

```
src/
  shared/types/                   IPC contract (DTOs) — visible to main + renderer
  main/
    core/
      filesystem/{domain,application,infrastructure}/
      parsing/{domain,application,infrastructure}/
        PdfDocumentParser            pdfjs-dist (legacy build)
        DocxDocumentParser           mammoth
        TextDocumentParser           UTF-8
      chunking/{domain,application,infrastructure}/
        DefaultTextNormalizer        NFC + dehyphenate + noise-line strip
        ArticleAwareChunker          live in articleSplitter / paragraphSplitter
        TiktokenCounter              js-tiktoken (cl100k_base)
      session/{domain,infrastructure}/
        SqliteSessionRepository      better-sqlite3 parse + chunk cache
      embedding/                    OpenAI + Ollama providers
      ingest/                       PgVector corpus repository (pg + pgvector)
    ipc/                            wrap() → IpcResult envelope
  preload/                          contextBridge → window.chunker.{...}
  renderer/src/
    App.tsx
    hooks/useChunkerSession.ts      session orchestration (sub-hooks under hooks/session/)
    services/chunker-client.ts      renderer facade over preload bridge
    components/{ui,app}/            primitives + composites (every one has a Storybook story)
    lib/i18n/                       en + es translations, type-safe via the en source-of-truth
```

## Stack

- Electron 41 + electron-vite + React 18 + TypeScript (strict)
- Tailwind v3 with CSS-variable design tokens (light + dark)
- Storybook 10 — every component has a story
- Inversify for DI in the main process
- `better-sqlite3` for the session cache, `pg` + `pgvector` for ingest
- `mammoth` for DOCX, `pdfjs-dist` (legacy build) for PDF,
  `js-tiktoken` (cl100k_base) for token counts

## Conventions

- Every component is **stateless and ≤180 lines** (translation files
  exempt). Split when longer; we did.
- Path aliases: `@/*` → `src/renderer/src/*`, `@shared/*` → `src/shared/*`.
- Inversify symbols use `Symbol.for(...)` so HMR doesn't desync.
- All IPC handlers run through `wrap()` so failures cross the bridge as
  `{ ok: false, error }` envelopes instead of unhandled rejections.

## Roadmap / known gaps

- **No OCR for scanned PDFs.** A scanned PDF (no text layer) lands
  in a "format not supported" empty state instead of running the
  chunking pipeline on garbage. Re-export with a text layer or pass
  through OCR upstream.
- **No write path beyond pgvector.** This tool is a chunker + ingester
  for pgvector specifically. Other vector stores aren't planned.
- **Windows + Linux binaries are unsigned.** First-run requires the
  user to bypass the OS warning. macOS notarization is on the list.

## License

[MIT](LICENSE) — use it, fork it, ship it. Just don't pretend you wrote
it.

## Support the project

If Chunker Studio is useful to you, the cheapest thing you can do is
[drop a coffee on Ko-fi](https://ko-fi.com/YOUR-KOFI-HANDLE). It's appreciated
and it doesn't cost more than a coffee.

---

Made by [Dave Salazar](https://github.com/DaveSalazar).
