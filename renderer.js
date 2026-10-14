export class Renderer {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.center = { x: 0, y: 0 }; this.zoom = 1; this.width = 1; this.height = 1;
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect(), px = e.clientX - rect.left - this.width / 2, py = e.clientY - rect.top - this.height / 2;
      const old = this.zoom; this.zoom = Math.max(0.000001, Math.min(100, old * Math.exp(-e.deltaY * 0.001)));
      this.center.x += px / old - px / this.zoom; this.center.y -= py / old - py / this.zoom;
    }, { passive: false });
    let drag = null;
    canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); canvas.classList.add('dragging'); });
    canvas.addEventListener('pointermove', e => {
      if (!drag) return;
      this.center.x -= (e.clientX - drag.x) / this.zoom; this.center.y += (e.clientY - drag.y) / this.zoom;
      drag = { x: e.clientX, y: e.clientY };
    });
    const end = () => { drag = null; canvas.classList.remove('dragging'); };
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect(); this.width = rect.width; this.height = rect.height;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(rect.width * dpr); this.canvas.height = Math.round(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  fit(bodies) {
    if (!bodies.length) { this.center = { x: 0, y: 0 }; this.zoom = 1; return; }
    const minX = Math.min(...bodies.map(b => b.x - b.radius)), maxX = Math.max(...bodies.map(b => b.x + b.radius));
    const minY = Math.min(...bodies.map(b => b.y - b.radius)), maxY = Math.max(...bodies.map(b => b.y + b.radius));
    this.center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
    this.zoom = Math.max(0.000001, Math.min(2, (this.width - 100) / Math.max(360, maxX - minX), (this.height - 120) / Math.max(360, maxY - minY)));
  }
  point(b) { return { x: this.width / 2 + (b.x - this.center.x) * this.zoom, y: this.height / 2 - (b.y - this.center.y) * this.zoom }; }
  draw(state, now) {
    const c = this.ctx, w = this.width, h = this.height;
    c.clearRect(0, 0, w, h); c.fillStyle = '#0b111d'; c.fillRect(0, 0, w, h);
    // Deterministic stars: no external images or random flicker.
    for (let i = 0; i < 95; i++) { c.fillStyle = `rgba(183,203,236,${0.12 + (i % 5) * 0.06})`; c.fillRect((i * 137.31 + 23) % w, (i * 97.73 + 41) % h, i % 9 === 0 ? 2 : 1, 1); }
    const unit = 10 ** Math.floor(Math.log10(80 / this.zoom)), spacing = unit * this.zoom;
    const origin = this.point({ x: 0, y: 0 });
    c.strokeStyle = '#1a2639'; c.lineWidth = 0.5; c.beginPath();
    for (let x = ((origin.x % spacing) + spacing) % spacing; x < w; x += spacing) { c.moveTo(x, 0); c.lineTo(x, h); }
    for (let y = ((origin.y % spacing) + spacing) % spacing; y < h; y += spacing) { c.moveTo(0, y); c.lineTo(w, y); } c.stroke();
    c.strokeStyle = '#2c3b52'; c.beginPath(); c.moveTo(origin.x - 5, origin.y); c.lineTo(origin.x + 5, origin.y); c.moveTo(origin.x, origin.y - 5); c.lineTo(origin.x, origin.y + 5); c.stroke();
    if (state.trailsEnabled) for (const trail of state.trails.values()) {
      if (trail.points.length < 2) continue;
      c.strokeStyle = trail.color; c.lineWidth = 1.3; c.globalAlpha = 0.45; c.beginPath();
      trail.points.forEach((p, i) => { const s = this.point(p); if (i === 0) c.moveTo(s.x, s.y); else c.lineTo(s.x, s.y); }); c.stroke(); c.globalAlpha = 1;
    }
    for (const b of state.bodies) {
      const p = this.point(b), r = Math.max(2.5, b.radius * this.zoom);
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
    state.effects = state.effects.filter(e => now - e.at < 650);
    for (const e of state.effects) {
      const t = (now - e.at) / 650, p = this.point(e); c.globalAlpha = 1 - t;
      c.strokeStyle = e.color; c.lineWidth = 2 * (1 - t); c.beginPath(); c.arc(p.x, p.y, Math.max(3, e.radius * this.zoom) + t * 32, 0, Math.PI * 2); c.stroke();
      for (let j = 0; j < 8; j++) { const angle = j * Math.PI / 4; c.fillStyle = e.color; c.fillRect(p.x + Math.cos(angle) * t * 40, p.y + Math.sin(angle) * t * 40, 2, 2); }
    }
    c.globalAlpha = 1;
    document.getElementById('scale-label').textContent = `Grid ${unit.toPrecision(1)} L · ${this.zoom.toFixed(2)} px/L`;
  }
}
