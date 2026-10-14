export const palette = ['#ffce73', '#64d8ff', '#bba0ff', '#ff8a9c', '#78e6b4', '#f6a76e'];
let serial = 0;
const assignedColors = new Set();
function nextColor(id) {
  let color = palette[id - 1];
  let hue = (id * 137.508) % 360;
  while (!color || assignedColors.has(color)) {
    // Golden-angle hues extend the palette without repeating its six colors.
    const channel = n => {
      const k = (n + hue / 30) % 12;
      return Math.round(255 * (0.65 - 0.3 * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, '0');
    };
    color = `#${channel(0)}${channel(8)}${channel(4)}`;
    hue = (hue + 0.5) % 360;
  }
  assignedColors.add(color);
  return color;
}
export function body(settings = {}) {
  const id = ++serial;
  return { id, name: `Body ${id}`, mass: 10, radius: 5, x: 0, y: 0, vx: 0, vy: 0,
    color: nextColor(id), ...settings };
}
export function preset(name) {
  if (name === 'collision') return [
    body({ name: 'Voyager A', mass: 40, radius: 12, x: -100, vx: 12, color: '#64d8ff' }),
    body({ name: 'Voyager B', mass: 40, radius: 12, x: 100, vx: -12, color: '#ff8a9c' }),
  ];
  // Barycentric circular two-body orbit, with G = 1 and softened gravity.
  const m1 = 1000, m2 = 5, r = 160, eps = 0.5;
  const relativeSpeed = Math.sqrt((m1 + m2) * r * r / Math.pow(r * r + eps * eps, 1.5));
  return [
    body({ name: 'Helios', mass: m1, radius: 17, x: -r * m2 / (m1 + m2), vy: -relativeSpeed * m2 / (m1 + m2), color: '#ffce73' }),
    body({ name: 'Aster', mass: m2, radius: 6, x: r * m1 / (m1 + m2), vy: relativeSpeed * m1 / (m1 + m2), color: '#64d8ff' }),
  ];
}
export const state = {
  initial: preset('orbit'), bodies: [], selected: null, phase: 'ready', time: 0,
  speed: 1, trailsEnabled: true, trails: new Map(), effects: [], accumulator: 0,
};
export function restore() {
  state.bodies = state.initial.map(b => ({ ...b }));
  state.time = 0; state.accumulator = 0; state.trails.clear(); state.effects = [];
  state.phase = 'ready';
}
restore();
