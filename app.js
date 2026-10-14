import { state } from './state.js';
import { step, DT } from './physics.js';
import { Renderer } from './renderer.js';
import { setupUI, notice, updateStats } from './ui.js';
const renderer = new Renderer(document.getElementById('canvas'));
const ui = setupUI(renderer);
renderer.fit(state.bodies);
let previous = null, lastStats = 0, trailTick = 0;
// Cap wall-time backlog and steps per frame to avoid a spiral of death.
// Under heavy load simulated time slows; the physics timestep never increases.
const MAX_STEPS = 400;
function animate(now) {
  const elapsed = previous === null ? 0 : Math.min((now - previous) / 1000, 0.1);
  previous = now;
  if (state.phase === 'running') {
    state.accumulator = Math.min(state.accumulator + elapsed * state.speed, MAX_STEPS * DT);
    let steps = 0;
    try {
      while (state.accumulator >= DT && steps++ < MAX_STEPS) {
        const result = step(state.bodies);
        state.bodies = result.bodies; state.time += DT; state.accumulator -= DT;
        for (const b of result.removed) state.effects.push({ ...b, at: now });
        if (result.removed.length) notice(`${result.removed.map(b => b.name).join(', ')} disappeared in a collision. ${state.bodies.length} bodies remain.`);
        // Sample by simulation steps, never rendering frame rate. Bound memory.
        if (++trailTick % 10 === 0 && state.trailsEnabled) for (const b of state.bodies) {
          if (!state.trails.has(b.id)) state.trails.set(b.id, { color: b.color, points: [] });
          const points = state.trails.get(b.id).points; points.push({ x: b.x, y: b.y });
          if (points.length > 2400) points.shift();
        }
        if (!state.bodies.length) { state.phase = 'ended'; state.accumulator = 0; ui.refreshEditor(); break; }
      }
    } catch (error) { state.phase = 'error'; state.accumulator = 0; notice(error.message); ui.refreshEditor(); }
  }
  renderer.draw(state, now);
  if (now - lastStats > 80) { updateStats(); lastStats = now; }
  requestAnimationFrame(animate);
}
document.addEventListener('visibilitychange', () => { previous = null; state.accumulator = 0; });
requestAnimationFrame(animate);
