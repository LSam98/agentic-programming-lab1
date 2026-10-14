// Pure camera math: independent of the DOM, rendering and simulation state.
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
export class Camera {
  constructor() {
    this.target = { x: 0, y: 0, z: 0 };
    this.yaw = 0.4; this.pitch = 0.5; this.distance = 650;
    this.width = 1; this.height = 1;
  }
  get focal() { return Math.max(1, Math.min(this.width, this.height)) * 1.2; }
  get basis() {
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw), cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    return { right: { x: cy, y: 0, z: -sy }, up: { x: -sy * sp, y: cp, z: -cy * sp }, back: { x: sy * cp, y: sp, z: cy * cp } };
  }
  orbit(dx, dy) {
    this.yaw = (this.yaw + dx) % (2 * Math.PI);
    this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch + dy));
  }
  zoom(amount) { this.distance = Math.max(0.01, Math.min(1e14, this.distance * Math.exp(amount))); }
  pan(dx, dy) {
    const { right, up } = this.basis, scale = this.distance / this.focal;
    for (const axis of ['x', 'y', 'z']) this.target[axis] += (-dx * right[axis] + dy * up[axis]) * scale;
  }
  get near() { return Math.max(1e-6, this.distance * 0.001); }
  depth(point) {
    return this.distance - dot({ x: point.x - this.target.x, y: point.y - this.target.y, z: point.z - this.target.z }, this.basis.back);
  }
  projectSegment(a, b) {
    const da = this.depth(a), db = this.depth(b), near = this.near * 1.001;
    if (da < near && db < near) return null;
    if (da < near || db < near) {
      const t = (near - da) / (db - da);
      const clipped = {};
      for (const axis of ['x', 'y', 'z']) clipped[axis] = a[axis] + t * (b[axis] - a[axis]);
      if (da < near) a = clipped; else b = clipped;
    }
    return [this.project(a), this.project(b)];
  }
  project(point) {
    const relative = { x: point.x - this.target.x, y: point.y - this.target.y, z: point.z - this.target.z };
    const { right, up, back } = this.basis, depth = this.distance - dot(relative, back);
    if (depth <= this.near) return null;
    const scale = this.focal / depth;
    return { x: this.width / 2 + dot(relative, right) * scale, y: this.height / 2 - dot(relative, up) * scale, depth, scale };
  }
  fit(bodies) {
    if (!bodies.length) { this.target = { x: 0, y: 0, z: 0 }; this.distance = 650; return; }
    // Bounding sphere fits from every viewing direction without changing orientation.
    for (const axis of ['x', 'y', 'z']) {
      let min = Infinity, max = -Infinity;
      for (const b of bodies) { min = Math.min(min, b[axis] - b.radius); max = Math.max(max, b[axis] + b.radius); }
      this.target[axis] = (min + max) / 2;
    }
    let radius = 40;
    for (const b of bodies) radius = Math.max(radius, Math.hypot(b.x - this.target.x, b.y - this.target.y, b.z - this.target.z) + b.radius);
    const halfAngle = Math.atan(Math.max(1, Math.min(this.width, this.height)) * 0.35 / this.focal);
    this.distance = radius / Math.sin(halfAngle);
  }
}
