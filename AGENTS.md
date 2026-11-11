# AGENTS.md — tomekdot.github.io

## Project

Interactive portfolio showcasing GitHub repositories, built with React + Vite + TypeScript + Tailwind CSS 4.
Live: https://tomekdot.github.io/

## User Preferences

- CPU-only setup (integrated graphics) — avoid heavy LLM processes that spike CPU.
- Prefers `qwen3:1.7b` over `qwen3:4b` for memory/performance balance.
- Lowercase commit prefixes (`fix:`, `feat:`, etc.), no `Chore` in docs.
- Translation safeguards: keep proper nouns, repo names, code blocks untranslated.
- Bilingual UI (PL/EN); user speaks Polish and English.
- Prefers direct action without unnecessary questions.

## Key Facts

- Repo: tomekdot/tomekdot.github.io, branch `main`, deploy via GitHub Actions → GitHub Pages.
- Portfolio: 60+ repos across 9 categories (AI, Discord, KUL Academic, Openplanet, Other, PyPlanet, Dev Tools, Trackmania, Web/API).
- AI Studio export syncs: copy `src/` files from `Downloads\tomekdot-—-github-portfolio`, keeping GH Pages customizations (base path, favicons, README, scripts).
- Memory: file-based (this AGENTS.md) preferred over Hindsight (CPU LLM unreliable). mem0 skill in `.agents/skills/mem0`.

## Development

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build → dist/
npm run lint     # tsc --noEmit
```

## Commit Convention

Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `perf:`, `ci:`, etc.
Always include a detailed commit body with bullet points.
Push only when user says "push" or "daj push".

## Memory

This file is the agent's persistent memory (like Claude Code's MEMORY.md).
Update with important decisions, preferences, and project context.
Do not store secrets or personal data here — use `.opencode/memory/PRIVATE.md` for that.
Private data (internship, CV, personal) is stored locally (gitignored).