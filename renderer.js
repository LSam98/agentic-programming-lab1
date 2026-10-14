import { Camera } from './camera.js';
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.camera = new Camera(); this.width = 1; this.height = 1;
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
    canvas.addEventListener('wheel', e => { e.preventDefault(); this.camera.zoom(e.deltaY * 0.001); }, { passive: false });
    let drag = null;
    canvas.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      drag = { x: e.clientX, y: e.clientY }; canvas.focus();
      canvas.setPointerCapture(e.pointerId); canvas.classList.add('dragging');
    });
    canvas.addEventListener('pointermove', e => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (e.shiftKey) this.camera.pan(dx, dy); else this.camera.orbit(-dx * 0.006, dy * 0.006);
      drag = { x: e.clientX, y: e.clientY };
    });
    const end = () => { drag = null; canvas.classList.remove('dragging'); };
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end); canvas.addEventListener('lostpointercapture', end);
    canvas.addEventListener('keydown', e => {
      const movement = { ArrowLeft: [-12, 0], ArrowRight: [12, 0], ArrowUp: [0, -12], ArrowDown: [0, 12] }[e.key];
      if (movement) {
        e.preventDefault();
        if (e.shiftKey) this.camera.pan(...movement); else this.camera.orbit(-movement[0] * 0.006, movement[1] * 0.006);
      } else if (['+', '=', '-', '−'].includes(e.key)) { e.preventDefault(); this.camera.zoom(e.key === '-' || e.key === '−' ? 0.1 : -0.1); }
    });
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect(); this.width = Math.max(1, rect.width); this.height = Math.max(1, rect.height);
    this.camera.width = this.width; this.camera.height = this.height;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.width * dpr); this.canvas.height = Math.round(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  fit(bodies) { this.camera.fit(bodies); }
  point(b) { return this.camera.project(b); }
  line(a, b) {
    const segment = this.camera.projectSegment(a, b);
    if (!segment) return;
    const [p, q] = segment;
    this.ctx.moveTo(p.x, p.y); this.ctx.lineTo(q.x, q.y);
  }
  draw(state, now) {
    const c = this.ctx, w = this.width, h = this.height;
    c.clearRect(0, 0, w, h); c.fillStyle = '#0b111d'; c.fillRect(0, 0, w, h);
    // Deterministic stars: no external images or random flicker.
    for (let i = 0; i < 95; i++) { c.fillStyle = `rgba(183,203,236,${0.12 + (i % 5) * 0.06})`; c.fillRect((i * 137.31 + 23) % w, (i * 97.73 + 41) % h, i % 9 === 0 ? 2 : 1, 1); }
    const unit = 10 ** Math.floor(Math.log10(this.camera.distance / 8));
    const extent = unit * 10, target = this.camera.target;
    const cx = Math.round(target.x / unit) * unit, cz = Math.round(target.z / unit) * unit;
    c.strokeStyle = '#1a2639'; c.lineWidth = 0.5; c.beginPath();
    for (let i = -10; i <= 10; i++) {
      this.line({ x: cx + i * unit, y: 0, z: cz - extent }, { x: cx + i * unit, y: 0, z: cz + extent });
      this.line({ x: cx - extent, y: 0, z: cz + i * unit }, { x: cx + extent, y: 0, z: cz + i * unit });
    }
    c.stroke();
    for (const [axis, color] of [['x', '#c87575'], ['y', '#78b68d'], ['z', '#709cdb']]) {
      const end = { x: 0, y: 0, z: 0 }; end[axis] = unit * 2;
      c.strokeStyle = color; c.beginPath(); this.line({ x: 0, y: 0, z: 0 }, end); c.stroke();
      const label = this.point(end);
      if (label) { c.fillStyle = color; c.font = '10px system-ui'; c.fillText(axis.toUpperCase(), label.x + 5, label.y - 5); }
    }
    if (state.trailsEnabled) for (const trail of state.trails.values()) {
      if (trail.points.length < 2) continue;
      c.strokeStyle = trail.color; c.lineWidth = 1.3; c.globalAlpha = 0.45; c.beginPath();
      for (let i = 1; i < trail.points.length; i++) this.line(trail.points[i - 1], trail.points[i]); c.stroke(); c.globalAlpha = 1;
    }
    // Painter order for projected spheres: distant bodies first.
    const visible = state.bodies.map(b => ({ b, p: this.point(b) })).filter(item => item.p).sort((a, b) => b.p.depth - a.p.depth);
    for (const { b, p } of visible) {
      const r = Math.max(2.5, b.radius * p.scale);
      if (p.x + r < 0 || p.x - r > w || p.y + r < 0 || p.y - r > h) continue;
      const glow = c.createRadialGradient(p.x, p.y, r * 0.2, p.x, p.y, r * 3);
      glow.addColorStop(0, `${b.color}45`); glow.addColorStop(1, `${b.color}00`);
      c.fillStyle = glow; c.beginPath(); c.arc(p.x, p.y, r * 3, 0, Math.PI * 2); c.fill();
      const sphere = c.createRadialGradient(p.x - r * 0.35, p.y - r * 0.4, 0, p.x + r * 0.25, p.y + r * 0.25, r * 1.3);
      sphere.addColorStop(0, '#ffffff'); sphere.addColorStop(0.22, b.color); sphere.addColorStop(1, '#172036');
      c.fillStyle = sphere; c.beginPath(); c.arc(p.x, p.y, r, 0, Math.PI * 2); c.fill();
      if (b.id === state.selected && state.phase === 'ready') { c.strokeStyle = `${b.color}80`; c.setLineDash([3, 4]); c.beginPath(); c.arc(p.x, p.y, r + 8, 0, Math.PI * 2); c.stroke(); c.setLineDash([]); }
      c.font = '11px system-ui'; c.fillStyle = '#c5cee0'; c.textAlign = 'center'; c.fillText(b.name, p.x, p.y + r + 20);
    }
    for (const e of state.effects) {
      const t = (now - e.at) / 650, p = this.point(e); if (!p) continue; c.globalAlpha = 1 - t;
      c.strokeStyle = e.color; c.lineWidth = 2 * (1 - t); c.beginPath(); c.arc(p.x, p.y, Math.max(3, e.radius * p.scale) + t * 32, 0, Math.PI * 2); c.stroke();
      for (let j = 0; j < 8; j++) { const angle = j * Math.PI / 4; c.fillStyle = e.color; c.fillRect(p.x + Math.cos(angle) * t * 40, p.y + Math.sin(angle) * t * 40, 2, 2); }
    }
    c.globalAlpha = 1;
    document.getElementById('scale-label').textContent = `Grid ${unit.toPrecision(1)} L · 3D perspective`;
  }
}
