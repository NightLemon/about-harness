# Repository guide

## Purpose

This repository is a Chinese learning site about AI agent harnesses. Keep stable concepts separate from version-sensitive product behavior.

## Writing

- Define an English term on first use; prefer plain Chinese afterward.
- Mark product facts with a source and a checked date when they may change.
- Do not present a model ranking as universal. State workload, harness, settings, and evidence.
- Every tutorial should include a verification step and a safe rollback or stop condition when relevant.
- Keep examples free of real secrets, personal paths, and destructive commands.

## Verification

After changing Markdown or site configuration, run:

```bash
npm run check
```

Do not claim a review round is complete until its findings, edits, and verification are recorded under `docs/reviews/`.

