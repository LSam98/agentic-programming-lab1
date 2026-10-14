import { state, body, preset, restore } from './state.js';
import { validateBody } from './physics.js';
const $ = id => document.getElementById(id);
const FIELDS = ['name', 'color', 'mass', 'radius', 'x', 'y', 'vx', 'vy'];
// Display at most 6 significant digits; stored values keep full precision.
const shown = (key, value) => typeof value === 'number' ? String(Number(value.toPrecision(6))) : value;
export function notice(message) { $('notice').textContent = message; }
export function setupUI(renderer) {
  const form = $('editor'), errors = {};
  for (const key of FIELDS) {
    const error = document.createElement('small'); error.id = `${key}-error`; error.style.cssText = 'display:block;color:#ff9cac;margin-top:4px;line-height:1.4';
    form.elements[key].setAttribute('aria-describedby', error.id); form.elements[key].after(error); errors[key] = error;
  }
  function showError(key, message) { errors[key].textContent = message ?? ''; form.elements[key].setAttribute('aria-invalid', String(!!message)); }
  function select(id) {
    state.selected = id;
    const b = state.initial.find(item => item.id === id);
    form.hidden = !b;
    for (const key of FIELDS) { if (b) form.elements[key].value = shown(key, b[key]); showError(key, null); }
    renderList();
  }
  // Edits apply live, one field at a time; an invalid field is never committed.
  function edit(key) {
    const b = state.initial.find(item => item.id === state.selected);
    if (!b || state.phase !== 'ready') return;
    const raw = form.elements[key].value;
    const value = key === 'name' ? raw.trim() : key === 'color' ? raw : raw.trim() === '' ? NaN : Number(raw);
    // The stored body is always valid, so any error comes from this field.
    const error = key === 'name' ? (value ? null : 'Give this body a name.') : validateBody({ ...b, [key]: value });
    showError(key, error); if (error) return;
    b[key] = value; restore(); renderList(); updateStats();
  }
  for (const key of FIELDS) for (const type of ['input', 'change']) form.elements[key].addEventListener(type, () => edit(key));
  function renderList() {
    $('body-list').replaceChildren();
    for (const b of state.initial) {
      const button = document.createElement('button'); button.type = 'button'; button.className = `body-card ${state.selected === b.id ? 'selected' : ''}`;
      button.disabled = state.phase !== 'ready'; button.setAttribute('aria-pressed', String(state.selected === b.id));
      const dot = document.createElement('span'); dot.className = 'body-dot'; dot.style.background = b.color;
      const info = document.createElement('span'), name = document.createElement('b'), sub = document.createElement('small');
      name.textContent = b.name; sub.textContent = `${shown('mass', b.mass)} M · ${shown('radius', b.radius)} L radius`; info.append(name, sub);
      const arrow = document.createElement('span'); arrow.textContent = '›'; button.append(dot, info, arrow);
      button.addEventListener('click', () => select(b.id)); $('body-list').append(button);
    }
    if (!state.initial.length) { const p = document.createElement('p'); p.className = 'list-empty'; p.textContent = 'No bodies yet. Use + to create your first.'; $('body-list').append(p); }
    $('initial-count').textContent = state.initial.length;
  }
  function refreshEditor() {
    const locked = state.phase !== 'ready';
    for (const element of form.elements) element.disabled = locked;
    $('add').disabled = locked;
    $('editor-hint').textContent = locked ? 'Reset the simulation to edit initial conditions.' : 'Select a body to tune its initial conditions.';
    renderList(); updateStats();
  }
  function changed(message) { restore(); refreshEditor(); notice(message); }
  $('add').addEventListener('click', () => {
    const angle = state.initial.length * 2.4;
    const b = body({ x: Math.round(Math.cos(angle) * 100), y: Math.round(Math.sin(angle) * 100) });
    state.initial.push(b); changed('Body added. Edit its properties; changes apply instantly.'); select(b.id);
  });
  $('delete').addEventListener('click', () => {
    state.initial = state.initial.filter(b => b.id !== state.selected); state.selected = null;
    changed('Body removed from initial conditions.'); select(state.initial[0]?.id ?? null);
  });
  $('start').addEventListener('click', () => {
    if (state.phase === 'running') { state.phase = 'paused'; notice('Paused. Your simulation is held at its current state.'); }
    else if (state.bodies.length) { state.phase = 'running'; state.accumulator = 0; notice('Simulation running. Gravity acts between every pair of bodies.'); }
    refreshEditor();
  });
  $('reset').addEventListener('click', () => { restore(); select(state.selected); refreshEditor(); notice('Reset complete. All initial body settings restored.'); });
  for (const button of document.querySelectorAll('[data-preset]')) button.addEventListener('click', () => {
    state.initial = preset(button.dataset.preset); restore(); select(state.initial[0].id); renderer.fit(state.bodies); refreshEditor();
    notice(`${button.dataset.preset === 'orbit' ? 'Orbital duet' : 'Collision course'} loaded. Press Start simulation to launch.`);
  });
  $('speed').addEventListener('input', e => { state.speed = 2 ** Number(e.target.value); $('speed-label').textContent = `${state.speed}×`; });
  $('trails').addEventListener('change', e => { state.trailsEnabled = e.target.checked; });
  $('clear-trails').addEventListener('click', () => { state.trails.clear(); notice('Trajectory trails cleared.'); });
  $('fit').addEventListener('click', () => renderer.fit(state.bodies));
  select(state.initial[0]?.id ?? null); refreshEditor();
  return { refreshEditor };
}
export function updateStats() {
  $('time').innerHTML = `${state.time.toFixed(2)} <small>T</small>`;
  $('count').innerHTML = `${state.bodies.length} <small>of ${state.initial.length}</small>`;
  $('phase').textContent = ({ ready: 'READY TO LAUNCH', running: 'SIMULATION LIVE', paused: 'PAUSED', ended: 'SIMULATION COMPLETE', error: 'SAFETY PAUSE' })[state.phase];
  $('phase').classList.toggle('live', state.phase === 'running');
  $('start').textContent = state.phase === 'running' ? 'Ⅱ Pause simulation' : state.phase === 'paused' ? '▶ Resume simulation' : '▶ Start simulation';
  $('start').disabled = !state.bodies.length || ['ended', 'error'].includes(state.phase);
  $('empty').hidden = state.bodies.length !== 0;
  $('empty-text').textContent = state.phase === 'ready' ? 'Add a body or load a preset to begin.' : 'All bodies collided. Reset or load a new experiment.';
}
