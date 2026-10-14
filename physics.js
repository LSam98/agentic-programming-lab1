// Simulation units: length L, mass M, time T. G = 1 L³/(M·T²).
export const G = 1;
export const DT = 0.005;
export const SOFTENING = 0.5; // Plummer softening length, in L.
const LIMIT = 1e12;
export function validateBody(body) {
  for (const key of ['mass', 'radius', 'x', 'y', 'vx', 'vy']) {
    if (!Number.isFinite(body[key]) || Math.abs(body[key]) > LIMIT) return `${key} must be finite and within ±10¹².`;
  }
  if (body.mass <= 0 || body.radius <= 0) return 'Mass and radius must be greater than zero.';
  return null;
}
export function accelerations(bodies) {
  const a = bodies.map(() => ({ x: 0, y: 0 }));
  for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
    const dx = bodies[j].x - bodies[i].x, dy = bodies[j].y - bodies[i].y;
    // a_i = G m_j r_ij / (|r_ij|² + ε²)^(3/2). Equal/opposite forces.
    const f = G / Math.pow(dx * dx + dy * dy + SOFTENING ** 2, 1.5);
    a[i].x += dx * f * bodies[j].mass; a[i].y += dy * f * bodies[j].mass;
    a[j].x -= dx * f * bodies[i].mass; a[j].y -= dy * f * bodies[i].mass;
  }
  return a;
}
function collisionIds(bodies, previous) {
  const ids = new Set();
  for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
    const b = bodies[i], c = bodies[j], radius = b.radius + c.radius;
    let dx = b.x - c.x, dy = b.y - c.y;
    if (previous) {
      // Swept relative segment also catches bodies crossing within a fixed step.
      const px = previous[i].x - previous[j].x, py = previous[i].y - previous[j].y;
      const sx = dx - px, sy = dy - py, d2 = sx * sx + sy * sy;
      const t = d2 ? Math.max(0, Math.min(1, -(px * sx + py * sy) / d2)) : 0;
      dx = px + t * sx; dy = py + t * sy;
    }
    if (Math.hypot(dx, dy) <= radius) { ids.add(b.id); ids.add(c.id); }
  }
  return ids;
}
export function step(input, dt = DT) {
  const initialIds = collisionIds(input);
  const initialRemoved = input.filter(b => initialIds.has(b.id));
  const before = input.filter(b => !initialIds.has(b.id));
  const a = accelerations(before);
  // Velocity Verlet: drift with old acceleration, then kick with mean acceleration.
  const next = before.map((b, i) => ({ ...b,
    x: b.x + b.vx * dt + 0.5 * a[i].x * dt * dt,
    y: b.y + b.vy * dt + 0.5 * a[i].y * dt * dt,
  }));
  if (next.some(b => validateBody(b))) throw new Error('Numerical safety limit reached. Reset or reduce masses and velocities.');
  const ids = collisionIds(next, before);
  const survivors = next.filter(b => !ids.has(b.id));
  // Recompute after removal so disappeared bodies do not contribute the final kick.
  const fresh = accelerations(survivors);
  survivors.forEach((b, i) => {
    const oldIndex = before.findIndex(old => old.id === b.id);
    b.vx += 0.5 * (a[oldIndex].x + fresh[i].x) * dt;
    b.vy += 0.5 * (a[oldIndex].y + fresh[i].y) * dt;
  });
  if (survivors.some(b => validateBody(b))) throw new Error('Numerical safety limit reached. Reset or reduce masses and velocities.');
  return { bodies: survivors, removed: [...initialRemoved, ...next.filter(b => ids.has(b.id))] };
}
