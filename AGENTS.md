# Repository Guidelines

## Project Structure & Module Organization
This repo is split between a React/TypeScript frontend and a Django-style backend. Frontend code lives in `src/`: page routes in `src/pages`, reusable UI in `src/components`, hooks in `src/hooks`, shared helpers in `src/lib` and `src/utils`, and types in `src/types`. Backend code lives in `backend/`, with API logic centered in `backend/api` (`models.py`, `serializers.py`, `views.py`, `urls.py`) and project-level settings under `backend/business_system`. Keep performance or manual verification scripts at the repo root (for example `performance_test.py`).

## Build, Test, and Development Commands
Use the commands that already appear in the repo instead of inventing new scripts:
- `python backend/manage.py migrate --noinput` — apply backend migrations.
- `python backend/manage.py collectstatic --noinput --clear` — collect static assets.
- `python backend/manage.py apply_fab_rules` — run the custom Fab Info maintenance command.
- `python performance_test.py` — run the existing API timing smoke test against `http://localhost:8000`.
- `docker build -f backend/Dockerfile backend` — validate the backend container build.

Note: this checkout currently does **not** include a root `package.json`; document or add frontend scripts only when the actual toolchain files are restored.

## Coding Style & Naming Conventions
Follow the surrounding file style. Frontend code uses TypeScript function components, `@/` path aliases, semicolons, and mostly 2-space indentation. Use `PascalCase` for components/pages, `useX` for hooks, and keep utility modules descriptive (`menu1.utils.ts`, `fabInfo.types.ts`). Backend Python should remain 4-space indented with snake_case module/function names. No ESLint/Prettier config is committed here, so avoid style-only churn and keep imports tidy by hand.

## Testing Guidelines
There is no committed automated frontend test suite yet and no coverage gate in this snapshot. For backend changes, add focused Django tests where practical under `backend/api/tests/`. For frontend changes, prefer colocated `*.test.ts(x)` files once the toolchain is restored. Until then, include reproducible manual checks and run `python performance_test.py` when API performance is relevant.

## Commit & Pull Request Guidelines
Recent history follows conventional prefixes such as `feat:`, `fix:`, and `debug:`. Keep subjects short, imperative, and scoped to one change. PRs should include: a brief problem/solution summary, affected paths, verification steps actually run, linked issues, and screenshots or GIFs for UI updates. If you touch mock placeholder files, call that out explicitly so reviewers know what still needs source-of-truth confirmation.
## Context Isolation (Subagent Rule)

Keep the main context window lean. When this environment provides subagent tooling (Claude Code `Task`, OpenCode `task`/`agent`, Hermes `delegate_task`, Codex collab, or equivalent), use it to isolate context-heavy work. If no subagent tooling exists, ignore this section.

1. **Delegate large read-only output.** Route codebase/document exploration whose raw output is expected to exceed a few thousand tokens (multi-file reads, broad searches, document/log dumps) and browser screenshot loops (Playwright etc.) to a subagent. Quick lookups of one or two files stay in the main context.
2. **Dispatch self-contained prompts.** Subagents have no access to this conversation. Every dispatch must carry the goal, exact paths or search terms, constraints, and the expected return format.
3. **Return summaries with references.** Subagents report a concise summary with `path:line` references (plus one final screenshot for visual checks) so specifics can be re-read on demand without re-exploration.
4. **Verify in the main context.** Final user-facing verification — last diff review and final screenshot — is performed directly by the main agent. Subagent reports are input, not proof.
