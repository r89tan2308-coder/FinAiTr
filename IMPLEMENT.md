# Codex Implementation Runbook

## Before each coding phase

1. Read `AGENTS.md`.
2. Read `PLAN.md`.
3. Read `PROGRESS.md`.
4. Read `ARCHITECTURE.md`.
5. Read `DECISIONS.md`.
6. Confirm the next phase is the only active scope.

If any required document is missing, stop product implementation and repair the documentation first.

## Scope control

- Work one phase at a time.
- Keep changes small and reviewable.
- Do not add external integrations in the first MVP.
- Do not add real credentials or API keys.
- Do not expand scope without updating `PLAN.md` and `DECISIONS.md`.
- Keep data local-first.
- Use mock providers behind interfaces for future OCR, AI parsing, bank, Google Drive, crypto, and brokerage behavior.

## Validation

After changes, run available commands:

```powershell
npm install
npm run typecheck
npm run lint
npm run test -- --run
npm run build
```

Rules:

- Run `npm install` when dependencies are added or the scaffold is first created.
- Run typecheck if the script exists.
- Run lint if the script exists.
- Run tests if the script exists.
- Always run build once the app exists.
- If a command fails, fix it before moving to the next phase.
- Record exact commands and results in `PROGRESS.md`.

## Documentation updates

After each phase:

- update `PROGRESS.md` with completed work, validation commands, results, issues, and next step;
- update `ARCHITECTURE.md` if module boundaries or data model changed;
- update `DECISIONS.md` for important choices or scope changes.

## Provider policy

Allowed in first MVP:

- deterministic receipt parser;
- local category guessing;
- mock source/provider interfaces.

Not allowed in first MVP:

- real OCR calls;
- real LLM calls;
- real Google Drive OAuth or API calls;
- real bank, crypto, or brokerage connectors;
- payment execution.

## Git policy

The current folder is not initialized as a Git repository. If Git is initialized later:

- do not revert user changes unless explicitly asked;
- keep commits scoped to a phase;
- do not use destructive reset commands without explicit user approval.

