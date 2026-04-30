<!--
Thanks for sending a PR! A few quick reminders:

- Title is the squash-merge commit + release-notes line — make it
  describe *what changed* in plain language ("Add OCR fallback for
  scanned PDFs", not "fixes #42").
- Apply a label so the change shows up in the right release-notes
  section: feature / bug / docs / chore.
- CI must be green before merge.
-->

## What changed

<!-- Brief summary in 1–3 sentences. -->

## Why

<!-- The problem this solves, or the use case it unlocks. Skip if it's
     a tiny doc/typo fix. -->

## How to test

<!-- Concrete steps a reviewer can run to verify the change. -->

## Checklist

- [ ] Title describes the change in plain language
- [ ] Component changes stay ≤180 lines
- [ ] Strings go through `useT()`; both `en.ts` and `es.ts` updated
- [ ] Storybook story added/updated for new UI
- [ ] `npm run typecheck && npm run build` pass locally
