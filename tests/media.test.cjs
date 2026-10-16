// Dependency-free lifecycle tests. Rendering/WebGL still require browser QA.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const script = readFileSync(require('node:path').join(__dirname, '../script.js'), 'utf8');

class Element extends EventTarget {
  constructor() {
    super();
    this.hidden = true;
    this.disabled = false;
    this.value = '0';
    this.textContent = '';
    this.attributes = {};
    this.children = [];
    const classes = new Set();
    this.classList = { add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x) };
  }
  emit(name) { this.dispatchEvent(new Event(name)); }
  setAttribute(name, value) { this.attributes[name] = value; }
  append(child) { child.parent = this; this.children.push(child); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(el => el !== this); }
  focus() { this.focused = true; }
}

function setup({ reduced = false, saveData = false, rejectPlay = false, badModel = false, protocol = 'https:' } = {}) {
  const ids = ['app-demo', 'video-toggle', 'video-status', 'mascot-load', 'mascot-stage', 'mascot-status', 'mascot-controls', 'mascot-turn'];
  const elements = Object.fromEntries(ids.map(id => [id, new Element()]));
  const video = elements['app-demo'];
  const source = new Element();
  video.paused = true;
  video.querySelector = () => source;
  video.play = () => {
    if (rejectPlay) return Promise.reject(new Error('Autoplay blocked'));
    video.paused = false;
    video.emit('play');
    return Promise.resolve();
  };
  video.pause = () => { video.paused = true; video.emit('pause'); };
  const motion = new Element(); motion.matches = reduced;
  const document = new Element(); document.hidden = false;
  document.querySelector = selector => elements[selector.slice(1)] || null;
  document.querySelectorAll = () => [];
  const frames = [];
  const api = { loads: [], controls: [], rotations: [], load(...args) { this.loads.push(args); }, control(value) { this.controls.push(value); }, rotate(value) { this.rotations.push(value); } };
  document.createElement = tag => {
    assert.equal(tag, 'iframe');
    const frame = new Element(); frame.contentWindow = { desvapeMascot: api };
    frames.push(frame); return frame;
  };
  const observations = [];
  class IntersectionObserver {
    constructor(callback) { this.callback = callback; }
    observe(el) { observations.push({ el, callback: this.callback }); }
    unobserve() {}
    disconnect() {}
  }
  let requests = 0;
  const timers = new Map(); let timerID = 0;
  const context = {
    document, navigator: { connection: { saveData } }, location: { protocol },
    IntersectionObserver, matchMedia: () => motion, AbortController,
    setTimeout: fn => { timers.set(++timerID, fn); return timerID; },
    clearTimeout: id => timers.delete(id),
    btoa: str => Buffer.from(str, 'binary').toString('base64'),
    fetch: async () => {
      requests++;
      return { ok: !badModel, arrayBuffer: async () => new Uint8Array([103, 108, 84, 70]).buffer };
    },
  };
  context.window = context;
  vm.runInNewContext(script, context);
  return {
    elements, video, source, motion, document, frames, api, timers,
    get requests() { return requests; },
    intersect(id, visible) { observations.filter(o => o.el === elements[id]).forEach(o => o.callback([{ target: o.el, isIntersecting: visible }])); },
  };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('video autoplays muted; off-screen and hidden tabs pause; explicit pause persists', async () => {
  const app = setup(); await settle();
  assert.equal(app.video.muted, true);
  assert.equal(app.video.paused, false);
  app.intersect('app-demo', false); assert.equal(app.video.paused, true);
  app.intersect('app-demo', true); await settle(); assert.equal(app.video.paused, false);
  app.document.hidden = true; app.document.emit('visibilitychange'); assert.equal(app.video.paused, true);
  app.document.hidden = false; app.document.emit('visibilitychange'); await settle();
  app.elements['video-toggle'].emit('click'); assert.equal(app.video.paused, true);
  app.intersect('app-demo', false); app.intersect('app-demo', true); await settle();
  assert.equal(app.video.paused, true);
});

test('reduced motion and data saver retain a paused poster with manual playback', async () => {
  for (const option of [{ reduced: true }, { saveData: true }]) {
    const app = setup(option); await settle();
    assert.equal(app.video.autoplay, false);
    assert.equal(app.video.paused, true);
    app.elements['video-toggle'].emit('click'); await settle();
    assert.equal(app.video.paused, false);
    app.motion.matches = true; app.motion.emit('change');
    assert.equal(app.video.paused, true);
  }
});

test('autoplay rejection and source errors keep useful playback/fallback text', async () => {
  const app = setup({ rejectPlay: true }); await settle();
  assert.equal(app.elements['video-toggle'].textContent, 'Reproduzir vídeo');
  assert.equal(app.elements['video-toggle'].hidden, false);
  app.source.emit('error');
  assert.equal(app.elements['video-toggle'].hidden, true);
  assert.match(app.elements['video-status'].textContent, /indisponível/);
});

test('3D makes no requests until clicked; ready state reveals keyboard control without motion', async () => {
  const app = setup(); await settle();
  assert.equal(app.requests, 0); assert.equal(app.frames.length, 0);
  app.elements['mascot-load'].emit('click'); await settle();
  assert.equal(app.requests, 1); assert.equal(app.frames.length, 1);
  assert.equal(app.frames[0].src, 'assets/mascot3d/viewer.html');
  app.frames[0].emit('load');
  assert.equal(app.api.loads[0][1].idle, 'Idle');
  app.document.activeElement = app.elements['mascot-load'];
  app.frames[0].contentWindow.MascotBridge.postMessage('ready');
  assert.equal(app.elements['mascot-stage'].classList.contains('is-ready'), true);
  assert.equal(app.elements['mascot-controls'].hidden, false);
  assert.equal(app.elements['mascot-turn'].focused, true);
  assert.equal(app.api.controls.at(-1).motion, false);
  app.elements['mascot-turn'].value = '-45'; app.elements['mascot-turn'].emit('input');
  assert.equal(app.api.rotations.at(-1), -.45);
  app.intersect('mascot-stage', false);
  assert.equal(app.api.controls.at(-1).active, false);
  assert.equal(app.timers.size, 0);
});

test('missing GLB and viewer failure preserve fallback and permit retry', async () => {
  const missing = setup({ badModel: true });
  missing.elements['mascot-load'].emit('click'); await settle();
  assert.equal(missing.elements['mascot-load'].disabled, false);
  assert.equal(missing.frames.length, 0);
  assert.match(missing.elements['mascot-status'].textContent, /não carregou/);
  const app = setup(); app.elements['mascot-load'].emit('click'); await settle();
  app.frames[0].emit('load');
  app.frames[0].contentWindow.MascotBridge.postMessage('error');
  assert.equal(app.elements['mascot-stage'].children.length, 0);
  assert.equal(app.elements['mascot-stage'].classList.contains('is-ready'), false);
  app.elements['mascot-load'].emit('click'); await settle();
  assert.equal(app.requests, 2);
});

test('viewer timeout prevents a late callback replacing the fallback', async () => {
  const app = setup(); app.elements['mascot-load'].emit('click'); await settle();
  app.frames[0].emit('load');
  const bridge = app.frames[0].contentWindow.MascotBridge;
  [...app.timers.values()][0]();
  bridge.postMessage('ready');
  assert.equal(app.elements['mascot-stage'].classList.contains('is-ready'), false);
  assert.equal(app.elements['mascot-load'].disabled, false);
});

test('local file browsing keeps the 3D fallback without requesting modules', () => {
  const app = setup({ protocol: 'file:' });
  assert.equal(app.elements['mascot-load'].hidden, true);
  assert.equal(app.requests, 0);
});
