# Document skeletons

Status: implemented locally; production wiring pending.
Last updated: 2026-05-09.

## Why

The earlier "Document templates" path stored verbatim source prose in
`template_chunks.body` and handed it back to the LLM at draft time as
the scaffold for generated documents. That shape carries real IP risk:
operators ingest commercially-published legal templates, and a draft
that materially reproduces a template's prose is a derivative work.

The skeleton-driven path replaces verbatim retrieval with a structural
fingerprint. The LLM only ever sees:

- The doc's section structure (headings).
- Statutory citations (`Art. N` keys with code abbreviation).
- Field markers (`<<NAME>>` slots) with inferred types.
- An intent-surface text built from `title + doc_type + section
  headings`, used as the embedding target.

It draft-time generation is a `find_skeleton` tool that returns the
skeleton, plus a `find_legal_references` tool that pulls verbatim
article text from `corpus_chunks` (public-domain Ecuadorian codes —
safe to quote). The LLM redrafts each section in fresh Spanish-legal
prose against the skeleton, grounded in the cited articles. Output is
genuinely new expression; no source body ever reaches the model.

## What changed

### Removed

- `legal-templates` `SchemaProfile` (chunker `DEFAULT_PROFILES`).
- Verbatim-body handoff in `chat.py`'s old `find_template` tool.
- The `template_chunks`-targeted ingest path in the chunker (chunker
  no longer writes templates to the DB).

### Added

**Chunker (`legalcanvas-chunker/`)**

- `src/shared/lib/skeleton.ts` — TS port of `skeleton.py`. Pure
  functions: `isHeading`, `extractCitationsFrom`, `buildSkeleton`,
  `makeIntentSurface`. Mirror of the Python regex set + heuristics.
- `src/shared/lib/skeleton.test.ts` — vitest mirror of
  `test_skeleton.py`. Heading detection, citation lookforward,
  end-to-end skeleton dedup. Currently 5/5 pass.
- `legal-skeletons` `SchemaProfile` in `ConfigEntities.ts`. Targets
  the `skeletons` table with `sectionsColumn`, `citationsColumn`,
  `fieldsColumn`, and `bodyColumn`=`source_body`. Operator fields:
  `name`, `title`, `docType`. Strategy: existing `wholeDocument`.
- `pgvectorLayout.ts` extended to handle the two new jsonb columns
  and to compute the intent-surface text from
  `documentFieldValues + section headings` instead of the chunk's
  first-1500-chars surface. WeakMap-cached so the body isn't
  re-parsed once per output column.
- `SchemaProfile` shared type gained `sectionsColumn?` and
  `citationsColumn?`.
- `SkeletonPreview` component (`components/app/SkeletonPreview.tsx`)
  rendered in `DocumentWorkspace` next to `PlaceholderSummary`.
  Collapsible header with sections/citations/fields counts; expanded
  view shows the section list + citation chips + field chips.
  Auto-hides when nothing structural is detected (so the panel
  doesn't clutter when working on codes via the article chunker).

**Corpus-viewer (`legal-ai/corpus-viewer/`)**

- `init.sql` — new `skeletons` table with skeleton-only columns
  (`sections`, `fields`, `citations` as jsonb), an embedding-pinned
  intent-surface `text`, and an audit-only `source_body` /
  `source_path`. Column renames vs. the old shape:
  `template_name`→`name`, `template_type`→`doc_type`.
- `skeleton.py` + `test_skeleton.py` — pure-function extractor with
  unit tests on a representative Ecuadorian-template slice.
- `ingest_skeletons.py` — walks `legal-ai/marked/` recursively, runs
  the skeleton extractor, embeds the intent surface, upserts into
  `skeletons` (delete-by-name + insert, idempotent). Supports
  `--sample N` and `--dry-run` for iterative ingestion.
- `server.py` — endpoints renamed to `/api/skeletons/*`. The
  `/source` endpoint returns the verbatim body with an
  `is_source_verbatim: true` flag and an `X-Source-Verbatim: true`
  header so any future client can see it's audit material, not LLM
  output.
- `chat.py` — tools `find_skeleton` (skeleton only, NO body) and
  `find_legal_references` (pulls article text from `corpus_chunks`
  via citation keys). System prompt updated to instruct the LLM to
  redraft each section in fresh prose, NOT reproduce source.
- Frontend (`static/index.html`) — sections panel (collapsible
  cards), citation chips, field chips, audit-source toggle behind an
  orange warning. UI label changed from "Plantillas" to "Esquemas".

## Schema

```
CREATE TABLE skeletons (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- Identity
    name        TEXT NOT NULL UNIQUE,   -- slug, natural key
    doc_type    TEXT NOT NULL,          -- demanda / contrato / minuta / …
    title       TEXT NOT NULL,

    -- Skeleton (the only payload the LLM sees)
    sections    JSONB NOT NULL,         -- [{order, heading, fieldNames, citationKeys}]
    fields      JSONB NOT NULL,         -- [{name, type}]
    citations   JSONB NOT NULL,         -- [{key, code, article}]

    -- Embedding intent surface
    text        TEXT NOT NULL,          -- title + doc_type + section headings
    embedding   vector(1536),

    -- Audit only — never given to the LLM
    source_body TEXT,
    source_path TEXT,

    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Pipeline

```
                ┌──────────────────────────┐
                │  .docx files in marked/  │
                └──────────────┬───────────┘
                               │
                ┌──────────────┴───────────┐
                │   skeleton extraction    │   skeleton.{py,ts}
                │   (sections/cites/fields)│
                └──────────────┬───────────┘
                               │
                               ▼
        ┌───────────────────────────────────────┐
        │              skeletons                │   pgvector
        │  name · doc_type · title              │
        │  sections · fields · citations  ◄────┐│
        │  text · embedding                    ││
        │  source_body (audit only)            ││
        └───────────────────────────────────────┘│
                               ▲                 │
                  ┌────────────┴───────────┐     │
                  │   chunker / Python     │     │
                  │   ingest pipeline      │     │
                  └────────────────────────┘     │
                                                 │
                                                 │ find_skeleton
                                                 │ (top-1, no body)
                                                 │
        ┌─────────────────────────┐              │
        │   user: "crea una       │   chat.py    │
        │   acusación de tránsito"├──────────────┘
        └─────────────────────────┘              │
                  │                              │
                  │ find_legal_references        │
                  │ (citations[] → corpus_chunks)│
                  ▼                              │
        ┌─────────────────────────┐              │
        │     corpus_chunks       │ ◄────────────┘
        │  (public-domain codes)  │
        └─────────────────────────┘
                  │
                  ▼
        LLM drafts fresh prose per section,
        grounded in cited articles, parameterized
        by user context.
```

## Profile (chunker `legal-skeletons`)

| Field          | Source                          | Column         |
|----------------|---------------------------------|----------------|
| `name`         | operator                        | `name`         |
| `title`        | operator (pre-filled)           | `title`        |
| `docType`      | operator (select)               | `doc_type`     |
| sections       | derived from body via skeleton  | `sections`     |
| citations      | derived from body via skeleton  | `citations`    |
| fields         | derived from body via skeleton  | `fields`       |
| text           | computed: `title + doc_type + section headings` | `text` |
| embedding      | OpenAI `text-embedding-3-small` | `embedding`    |
| body (audit)   | chunk body                      | `source_body`  |

## Local workflow

```bash
# 1. Apply the schema (idempotent)
docker exec -i legalcanvas-local-pg psql -U legalcanvas -d legalcanvas \
  < /path/to/legal-ai/corpus-viewer/init.sql

# 2A. Ingest via Python (batch, no UI)
cd /path/to/legal-ai/corpus-viewer
OPENAI_API_KEY=sk-… ./.venv/bin/python3 ingest_skeletons.py --sample 5  # smoke
OPENAI_API_KEY=sk-… ./.venv/bin/python3 ingest_skeletons.py             # full run

# 2B. Or ingest via Chunker Studio (per-doc UI review)
#   - Pick "Document skeletons" profile
#   - Load the marked/ folder
#   - Review SkeletonPreview per doc
#   - Index All

# 3. Browse + chat
cd /path/to/legal-ai/corpus-viewer
ANTHROPIC_API_KEY=… OPENAI_API_KEY=… ./.venv/bin/uvicorn server:app --reload --port 8090
# Open http://localhost:8090 → "Esquemas" toggle → pick a doc → see
# sections / citations / fields. Try a chat query like
# "crea una acusación particular de tránsito penal".
```

## Pending UX (chunker)

_(none — see history below.)_

### Done

- **Always-render `SkeletonPreview`, with an empty state.** When
  `buildSkeleton` returns 0/0/0, the panel now renders dimmed
  (muted-foreground on `secondary/30`) with the counters still
  visible and a one-line hint ("No structure detected — does this
  document have uppercase headings?", i18n key `skeleton.emptyHint`).
  The expand affordance is suppressed in the empty state. The panel
  still returns `null` when `text === null` (no doc parsed yet).
- **Skeleton-mode workspace.** When
  `effectiveSettings.chunkingStrategy === "wholeDocument"`,
  `DocumentWorkspace` swaps the right pane from `ChunksPanel` to a new
  `SkeletonPanel` and replaces `DocumentStatsRow` with
  `SkeletonStatsRow`. The compact `SkeletonPreview` strip auto-hides
  in skeleton mode (the new panel covers it). `SkeletonPanel` renders
  one numbered card per section with per-section citation/field
  chips and an audit-tagged "Show source body" disclosure;
  `SkeletonStatsRow` exposes Sections / Citations / Fields counts
  for the active doc. New shared helper:
  `extractSectionBodies(body)` in `src/shared/lib/skeleton.ts` —
  body slices aligned by index with `buildSkeleton(body).sections`,
  used by the panel's per-section disclosure (kept out of
  persistence to preserve the IP-protection goal).

## What's not yet wired (production)

The `legalcanvas-infrastructure` and `legalcanvas-migrations` repos are
intentionally untouched. To promote skeletons to production we'll need:

1. A migration that creates `skeletons` (mirror of the corpus-viewer's
   `init.sql` block, with `id UUID` instead of `BIGINT IDENTITY` to
   match production conventions). Optionally drops `template_chunks`.
2. `core/skeleton/` package in `legalcanvas-backend/` mirroring
   `core/corpus/` — domain entities, `SkeletonRepository` interface,
   pgvector implementation.
3. `find_skeleton` and `find_legal_references` tools registered in
   `core/chat/application/send_message.go` (alongside the existing
   `legalTools()`). Same shape as the corpus-viewer prototype.
4. System-prompt addendum for both lawyer and executive personas
   instructing them to draft fresh prose against the skeleton, not
   reproduce source.
5. Prompt caching on the `find_legal_references` tool result so
   iterative drafting in a single session re-reads cached article
   text — this is the largest cost knob for the long-doc case.

The corpus-viewer already validates the prompt shape, similarity
threshold, and tool-use loop end-to-end, so the production port is a
straight Go translation rather than further design work.
