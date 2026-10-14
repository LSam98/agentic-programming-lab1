# Orbit Lab

A client-side 2D N-body gravity laboratory. Plain HTML, CSS, and JavaScript ES modules; no dependencies or build step. All paths are relative and ready for GitHub Pages.

## Run locally from WSL

In a WSL terminal:

```bash
cd /home/ariel/codex-test
python3 -m http.server 8000 --bind 0.0.0.0
```

Open **http://localhost:8000** in your Windows browser. Keep the terminal running; Ctrl+C stops the server. ES modules need HTTP, so do not double-click `index.html`. If port 8000 is busy, use 8001 in both places. If Windows localhost forwarding is disabled, run `hostname -I` in WSL and open `http://<WSL-IP>:8000`.

## Use

Load **Orbital duet** or **Collision course**, then Start. Select a body, change properties, and **Apply initial conditions** to update the live canvas preview. Add/delete bodies while ready; reset to unlock editing after launch. Pause/resume, choose 0.25×–16× speed, toggle/clear trails, scroll to zoom, drag to pan, or Fit system. Fit only changes the view, never the physics. Bodies may leave the canvas.

## Physics and units

Length **L**, mass **M**, time **T**, velocity **L/T**. These are consistent abstract simulation units, not SI or astronomical scales. Gravitational constant **G = 1 L³/(M·T²)**.

Pairwise softened Newtonian acceleration:

`a_i = Σ G m_j (r_j − r_i) / (|r_j − r_i|² + ε²)^(3/2)`

Plummer softening **ε = 0.5 L** prevents a singularity at tiny distances. Velocity Verlet uses a fixed **Δt = 0.005 T**, independently of drawing frequency. The orbital preset uses the softened circular relative speed `v = sqrt(G (m1+m2) r² / (r²+ε²)^(3/2))` and barycentric positions/velocities so net momentum is zero. Its period is about 401 T.

**Collision rule:** distance ≤ sum of radii removes **both** bodies. Every participant in a simultaneous group is removed, with no merging or bouncing. Initial overlap is checked, as is the relative swept segment within each timestep to reduce tunneling. Collision effects last 650 ms of wall time and exert no force. Disappeared bodies do not contribute the final Verlet acceleration. Swept detection approximates motion by a segment; it is not an exact continuous curved-path solver.

Pairwise gravity and collision detection are O(N²). Arbitrarily many bodies may be added, but large systems cost more CPU. Rendering caps DPR at 2; each trail holds at most 2,400 samples, spaced 0.05 T apart. No adaptive timestep: extreme masses, small radii, or high speeds can produce inaccurate motion despite softening. Inputs and updates must be finite and within ±10¹²; an invalid update pauses safely without committing it. A maximum 400 fixed steps per frame bounds backlog; under load, simulated time slows instead of enlarging the step. Hidden-tab elapsed time is discarded.

## Files

- `physics.js`: validation, pairwise accelerations, Verlet integration, collisions.
- `state.js`: initial/runtime state, body creation, presets, faithful reset.
- `renderer.js`: responsive Canvas, sphere shading, trails, effects, pan/zoom.
- `ui.js`: body editor, validation feedback, presets and controls.
- `app.js`: requestAnimationFrame loop and fixed-step accumulator.
- `styles.css`, `index.html`: responsive interface and accessible controls.

## Checks

Run the dependency-free physics checks with Node 22 or newer:

```bash
node checks.mjs
```

The application itself does not require Node. These checks cover an orbital period, conservation without collisions, simultaneous collisions, overlap, swept collisions, reset and input validation. Browser interaction and appearance should also be reviewed in the target browser.
