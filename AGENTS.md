# Repository guide

## Purpose

This repository is a Chinese learning site about AI agent harnesses. Keep stable concepts separate from version-sensitive product behavior.

## Writing

- Define an English term on first use; prefer plain Chinese afterward.
- Mark product facts with a source and a checked date when they may change.
- Do not present a model ranking as universal. State workload, harness, settings, and evidence.
- Every tutorial should include a verification step and a safe rollback or stop condition when relevant.
- Keep examples free of real secrets, personal paths, and destructive commands.
- Use Chinese prose; preserve product names, commands, API fields, and configuration keys in English.
- Separate stable mechanisms, product facts, project recommendations, and examples.
- Label evidence as E0, E1, E2, or E3. Never upgrade evidence merely because a command succeeded.
- A tutorial must state prerequisites, pinned versions, inputs, commands, expected outputs, assertions, a failure case, cleanup, rollback, and known limits.

## Facts and sources

- Register volatile claims in `docs/references/fact-registry.md`.
- Prefer official documentation or the maintained repository; pin a tag or commit when possible.
- A checked date means the cited source or target version was actually inspected on that date.
- If online verification is unavailable, mark the claim `待核验` or E0; do not invent a checked result.
- Product comparisons must state version, surface, workload, configuration, and evidence boundary.

## Experiments and safety

- Offline fake/replay fixtures are the default. Live adapters must be disabled by default.
- Never commit credentials, private paths, private traces, personal data, or unredacted tool output.
- Record task, run, trace, result, fixture hash, configuration, exit code, and failure classification.
- Do not present E1 replay evidence as proof of live-model quality.
- Real APIs, fees, Git remotes, pushes, PRs, Pages, and releases require separate authorization.

## Verification

After changing Markdown or site configuration, run:

```bash
npm run check
npm run facts:check
npm run pages:check
```

Do not claim product usability or model quality from static validation or offline replay alone.
