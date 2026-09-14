# Codex project rules

## Scope

- Change only what the user requested. Inspect related files and functions first; expand only when evidence requires it.
- For small fixes, do not inventory or reanalyze the whole repository.
- Reuse existing functions, UI, CSS, and data structures. Leave unrelated working behavior untouched.
- Prefer the smallest focused change; do not use a small request as a reason for a broad refactor.
- If the necessary scope is materially larger than expected, stop and report it before expanding.

## Reasoning and verification

- Minor UI, CSS, copy, and isolated fixes normally need light reasoning, including with GPT-5.6 Sol or GPT-6 Astra.
- Test only the changed path and its direct regressions. Do not routinely test every theme, screen, navigation mode, or unrelated feature.
- Do not repeat the same analysis or test without a concrete reason.
- Once the issue is resolved and the necessary tests pass, stop investigating.
- Keep progress notes and final reports concise.

## Safety and compatibility

- For Supabase, authentication, RLS, synchronization, or data migration work, prioritize safety and verify the affected data flow.
- Unless explicitly requested, preserve `taskKanrinnerV1`, schemaVersion 10, immediate local `save()`, Supabase sync and revision handling, JSON backups, and existing stored-data formats.
- Never discard, reset, or force-migrate existing local or cloud user data merely because an optional field is missing.

## Git

- Run `git add`, `git commit`, and `git push` once near the end, limited to the requested files.
- Try `git push` at most once. If safety restrictions reject it, do not retry; leave the commit complete and show only the user's push command.

## USER-OWNED tutorial copy

- `tutorial-copy.js` is USER-OWNED. Do not change its wording unless explicitly requested.
- Never restore, initialize, regenerate, improve, or rewrite its copy during feature work or refactoring; logic may only consume its exported steps.
