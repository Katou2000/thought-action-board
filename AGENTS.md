# Codex project rules

## Scope and token efficiency

- Change only what the user requested. Start with related files and expand the search only when necessary.
- Do not repeatedly analyze the entire repository or rerun the same investigation/test.
- Leave working features untouched and reuse existing functions, UI, and CSS.
- Prefer small, focused edits over broad refactors. If unexpectedly broad changes are required, report that before expanding scope.
- Run tests that are necessary and sufficient for the changed area; do not run a full regression suite for every minor UI/CSS/copy edit.
- Keep work logs concise. Run `git add`, `git commit`, and `git push` once near completion by default.
- For minor UI/CSS/copy work, prefer a lighter model when available and quality is not compromised.
- For Supabase, authentication, RLS, synchronization, or data migration work, prioritize safety over token savings.

## USER-OWNED tutorial copy

- `tutorial-copy.js` is USER-OWNED. Do not change its tutorial wording unless the user explicitly asks for copy changes.
- Feature work and refactors must not restore older tutorial wording, initialize it, or regenerate it.
- Do not independently edit, improve, or rewrite the copy. Logic may consume the exported step arrays without owning their text.
