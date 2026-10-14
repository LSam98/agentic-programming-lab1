# Orbit Lab: instructions for coding agents

Shared by every agent on this repo (Codex reads this file directly; Claude Code imports it from CLAUDE.md).
Keep it short and true. If a rule here is wrong, fix the rule in its own commit.

## Project
- 2D N-body gravity simulator. Course project (Agentic Programming, HUJI), two developers, each with their own agent.
- Live site: GitHub Pages, deployed from `main`, repo root: https://lsam98.github.io/agentic-programming-lab1/
- Stack: plain HTML, CSS, JavaScript ES modules. No dependencies, no frameworks, no CDN scripts, no build step.
  Changing that needs both developers to agree first.

## Files
- `physics.js`: validation, pairwise accelerations, velocity Verlet step, collisions.
- `state.js`: initial and runtime state, body creation, presets, reset.
- `renderer.js`: canvas drawing, trails, effects, pan and zoom.
- `ui.js`: body editor, controls, presets.
- `app.js`: animation loop and fixed-step accumulator.
- `index.html`, `styles.css`: layout and styling.
- `checks.mjs`: dependency-free physics checks.

## Run and test
- Serve the folder over HTTP (ES modules do not load from `file://`):
  - Windows PowerShell: `python -m http.server 8000`
  - macOS / Linux / WSL: `python3 -m http.server 8000`
  - Then open http://localhost:8000
- Physics checks: `node checks.mjs` (Node 22+). They must pass before any commit that touches `physics.js` or `state.js`.

## Physics invariants
- Units are abstract L, M, T with G = 1. Fixed timestep DT = 0.005 T, velocity Verlet, Plummer softening 0.5 L.
- Do not make the timestep depend on frame rate.
- Any change to physics behaviour adds or updates a check in `checks.mjs`.

## Working rules
- Never commit to `main`. One branch per task, named `feat/...`, `fix/...` or `chore/...`.
  Work reaches `main` only through a pull request the other developer has seen.
- Touch only the files the task needs. Do not reformat, rename or reorganise code you are not changing:
  the other developer is editing in parallel, and unrelated churn causes merge conflicts.
- Use relative paths (`./app.js`, not `/app.js`); the site is served under `/agentic-programming-lab1/`.
- Keep `.nojekyll` at the repo root.
- Update `README.md` when controls, presets or physics behaviour change.
- Commits: one topic each, message in the imperative ("Add three-body preset").
