# LLM-driven schema suggestion

Status: design proposal — not yet implemented.
Owner: TBD.
Last updated: 2026-04-28.

## Problem

Chunker Studio supports user-defined **schema profiles** that pin
together a target table, column map, per-document fields, chunking
strategy, and embedding model. Authoring a profile manually is
tedious for non-technical operators: they have to know what metadata
their downstream RAG pipeline benefits from, pick the right chunking
strategy, and translate each idea into column names.

We want a "Suggest schema" button: given one or more parsed documents
in a folder, a local LLM proposes a starting profile that the user
can review and edit before saving.

## Non-goals

- Replacing manual editing. The proposal is a starting point. Every
  field stays editable, and the operator must explicitly save.
- Generating SQL DDL. The schema editor still expects the target
  table to exist; suggestion only proposes the *Profile* (mapping +
  fields), not the table itself.
- High-stakes correctness. A wrong proposal is recoverable; the user
  edits or regenerates. We don't need 95th-percentile correctness,
  just "useful most of the time."

## User flow

1. Operator opens the **Schemas** tab in Preferences and clicks
   **+ New from sample**.
2. A modal asks them to point at a folder (or select an already-loaded
   document). Up to N documents are sampled.
3. The modal shows "Analyzing with `<local model>`…" with a progress
   bar. (Average time: 5–30 s on a 7B model.)
4. The modal renders the proposal as an editable form:
   - Profile name (pre-filled, editable)
   - Target table (operator types it; we can't infer it without a
     DB introspection step)
   - Suggested chunking strategy with one-line reasoning
   - Per-document fields list (each row: column name + label + kind +
     options)
   - Embedding model recommendation (deferred: usually re-uses the
     defaults from a sibling profile)
5. Buttons: **Regenerate**, **Save**, **Cancel**.

## Prompt contract

Input: up to ~3500 tokens of parsed text concatenated from one or
more sample documents (chosen by character count, not chunk count,
so non-articulated docs don't pre-bias). Plus a fixed taxonomy of
chunking strategies the system supports.

Prompt skeleton (plain English, model decides language to respond
in based on input):

```
You are a metadata-design assistant for a document retrieval system.
Given the sample text below, propose a schema profile suitable for
chunking and storing the documents in a vector database.

Respond with strict JSON matching this shape:
{
  "name": "...",                        // short profile name
  "description": "...",                 // 1–2 sentences on what this profile is for
  "chunking": {
    "strategy": "articleAware" | "paragraph" | "section" | "fixedWindow",
    "reason": "..."
  },
  "documentFields": [
    {
      "column": "snake_case_column_name",
      "label": "Human label",
      "kind": "text" | "select",
      "required": true,
      "options": ["..."]                // only when kind=select
    }
  ]
}

Constraints:
- Use snake_case for all column names.
- documentFields should capture metadata that varies per source document
  (not per chunk).
- Prefer 2–6 documentFields. Fewer is better than padding.
- For documents without numbered articles, prefer "paragraph" or "section".
- Do not invent fields the sample doesn't suggest.
- Do not output anything outside the JSON object.

Sample text:
"""
{INPUT}
"""
```

We rely on Ollama's `format: "json"` flag for the response (works
with Llama 3.1+, Qwen 2.5+, and most modern instruction-tuned
models). Without it we'd post-process to strip code fences, but the
flag is simpler.

## Validation + retry

The response is parsed with a Zod schema mirroring the contract. On
validation failure, we retry once with the original prompt plus the
validation error appended:

```
Your previous response did not match the required JSON shape:
{ZOD_ERROR}
Please respond again, strictly matching the schema.
```

If retry fails, we surface the raw response in the modal with a
"Could not parse the response — try regenerate or edit manually"
banner. The operator can paste their own JSON in.

## Model recommendations

Tested against the prompt shape above (rough quality bar: produces
parseable JSON, picks a defensible chunking strategy, fields look
reasonable):

| Model                   | Params | Quality   | Latency (M2 Pro) |
|-------------------------|-------:|-----------|------------------|
| `llama3.2:3b`           | 3 B    | Hit/miss  | ~3 s             |
| `llama3.1:8b`           | 8 B    | Solid     | ~8 s             |
| `qwen2.5:7b-instruct`   | 7 B    | Solid     | ~7 s             |
| `qwen2.5:14b-instruct`  | 14 B   | Strongest | ~18 s            |
| `mistral-nemo:12b`      | 12 B   | Solid     | ~14 s            |

Recommended default: `qwen2.5:7b-instruct` — best quality-to-latency
ratio, handles Spanish well (relevant for legalCanvas's domain), and
respects `format: "json"` reliably. Recommendation lives in the
Settings UI as a hint; the operator picks any installed model.

## Integration points

This feature sits on top of features #1 (schema profiles) and #2
(Ollama integration). Pre-requisites:

- Profile shape exists and the Schemas tab can render an arbitrary
  profile.
- Ollama provider can be reached and a chat-capable model is
  selected (note: chat model, not embedding model — separate config).
- The renderer-side `chunkerClient` exposes `ollama:generate` (a new
  IPC call wrapping `POST /api/generate`).

New IPC channels to add:

- `ollama:list-chat-models` — filter `/api/tags` to chat-capable
  models (excludes pure embedding models).
- `ollama:generate` — `{ model, prompt, format?: "json", timeoutMs }`
  → string (the response). We don't stream; the operator waits.
- `profiles:from-suggestion` — server-side helper that takes the
  parsed JSON proposal + a generated id and creates a draft Profile
  the UI can render and save.

New components:

- `SchemaSuggestionDialog` — owns the sample-text gathering, model
  call, and JSON parsing. ~200 lines, will likely need to split into
  `SchemaSuggestionForm` + `SchemaProposalEditor`.
- `ChatModelPicker` — shared with future features that use the local
  LLM (e.g. summary generation).

## Edge cases worth handling

- **Mixed-language documents**: if half the sample is Spanish and half
  English, the model occasionally proposes column names in Spanish
  (`tipo_documento`). Acceptable — the operator can rename. We don't
  force English.
- **Empty / scanned PDFs**: parsed text is empty. Show "Sample is
  empty — pick another document or run OCR first" instead of calling
  the model.
- **Very long sample**: cap at 3500 tokens of input. We slice by
  character count (1 char ≈ 0.25 tokens for Latin scripts) rather
  than tokenizing. Worst case the model gets ~14 KB of text, which
  every recommended model handles.
- **Operator runs without Ollama**: the button is disabled with
  tooltip "Configure Ollama in Connections to enable schema
  suggestions."

## What this feature explicitly does NOT do

- Migrate or create the target table. The operator must already have
  a table and provide its name. (A "DB introspection" step that
  reads existing tables is a separate, smaller feature and can be
  built independently.)
- Suggest the embedding model. The choice is dimension-coupled to
  the table column type and is too high-stakes to leave to a model
  that has no view of the DB.
- Cache proposals. Each click re-runs the model. Caching is cheap to
  add later and out of scope for v1.

## Estimated effort

Roughly 1 session, breakdown:

- Ollama generate IPC + chat-model picker: 2–3 hours
- SchemaSuggestionDialog + JSON parser + Zod validator: 3–4 hours
- Wiring into the Schemas tab + manual QA on 3–5 sample folders:
  1–2 hours

## Open questions (track before starting)

- Do we want per-chunk fields too (e.g. `obligation_party` for
  insurance contracts)? Currently profiles only have per-document
  fields. Adding per-chunk would require chunker support to extract
  those values during chunking — a much bigger change. Recommend
  deferring.
- Should the proposal account for an existing target table the
  operator names up-front? If yes, we'd introspect the table and
  ask the model to align with its columns. Adds a DB hop but cuts
  edit-after-suggest time roughly in half.
- Should the modal accept several sample documents at once, or just
  one? Multi-doc gives the model better context for picking
  varying-vs-constant fields, at the cost of more tokens. Recommend
  multi-doc with a 5-doc cap.
