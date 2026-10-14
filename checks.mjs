import assert from 'node:assert/strict';
import { G, DT, SOFTENING, step, accelerations, validateBody } from './physics.js';
import { body, preset, state, restore } from './state.js';
const tests = [];
function test(name, fn) { fn(); tests.push(name); console.log(`PASS ${name}`); }
const close = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≠ ${expected}`);
test('Equal and opposite pairwise forces', () => {
  const b = [body({ mass: 3, x: -20 }), body({ mass: 7, x: 20 })], a = accelerations(b);
  close(b[0].mass * a[0].x + b[1].mass * a[1].x, 0); assert.ok(a[0].x > 0 && a[1].x < 0);
});
test('One circular orbit: distance, energy and momentum conserved', () => {
  let b = preset('orbit'); const initial = b.map(item => ({ ...item }));
  const energy = bs => bs.reduce((sum, x) => sum + .5 * x.mass * (x.vx ** 2 + x.vy ** 2), 0) - G * bs[0].mass * bs[1].mass / Math.sqrt((bs[0].x - bs[1].x) ** 2 + (bs[0].y - bs[1].y) ** 2 + SOFTENING ** 2);
  const e0 = energy(b), period = 2 * Math.PI * 160 / (b[1].vy - b[0].vy);
  for (let i = 0; i < Math.round(period / DT); i++) b = step(b).bodies;
  assert.equal(b.length, 2); close(Math.hypot(b[0].x - b[1].x, b[0].y - b[1].y), 160, .0001);
  close(energy(b), e0, .00001); close(b.reduce((s, x) => s + x.mass * x.vx, 0), 0, 1e-8); close(b.reduce((s, x) => s + x.mass * x.vy, 0), 0, 1e-8);
  assert.ok(Math.hypot(b[1].x - initial[1].x, b[1].y - initial[1].y) < .02);
});
test('Collision preset annihilates both bodies', () => {
  let b = preset('collision'), removed = 0;
  for (let i = 0; i < 3000 && b.length; i++) { const result = step(b); b = result.bodies; removed += result.removed.length; }
  assert.equal(b.length, 0); assert.equal(removed, 2);
});
test('All simultaneous collision participants removed, unrelated body survives', () => {
  const b = [-2, 0, 2, 100].map(x => body({ x, radius: 1 }));
  const result = step(b); assert.equal(result.removed.length, 3); assert.deepEqual(result.bodies.map(x => x.id), [b[3].id]);
});
test('Swept detection catches a high-speed crossing', () => {
  const result = step([body({ x: -10, vx: 4000, radius: 1 }), body({ x: 10, vx: -4000, radius: 1 })]);
  assert.equal(result.bodies.length, 0); assert.equal(result.removed.length, 2);
});
test('Coincident bodies removed before singular force evaluation', () => {
  const result = step([body(), body()]); assert.equal(result.bodies.length, 0);
});
test('Free motion has no canvas boundary', () => {
  const b = body({ x: 9999, y: -9999, vx: 20, vy: -10 }); const next = step([b]).bodies[0];
  close(next.x, b.x + 20 * DT); close(next.y, b.y - 10 * DT);
});
test('Invalid inputs and unstable updates rejected without mutation', () => {
  for (const change of [{ mass: 0 }, { radius: -1 }, { x: NaN }, { vy: Infinity }, { mass: 1e13 }]) assert.ok(validateBody(body(change)));
  const input = [body({ x: 1e12, vx: 1e12 })], copy = structuredClone(input);
  assert.throws(() => step(input), /safety/); assert.deepEqual(input, copy);
});
test('Reset restores all initial settings and clears runtime history', () => {
  state.initial = preset('orbit'); const original = structuredClone(state.initial); restore();
  state.bodies[0].x = 800; state.bodies.pop(); state.time = 100; state.phase = 'paused';
  state.trails.set(1, {}); state.effects.push({}); restore();
  assert.deepEqual(state.bodies, original); assert.deepEqual(state.initial, original);
  assert.equal(state.time, 0); assert.equal(state.phase, 'ready'); assert.equal(state.trails.size, 0); assert.equal(state.effects.length, 0);
});
console.log(`${tests.length} functional checks passed.`);
