(() => {
'use strict';

/* =====================================================================
   История Димы — мини-игра
   Пиксель-арт рисуется кодом (картинки не нужны). Холст 320x180,
   на экране масштабируется. Музыку положи в assets/music/.
   ===================================================================== */

const W = 320, H = 180, WORLD = 1000;
const $ = id => document.getElementById(id);
const cvs = $('c');
const ctx = cvs.getContext('2d');
ctx.imageSmoothingEnabled = false;

const els = {
  quest: $('quest'), side: $('side'), warn: $('warn'), hint: $('hint'),
  barwrap: $('barwrap'), barLabel: $('barLabel'), fill: $('fill'),
  dlg: $('dialog'), dname: $('dname'), dtext: $('dtext'),
  menu: $('menu'), end: $('end'), endTitle: $('endTitle'), endSub: $('endSub'),
  mute: $('mute')
};

/* ---------------------------------------------------------------------
   ЗВУК. Файлы: assets/music/music1.mp3 (основная) и music2.mp3 (вторая)
   --------------------------------------------------------------------- */
const MUSIC_FILES = {
  m1: 'assets/music/music1.mp3',
  m2: 'assets/music/music2.mp3'
};
const audio = {};
for (const k in MUSIC_FILES) {
  const a = new Audio(MUSIC_FILES[k]);
  a.loop = true;
  a.volume = 0.6;
  a.addEventListener('error', () => {}); // файла ещё нет — не страшно
  audio[k] = a;
}
let muted = false, curMusic = null;

function music(k) {
  if (curMusic && audio[curMusic]) audio[curMusic].pause();
  curMusic = k;
  if (!k) return;
  try { audio[k].currentTime = 0; } catch (e) {}
  if (!muted) audio[k].play().catch(() => {});
}
els.mute.addEventListener('click', () => {
  muted = !muted;
  els.mute.textContent = muted ? '🔇' : '🔊';
  if (curMusic) {
    if (muted) audio[curMusic].pause();
    else audio[curMusic].play().catch(() => {});
  }
});

let actx = null;
function beep(f = 440, d = 0.05, type = 'square', v = 0.035) {
  if (muted) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.value = f; g.gain.value = v;
    o.connect(g); g.connect(actx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + d);
    o.stop(actx.currentTime + d);
  } catch (e) {}
}

/* ---------------------------------------------------------------------
   МИР
   --------------------------------------------------------------------- */
const DIG    = { x: 78,  y: 120 };  // яма
const MON    = { x: 135, y: 98  };  // памятник пионерам (выступ у основания)
const PILES  = { x: 520, y: 126 };  // место между щебнем и песком
const WC     = { x: 955, y: 100 };  // туалет у раздевалки
const ROAD_Y = 30;

const DIMA = { name: 'Дима',  shirt: '#d9534f', shirtDark: '#b23f3b', pants: '#3b4a6b', hair: '#6a4128' };
const ABR  = { name: 'Абрам', shirt: '#3e9b6a', shirtDark: '#2e7a52', pants: '#5a4a3a', hair: '#4e2f1b' };
const SKIN = '#f3d5b5', EYE = '#4a2a12', SHOE = '#3a2a1f';

function rng(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* Статичный фон (один раз рисуем в offscreen-холсты) */
const bg = document.createElement('canvas'); bg.width = WORLD; bg.height = H;
const fg = document.createElement('canvas'); fg.width = WORLD; fg.height = H;

function buildWorld() {
  const g = bg.getContext('2d'), f = fg.getContext('2d'), r = rng(11);
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };

  // трава
  R(0, 0, WORLD, H, '#5fa84b');
  for (let i = 0; i < 2600; i++) {
    const x = (r() * WORLD) | 0, y = (r() * H) | 0;
    R(x, y, 2, 1, r() < .5 ? '#6cb657' : '#52943f');
  }
  // дорога
  R(0, 0, WORLD, ROAD_Y, '#5b5d66');
  R(0, 0, WORLD, 2, '#44464e');
  for (let x = 0; x < WORLD; x += 24) R(x, 17, 12, 1, '#d9d9c9');
  R(0, ROAD_Y, WORLD, 5, '#bab5a7');
  R(0, ROAD_Y + 5, WORLD, 1, '#8d897d');
  // кусты вдоль тротуара
  for (let x = 0; x < WORLD; x += 16) {
    if (r() < .75) { R(x, 37, 11, 5, '#3f8a3a'); R(x + 1, 37, 5, 2, '#5aa84e'); }
  }
  // тропа
  for (let x = 24; x < WORLD - 10; x += 2) {
    const y = 100 + Math.round(Math.sin(x / 40) * 2);
    R(x, y, 2, 12, '#b08a5a');
    R(x, y, 2, 1, '#93703f');
    if (r() < .35) R(x, y + 2 + ((r() * 9) | 0), 2, 1, '#9a7549');
  }
  // цветочки
  const fl = ['#f7e26b', '#ffffff', '#f28ab2'];
  for (let i = 0; i < 90; i++) {
    const x = (r() * WORLD) | 0, y = 46 + ((r() * 100) | 0);
    if (y > 98 && y < 114) continue;
    R(x, y, 1, 1, fl[(r() * 3) | 0]);
  }
  // площадка под яму
  R(46, 118, 64, 24, '#8e6d46');
  R(48, 120, 60, 20, '#9d7a50');

  // деревья слева (фон)
  const tree = (c, x, y) => {
    const T = (a, b, w, h, col) => { c.fillStyle = col; c.fillRect(a, b, w, h); };
    T(x - 2, y - 8, 4, 8, '#6b4a2b');
    T(x - 10, y - 26, 20, 17, '#2d6b37');
    T(x - 7, y - 31, 14, 6, '#2d6b37');
    T(x - 7, y - 25, 7, 6, '#3f8c49');
    T(x - 11, y - 21, 3, 7, '#245a2e');
    T(x + 5, y - 20, 4, 4, '#245a2e');
  };
  [[10, 70], [14, 100], [8, 130]].forEach(p => tree(g, p[0], p[1]));
  // деревья снизу (передний план)
  for (let x = 4; x < WORLD; x += 26 + ((r() * 10) | 0)) tree(f, x, 178 + ((r() * 4) | 0));

  // памятник пионерам
  const mx = MON.x, my = MON.y;
  R(mx - 15, my - 2, 30, 5, '#c9c5b9');        // выступ (сюда можно присесть)
  R(mx - 15, my + 3, 30, 1, '#8e8a80');
  R(mx - 10, my - 26, 20, 24, '#b5b1a6');      // постамент
  R(mx - 10, my - 26, 20, 2, '#d6d2c7');
  R(mx - 7, my - 18, 14, 5, '#8e8a80');        // табличка
  R(mx - 3, my - 44, 6, 18, '#ecebe5');        // фигура
  R(mx - 3, my - 49, 6, 5, '#ecebe5');         // голова
  R(mx - 3, my - 40, 6, 2, '#c0392b');         // галстук
  R(mx + 3, my - 52, 2, 11, '#ecebe5');        // поднятая рука
  R(mx + 4, my - 55, 4, 3, '#d4af37');         // горн

  // куча щебня
  R(490, 122, 24, 9, '#85858c'); R(493, 116, 18, 7, '#94949b'); R(497, 111, 10, 6, '#a6a6ad');
  for (let i = 0; i < 40; i++) R(490 + ((r() * 24) | 0), 111 + ((r() * 20) | 0), 1, 1, r() < .5 ? '#6d6d74' : '#bdbdc4');
  // куча песка
  R(526, 122, 26, 9, '#dcbc76'); R(529, 116, 20, 7, '#e8cd8a'); R(533, 111, 12, 6, '#f2dd9f');
  for (let i = 0; i < 40; i++) R(526 + ((r() * 26) | 0), 111 + ((r() * 20) | 0), 1, 1, r() < .5 ? '#c9a763' : '#f7e8b5');

  // раздевалка
  R(860, 62, 56, 42, '#6f7f9a'); R(856, 56, 64, 8, '#4a5873');
  R(870, 76, 10, 28, '#3d475c'); R(890, 72, 14, 10, '#b9d8ea'); R(890, 72, 14, 1, '#fff');
  g.fillStyle = '#fff'; g.font = 'bold 6px monospace'; g.textAlign = 'center';
  g.fillText('РАЗДЕВАЛКА', 888, 63);
  // туалет
  R(940, 70, 28, 34, '#8b5e34'); R(937, 63, 34, 8, '#6d3f22');
  R(950, 82, 8, 22, '#5a3a1f'); R(956, 92, 1, 1, '#e6c34a');
  R(944, 73, 20, 7, '#e8e0c8');
  g.fillStyle = '#333'; g.font = 'bold 7px monospace'; g.fillText('WC', 954, 79);
}

/* ---------------------------------------------------------------------
   СОСТОЯНИЕ
   --------------------------------------------------------------------- */
const S = {};
const dima  = { x: 66, y: 116, dir: 1, moving: false, pose: 'stand' };
const abram = { x: 94, y: 116, pose: 'dig', visible: true };

function reset() {
  Object.assign(S, {
    phase: 'menu', t: 0,
    meter: 0, calm: 0, meterOn: false, grow: 0, power: 6, minMeter: 0,
    dig: 0, digT: 0, prog: 0,
    lock: false, sitting: false, forcePose: null,
    fog: 0, revealed: false,
    quest: '', side: '', warn: '', target: null,
    dlg: null, dlgStart: 0, timer: 0, after: null,
    doneA: false, doneB: false, shake: 0
  });
  Object.assign(dima,  { x: 66, y: 116, dir: 1, moving: false, pose: 'stand' });
  Object.assign(abram, { x: 94, y: 116, pose: 'dig', visible: true });
}
reset();

const peds = [
  { x: 470, v: 7,  c: '#e0b13b', h: '#2b2b2b' },
  { x: 505, v: -5, c: '#7b5ea7', h: '#8a5a2b' },
  { x: 545, v: 4,  c: '#d6644a', h: '#c9a14a' },
  { x: 585, v: -6, c: '#4aa3d6', h: '#222222' },
  { x: 435, v: 5,  c: '#6fbf73', h: '#5a3b1e' }
];
const cars = [
  { x: 0,   y: 13, v: 42,  col: '#d94f4f' },
  { x: 320, y: 13, v: 56,  col: '#4f7fd9' },
  { x: 640, y: 13, v: 46,  col: '#e0c34a' },
  { x: 200, y: 25, v: -50, col: '#58b26b' },
  { x: 520, y: 25, v: -42, col: '#dcdcdc' },
  { x: 850, y: 25, v: -60, col: '#9b59b6' }
];

/* ---------------------------------------------------------------------
   ВВОД
   --------------------------------------------------------------------- */
const keys = { l: 0, r: 0, u: 0, d: 0 };
const joy = { x: 0, y: 0 };

const KEYMAP = {
  ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r',
  ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd'
};
window.addEventListener('keydown', e => {
  if (KEYMAP[e.code]) { keys[KEYMAP[e.code]] = 1; e.preventDefault(); return; }
  if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE') {
    e.preventDefault();
    if (!e.repeat) onAction();
  }
});
window.addEventListener('keyup', e => { if (KEYMAP[e.code]) keys[KEYMAP[e.code]] = 0; });
window.addEventListener('blur', () => { keys.l = keys.r = keys.u = keys.d = 0; });

cvs.addEventListener('pointerdown', e => { e.preventDefault(); onAction(); });

// кнопка ТАП
const actBtn = $('act');
actBtn.addEventListener('pointerdown', e => { e.preventDefault(); actBtn.classList.add('down'); onAction(); });
['pointerup', 'pointerleave', 'pointercancel'].forEach(ev =>
  actBtn.addEventListener(ev, () => actBtn.classList.remove('down')));

// джойстик
const stick = $('stick'), knob = $('knob');
let stickId = null;
function stickMove(e) {
  const r = stick.getBoundingClientRect();
  let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
  const m = r.width / 2, l = Math.hypot(dx, dy);
  if (l > m) { dx = dx / l * m; dy = dy / l * m; }
  joy.x = dx / m; joy.y = dy / m;
  knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
}
stick.addEventListener('pointerdown', e => { e.preventDefault(); stickId = e.pointerId; stick.setPointerCapture(stickId); stickMove(e); });
stick.addEventListener('pointermove', e => { if (e.pointerId === stickId) stickMove(e); });
['pointerup', 'pointercancel'].forEach(ev => stick.addEventListener(ev, e => {
  if (e.pointerId !== stickId) return;
  stickId = null; joy.x = joy.y = 0;
  knob.style.transform = 'translate(-50%, -50%)';
}));

if (window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window) {
  document.body.classList.add('touch');
}

/* ---------------------------------------------------------------------
   ДИАЛОГИ
   --------------------------------------------------------------------- */
function say(lines, cb) {
  S.dlg = { lines, i: 0, pos: 0, cb, shown: -1 };
  S.dlgStart = performance.now();
  els.dlg.classList.add('on');
  showLine();
}
function showLine() {
  const l = S.dlg.lines[S.dlg.i];
  S.dlg.pos = 0; S.dlg.shown = -1;
  els.dname.textContent = l.who ? (l.t ? l.who + ' (мысли)' : l.who) : '';
  els.dname.className = l.who === 'Дима' ? 'dima' : l.who === 'Абрам' ? 'abram' : 'none';
  els.dlg.classList.toggle('thought', !!l.t);
  els.dlg.classList.toggle('narr', !l.who);
  beep(l.who === 'Абрам' ? 300 : 420, 0.05);
}
function typeDlg(dt) {
  const l = S.dlg.lines[S.dlg.i];
  S.dlg.pos = Math.min(l.text.length, S.dlg.pos + dt * 55);
  const n = Math.floor(S.dlg.pos);
  if (n !== S.dlg.shown) { els.dtext.textContent = l.text.slice(0, n); S.dlg.shown = n; }
}
function advanceDlg() {
  if (performance.now() - S.dlgStart < 350) return; // защита от случайного спама тапами
  const l = S.dlg.lines[S.dlg.i];
  if (S.dlg.pos < l.text.length) { S.dlg.pos = l.text.length; return; }
  S.dlg.i++;
  if (S.dlg.i >= S.dlg.lines.length) {
    const cb = S.dlg.cb;
    S.dlg = null;
    els.dlg.classList.remove('on');
    if (cb) cb();
  } else {
    showLine();
  }
}
function wait(sec, fn) { S.timer = sec; S.after = fn; }

/* ---------------------------------------------------------------------
   ИГРОВАЯ ЛОГИКА
   --------------------------------------------------------------------- */
const CALM_LEVEL = 20;  // ниже этого % шкала считается «под контролем»
const CALM_TIME  = 7;   // столько секунд надо продержаться ниже CALM_LEVEL
const calmDone = () => S.calm >= CALM_TIME;
const METER_PHASES = ['urge1', 'urge2', 'urgeA', 'urgeB', 'rush'];

function inDigZone() { return Math.abs(dima.x - DIG.x) < 32 && Math.abs(dima.y - DIG.y) < 20; }
function setQuest(q, side) { S.quest = q || ''; if (side !== undefined) S.side = side; }
function startUrge(o) {
  S.meterOn = true; S.meter = o.start; S.grow = o.grow; S.power = o.power;
  S.minMeter = o.min || 0; S.warn = o.warn; S.calm = 0;
  beep(120, 0.25, 'sawtooth', 0.05);
}
function endUrge() { S.meterOn = false; S.warn = ''; S.calm = 0; }

function onAction() {
  if (S.dlg) { advanceDlg(); return; }
  if (S.timer > 0) return;
  const p = S.phase;

  if (p === 'dig1' || p === 'dig2') {
    if (inDigZone()) { S.dig = Math.min(100, S.dig + 2); S.digT = 0.25; beep(170, 0.05, 'triangle', 0.05); }
    return;
  }
  if (METER_PHASES.includes(p)) {
    if (p === 'urge2' && !S.sitting) return;      // пока не сел — тапы не помогают
    S.meter = Math.max(S.minMeter, S.meter - S.power);
    beep(260, 0.03, 'square', 0.03);
    return;
  }
  if (p === 'poop1') { S.prog += 3.5; beep(110, 0.06, 'sawtooth', 0.04); return; }
  if (p === 'poop2') { S.prog += 5;   beep(110, 0.06, 'sawtooth', 0.04); return; }
}

function move(dt, speed, maxX) {
  let kx = keys.r - keys.l, ky = keys.d - keys.u;
  if (Math.hypot(joy.x, joy.y) > 0.25) { kx = joy.x; ky = joy.y; }
  const len = Math.hypot(kx, ky);
  dima.moving = len > 0.1;
  if (!dima.moving) return;
  if (len > 1) { kx /= len; ky /= len; }
  dima.x += kx * speed * dt;
  dima.y += ky * speed * dt;
  if (kx > 0.1) dima.dir = 1; else if (kx < -0.1) dima.dir = -1;
  dima.x = Math.max(10, Math.min(maxX || WORLD - 10, dima.x));
  dima.y = Math.max(46, Math.min(148, dima.y));
}

function fail() {
  endUrge();
  S.phase = 'fail';
  S.sitting = false; S.lock = true;
  S.forcePose = 'fail';
  S.target = null; S.side = '';
  music('m2');
  beep(80, 0.5, 'sawtooth', 0.06);
  say([{ who: 'Дима', t: true, text: 'Всё... Не успел...' }],
    () => showEnd('ПРОВАЛ', 'Дима не дотерпел и обосрался на месте.', 'ПОПРОБОВАТЬ СНОВА'));
}

function showEnd(title, sub, btn) {
  els.endTitle.textContent = title;
  els.endSub.textContent = sub;
  $('againBtn').textContent = btn;
  els.end.classList.add('on');
  S.phase = 'over';
}

function update(dt) {
  S.t += dt;
  npcs(dt);
  if (S.dlg) { typeDlg(dt); return; }
  if (S.digT > 0) S.digT -= dt;
  if (S.timer > 0) {
    S.timer -= dt;
    if (S.timer <= 0 && S.after) { const f = S.after; S.after = null; f(); }
    return;
  }

  // ---- шкала позыва ----
  if (S.meterOn) {
    S.meter += S.grow * dt;
    if (S.meter >= 100) { fail(); return; }
    if (S.meter < CALM_LEVEL && !(S.phase === 'urge2' && !S.sitting)) S.calm += dt; else S.calm = 0;
  }

  // ---- туман (сужение зрения) ----
  let fogTarget = 0;
  if (S.meterOn) fogTarget = Math.min(0.9, S.meter / 100 * 0.9);
  if (S.phase === 'poop1') fogTarget = 0.97;
  S.fog += (fogTarget - S.fog) * Math.min(1, dt * 3);
  S.shake = S.meterOn && S.meter > 65 ? 1 : 0;

  switch (S.phase) {

    case 'dig1':
      if (!S.lock) move(dt, 62);
      if (S.dig >= 25) {
        S.phase = 'urge1'; S.lock = true; dima.moving = false;
        startUrge({ start: 24, grow: 16, power: 3, warn: 'Вы очень хотите срать' });
      }
      break;

    case 'urge1':
      if (calmDone()) {
        endUrge(); S.lock = false;
        say([
          { who: '', text: 'Отпустило…' },
          { who: 'Дима', text: 'Абрам, а где тут туалет?' },
          { who: 'Абрам', text: 'Да там, возле раздевалки. Но тут далековато — минут 15 пешком.' },
          { who: 'Дима', t: true, text: 'Ну нафиг... Лучше потерплю и покопаю дальше.' }
        ], () => { S.phase = 'dig2'; setQuest('Копать яму вместе с Абрамом'); });
        S.phase = 'talk1';
      }
      break;

    case 'dig2':
      move(dt, 62);
      if (S.dig >= 55) {
        S.phase = 'urge2';
        startUrge({ start: 34, grow: 20, power: 3.5, warn: 'Вы очень сильно хотите срать!!' });
        setQuest('Копать яму вместе с Абрамом',
          'Присядьте на выступ памятника пионерам, иначе обосрётесь!');
      }
      break;

    case 'urge2':
      if (!S.sitting) {
        move(dt, 70);
        if (Math.abs(dima.x - MON.x) < 17 && Math.abs(dima.y - (MON.y + 10)) < 13) {
          S.sitting = true; S.lock = true; dima.moving = false;
          dima.x = MON.x; dima.y = MON.y;
          S.forcePose = 'sit'; beep(200, 0.1);
        }
      } else if (calmDone()) {
        endUrge(); S.sitting = false; S.lock = false; S.forcePose = null;
        S.phase = 'talk2';
        say([
          { who: 'Дима', t: true, text: 'Уууух... Отпустило. Но так дальше нельзя.' },
          { who: 'Дима', text: 'Абрам! Я пошёл срать!' },
          { who: 'Абрам', text: 'Давай, только не задерживайся!' }
        ], () => {
          S.phase = 'walk';
          setQuest('Сходите посрать (дойти до раздевалки)', '');
        });
      }
      break;

    case 'walk':
      move(dt, 66);
      if (!S.doneA && dima.x >= 300) {
        S.doneA = true; S.phase = 'urgeA'; S.lock = true; dima.moving = false;
        startUrge({ start: 30, grow: 17, power: 3.2, warn: 'Вас прихватило!' });
      } else if (!S.doneB && dima.x >= 430) {
        S.doneB = true; S.phase = 'urgeB'; S.lock = true; dima.moving = false;
        startUrge({ start: 40, grow: 18, power: 0, warn: 'Вас прихватило снова!!' });
      }
      break;

    case 'urgeA':
      if (calmDone()) {
        endUrge(); S.lock = false; S.phase = 'walk';
        say([{ who: 'Дима', t: true, text: 'Фух... Надо идти быстрее.' }], () => {});
      }
      break;

    case 'urgeB':
      if (S.meter >= 75) {
        S.meterOn = false; S.warn = ''; S.phase = 'thinkB';
        say([
          { who: 'Дима', t: true, text: 'Блять, пиздец, всё, я не дойду нахуй!' },
          { who: '', text: 'Дима в панике оглядывается по сторонам… Взгляд падает на две кучи: щебень и песок.' }
        ], () => {
          S.phase = 'rush'; S.lock = false;
          startUrge({ start: 72, grow: 17, power: 3.5, min: 30, warn: 'Вы сейчас обосрётесь!!!' });
          setQuest('Бегите к кучам — быстро!', '');
        });
      }
      break;

    case 'rush':
      move(dt, 72, 560);
      if (Math.abs(dima.x - PILES.x) < 9 && Math.abs(dima.y - PILES.y) < 14) {
        endUrge(); S.lock = true; dima.moving = false;
        dima.x = PILES.x; dima.y = PILES.y;
        S.phase = 'poop1'; S.forcePose = 'squat'; S.prog = 0;
        setQuest('Сделать своё дело…', '');
        say([{ who: '', text: 'Дима на ходу стягивает штаны и садится на корточки между кучами.' }], () => {});
      }
      break;

    case 'poop1':
      if (S.prog >= 55) {
        S.phase = 'relief';
        say([
          { who: '', text: 'Наконец-то наступает облегчение…' },
          { who: '', text: 'Дима поднимает голову — и туман вокруг рассеивается.' }
        ], () => {
          S.revealed = true; music('m2'); S.phase = 'reveal';
          wait(1.8, () => {
            say([{ who: 'Дима', t: true, text: 'Ебааать блять...' }], () => {
              S.forcePose = 'facepalm';
              wait(2.2, () => {
                S.forcePose = 'squat'; S.phase = 'poop2'; S.prog = 60;
                setQuest('Быстро закончить дело!', '');
              });
            });
          });
        });
      }
      break;

    case 'poop2':
      if (S.prog >= 100) {
        S.phase = 'pantsup'; S.forcePose = 'standBack';
        wait(1.2, () => {
          S.forcePose = 'stand';
          abram.x = dima.x + 12; abram.y = dima.y + 22; abram.pose = 'laugh';
          wait(0.9, () => {
            say([
              { who: 'Абрам', text: 'ХА-ХА-ХА-ХА-ХА!!!' },
              { who: 'Дима', text: 'Ах ты мудак блять' }
            ], () => showEnd('КОНЕЦ', 'Так Дима и сходил в туалет.', 'ЕЩЁ РАЗ'));
          });
        });
      }
      break;
  }

  // туман рассеивается только со второй строки «облегчения»
  if (S.phase === 'relief' && S.dlg && S.dlg.i < 1) S.fog = Math.max(S.fog, 0.97);
}

function npcs(dt) {
  const slow = S.revealed ? 0.25 : 1;
  cars.forEach(c => {
    c.x += c.v * dt * slow;
    if (c.v > 0 && c.x > WORLD + 40) c.x = -50;
    if (c.v < 0 && c.x < -50) c.x = WORLD + 40;
  });
  if (!S.revealed) {
    peds.forEach(p => { p.x += p.v * dt; if (p.x < 420 || p.x > 640) p.v *= -1; });
  }
}

/* ---------------------------------------------------------------------
   ОТРИСОВКА
   --------------------------------------------------------------------- */
let camX = 0;
const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x - camX), Math.round(y), w, h); };

function person(p, o) {
  let x = Math.round(p.x), y = Math.round(p.y);
  const t = S.t;
  R(x - 7, y - 1, 14, 3, 'rgba(0,0,0,.2)');

  const upper = (by, face) => {
    R(x - 5, y - 12 + by, 10, 7, o.shirt);
    R(x - 5, y - 7 + by, 10, 1, o.shirtDark);
    R(x - 7, y - 11 + by, 2, 6, o.shirt);
    R(x + 5, y - 11 + by, 2, 6, o.shirt);
    R(x - 7, y - 5 + by, 2, 2, SKIN);
    R(x + 5, y - 5 + by, 2, 2, SKIN);
    R(x - 4, y - 19 + by, 8, 7, SKIN);
    if (face === 'back') {
      R(x - 5, y - 22 + by, 10, 10, o.hair);
    } else {
      R(x - 5, y - 22 + by, 10, 4, o.hair);
      R(x - 5, y - 19 + by, 1, 4, o.hair);
      R(x + 4, y - 19 + by, 1, 4, o.hair);
      if (face === 'normal') {
        R(x - 3, y - 16 + by, 1, 2, EYE); R(x + 2, y - 16 + by, 1, 2, EYE);
        R(x - 1, y - 14 + by, 2, 1, '#a8604e');
      } else if (face === 'strain') {
        R(x - 3, y - 16 + by, 2, 1, EYE); R(x + 1, y - 16 + by, 2, 1, EYE);
        R(x - 2, y - 14 + by, 4, 1, '#7a3b2e');
        R(x - 4, y - 15 + by, 1, 2, '#e8998a'); R(x + 3, y - 15 + by, 1, 2, '#e8998a');
      } else if (face === 'laugh') {
        R(x - 3, y - 16 + by, 2, 1, EYE); R(x + 1, y - 16 + by, 2, 1, EYE);
        R(x - 2, y - 14 + by, 4, 2, '#7a2e2e'); R(x - 2, y - 14 + by, 4, 1, '#fff');
      } else if (face === 'sad') {
        R(x - 3, y - 16 + by, 1, 1, EYE); R(x + 2, y - 16 + by, 1, 1, EYE);
        R(x - 2, y - 13 + by, 4, 1, '#7a3b2e');
        R(x - 4, y - 17 + by, 3, 1, o.hair); R(x + 1, y - 17 + by, 3, 1, o.hair);
      }
    }
  };
  const legs = step => {
    R(x - 4, y - 5, 3, 5 - (step > 0 ? 1 : 0), o.pants);
    R(x + 1, y - 5, 3, 5 - (step < 0 ? 1 : 0), o.pants);
    R(x - 4, y - 1 - (step > 0 ? 1 : 0), 3, 1, SHOE);
    R(x + 1, y - 1 - (step < 0 ? 1 : 0), 3, 1, SHOE);
  };

  switch (p.pose) {
    case 'walk': {
      const s = Math.sin(t * 12);
      legs(s > 0.3 ? 1 : s < -0.3 ? -1 : 0);
      upper(Math.abs(s) > 0.9 ? -1 : 0, 'normal');
      break;
    }
    case 'dig': {
      const ph = Math.sin(t * 10 + (p.ph || 0));
      legs(0); upper(ph > 0 ? 1 : 0, 'normal');
      const d = ph > 0 ? 3 : -1;
      R(x + 7, y - 15 + d, 1, 13, '#8a6a3b');
      R(x + 6, y - 3 + d, 3, 3, '#aab0b7');
      break;
    }
    case 'clench': {
      if (S.shake) x += Math.random() < .5 ? -1 : 1;
      R(x - 3, y - 5, 6, 5, o.pants); R(x - 3, y - 1, 6, 1, SHOE);
      upper(1, 'strain');
      R(x + 5, y - 20 + ((t * 10) % 4 | 0), 1, 2, '#8fd3ff');
      R(x - 6, y - 21 + ((t * 8) % 4 | 0), 1, 2, '#8fd3ff');
      break;
    }
    case 'sit': {
      if (S.shake) x += Math.random() < .5 ? -1 : 1;
      upper(6, 'strain');
      R(x - 5, y, 10, 3, o.pants);
      R(x - 4, y + 3, 3, 4, o.pants); R(x + 1, y + 3, 3, 4, o.pants);
      R(x - 4, y + 7, 3, 1, SHOE);   R(x + 1, y + 7, 3, 1, SHOE);
      R(x + 5, y - 14 + ((t * 10) % 4 | 0), 1, 2, '#8fd3ff');
      break;
    }
    case 'squat': {
      upper(8, 'back');
      R(x - 7, y + 3, 14, 2, o.pants);
      R(x - 7, y + 5, 3, 1, SHOE); R(x + 4, y + 5, 3, 1, SHOE);
      break;
    }
    case 'facepalm': {
      upper(8, 'back');
      R(x - 7, y + 3, 14, 2, o.pants);
      R(x - 7, y + 5, 3, 1, SHOE); R(x + 4, y + 5, 3, 1, SHOE);
      R(x + 4, y - 9, 2, 6, o.shirt);
      R(x + 2, y - 14, 4, 3, SKIN);
      R(x + 6, y - 22 + ((t * 6) % 3 | 0), 1, 2, '#8fd3ff');
      break;
    }
    case 'standBack': {
      legs(0); upper(0, 'back');
      break;
    }
    case 'laugh': {
      const b = Math.sin(t * 25) > 0 ? 1 : 0;
      legs(0); upper(b, 'laugh');
      R(x + 7, y - 15, 1, 14, '#8a6a3b'); R(x + 6, y - 2, 3, 2, '#aab0b7');
      break;
    }
    case 'fail': {
      legs(0); upper(0, 'sad');
      R(x - 4, y, 8, 2, '#6b4423'); R(x - 2, y + 1, 5, 1, '#55341a');
      const a = S.t * 4;
      R(x + Math.cos(a) * 9, y - 18 + Math.sin(a) * 4, 1, 1, '#111');
      R(x + Math.cos(a + 2) * 8, y - 14 + Math.sin(a + 2) * 4, 1, 1, '#111');
      R(x + Math.cos(a + 4) * 7, y - 22 + Math.sin(a + 4) * 3, 1, 1, '#111');
      break;
    }
    default: // stand
      legs(0); upper(0, 'normal');
  }
}

function ped(p) {
  const x = Math.round(p.x), y = 34;
  const step = !S.revealed && Math.sin(S.t * 8 + p.x) > 0 ? 1 : 0;
  R(x - 2, y - 6, 4, 4, p.c);
  R(x - 1, y - 9, 3, 3, SKIN);
  R(x - 1, y - 10, 3, 1, p.h);
  R(x - 2, y - 2, 1, 2 - step, '#333'); R(x + 1, y - 2, 1, 1 + step, '#333');
  if (S.revealed) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(Math.round(x - camX) - 2, y - 20, 5, 7);
    ctx.fillStyle = '#d02020';
    ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
    ctx.fillText('!', Math.round(x - camX) + 1, y - 14);
  }
}

function car(c) {
  const x = c.x, y = c.y;
  R(x, y - 6, 26, 8, c.col);
  R(x + 6, y - 9, 12, 4, c.col);
  R(x + 8, y - 8, 8, 3, '#bfe3f2');
  R(x + 3, y + 1, 5, 2, '#222'); R(x + 18, y + 1, 5, 2, '#222');
}

function drawHole() {
  const d = S.dig;
  R(54, 121, 48, 17, '#73532f');
  const iw = Math.round(10 + d * 0.34), ih = Math.round(4 + d * 0.09);
  R(78 - (iw >> 1), 124, iw, ih, '#3a2815');
  R(78 - (iw >> 1) + 2, 125, Math.max(0, iw - 4), Math.max(0, ih - 2), '#271a0c');
  const ph = Math.round(2 + d * 0.1);
  R(104, 138 - ph, 22, ph, '#9a7a52');
  R(106, 138 - ph, 16, 1, '#b3926a');
}

function label(text, wx, wy, col) {
  ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
  const sx = Math.round(wx - camX);
  ctx.lineWidth = 2; ctx.strokeStyle = '#000'; ctx.strokeText(text, sx, wy);
  ctx.fillStyle = col; ctx.fillText(text, sx, wy);
}

function currentPose() {
  if (S.forcePose) return S.forcePose;
  if (S.digT > 0) return 'dig';
  if (S.meterOn && !dima.moving) return 'clench';
  if (dima.moving) return 'walk';
  return 'stand';
}

function targetFor() {
  if (S.dlg || S.timer > 0) return null;
  switch (S.phase) {
    case 'dig1': case 'dig2': return inDigZone() ? null : { x: DIG.x, y: DIG.y - 8 };
    case 'urge2': return S.sitting ? null : { x: MON.x, y: MON.y - 8 };
    case 'walk':  return { x: WC.x, y: WC.y };
    case 'rush':  return { x: PILES.x, y: PILES.y - 14 };
  }
  return null;
}

function draw() {
  const shake = S.shake ? (Math.random() < .5 ? -1 : 1) : 0;
  camX = Math.max(0, Math.min(WORLD - W, Math.round(dima.x - W / 2)));

  ctx.drawImage(bg, camX, 0, W, H, 0, 0, W, H);
  drawHole();
  cars.forEach(car);
  peds.forEach(ped);

  dima.pose = currentPose();
  const ents = [{ y: dima.y, f: () => person(dima, DIMA) }];
  if (abram.visible) ents.push({ y: abram.y, f: () => person(abram, ABR) });
  ents.sort((a, b) => a.y - b.y).forEach(e => e.f());

  ctx.drawImage(fg, camX, 0, W, H, 0, 0, W, H);

  // имена над головами
  if (dima.pose !== 'fail') label(DIMA.name, dima.x, dima.y - (dima.pose === 'squat' || dima.pose === 'facepalm' ? 14 : dima.pose === 'sit' ? 18 : 26), '#ffd0c8');
  if (abram.visible && Math.abs(abram.x - dima.x) < W / 2 + 10) label(ABR.name, abram.x, abram.y - 26, '#b9f0c4');

  // стрелка-цель
  const tg = targetFor();
  if (tg) {
    const sx = tg.x - camX, bob = Math.round(Math.sin(S.t * 6) * 2);
    ctx.fillStyle = '#ffd166';
    if (sx > 6 && sx < W - 6) {
      const ax = Math.round(sx), ay = Math.round(tg.y - 24 + bob);
      ctx.fillRect(ax - 4, ay, 9, 2); ctx.fillRect(ax - 3, ay + 2, 7, 2);
      ctx.fillRect(ax - 2, ay + 4, 5, 2); ctx.fillRect(ax - 1, ay + 6, 3, 2);
    } else if (sx >= W - 6) {
      const ax = W - 10 + bob, ay = 90;
      ctx.fillRect(ax, ay - 4, 2, 9); ctx.fillRect(ax + 2, ay - 3, 2, 7);
      ctx.fillRect(ax + 4, ay - 2, 2, 5); ctx.fillRect(ax + 6, ay - 1, 2, 3);
    } else {
      const ax = 2 - bob, ay = 90;
      ctx.fillRect(ax + 6, ay - 4, 2, 9); ctx.fillRect(ax + 4, ay - 3, 2, 7);
      ctx.fillRect(ax + 2, ay - 2, 2, 5); ctx.fillRect(ax, ay - 1, 2, 3);
    }
  }

  // туман
  if (S.fog > 0.01) {
    const cx = dima.x - camX, cy = dima.y - 10;
    const gr = ctx.createRadialGradient(cx, cy, 16, cx, cy, 72);
    gr.addColorStop(0, 'rgba(235,232,224,0)');
    gr.addColorStop(0.4, `rgba(235,232,224,${S.fog * 0.55})`);
    gr.addColorStop(1, `rgba(235,232,224,${S.fog})`);
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, W, H);
  }

  // красная рамка при сильном позыве
  if (S.meterOn && S.meter > 70 && Math.sin(S.t * 14) > 0) {
    ctx.strokeStyle = 'rgba(224,69,58,.8)'; ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, W - 3, H - 3);
  }

  if (shake) ctx.setTransform(1, 0, 0, 1, shake, 0); else ctx.setTransform(1, 0, 0, 1, 0, 0);
}

/* ---------------------------------------------------------------------
   HUD
   --------------------------------------------------------------------- */
function setText(el, txt) {
  if (el._t !== txt) { el._t = txt; el.textContent = txt; el.style.display = txt ? '' : 'none'; }
}
function calmHint(base) {
  if (S.calm > 0) return 'Держись! Ещё ' + Math.ceil(CALM_TIME - S.calm) + ' с';
  return base;
}
function hintText() {
  if (S.dlg || S.timer > 0) return '';
  switch (S.phase) {
    case 'dig1': case 'dig2': return inDigZone() ? 'ПРОБЕЛ / ТАП — копать' : 'Подойди к яме!';
    case 'urge1': case 'urgeA': return calmHint('ЖМИ ПРОБЕЛ / ТАП — держи шкалу ниже 20%!');
    case 'urge2': return S.sitting ? calmHint('ЖМИ ПРОБЕЛ / ТАП — держи шкалу ниже 20%!') : 'Беги к памятнику и сядь на выступ!';
    case 'urgeB': return 'Сдержаться не получается...';
    case 'rush':  return 'Беги к кучам! Тапай, чтобы выиграть время!';
    case 'walk':  return 'Иди к раздевалке: WASD / стрелки / джойстик';
    case 'poop1': return 'ЖМИ ПРОБЕЛ / ТАП!';
    case 'poop2': return 'Быстрее заканчивай! ПРОБЕЛ / ТАП';
  }
  return '';
}
function hud() {
  document.body.classList.toggle('playing', S.phase !== 'menu');
  setText(els.quest, S.quest ? 'ЗАДАНИЕ: ' + S.quest : '');
  setText(els.side, S.side ? 'ПОБОЧНОЕ: ' + S.side : '');
  setText(els.warn, S.warn);
  setText(els.hint, hintText());

  let mode = null, val = 0, label = '';
  if (S.meterOn) { mode = 'urge'; val = S.meter; label = 'ПОЗЫВ'; }
  else if (S.phase === 'dig1' || S.phase === 'dig2') { mode = 'dig'; val = S.dig; label = 'ЯМА'; }
  else if (S.phase === 'poop1' || S.phase === 'poop2') { mode = 'prog'; val = S.prog; label = 'ПРОЦЕСС'; }

  if (mode && !S.dlg) {
    els.barwrap.style.display = '';
    els.barwrap.className = mode;
    setText(els.barLabel, label);
    els.fill.style.width = Math.max(0, Math.min(100, val)) + '%';
  } else {
    els.barwrap.style.display = 'none';
  }
}

/* ---------------------------------------------------------------------
   СТАРТ / РЕСТАРТ / ЦИКЛ
   --------------------------------------------------------------------- */
function startGame() {
  reset();
  S.phase = 'intro';
  els.menu.classList.remove('on');
  els.end.classList.remove('on');
  els.dlg.classList.remove('on');
  music('m1');
  setQuest('', '');
  say([
    { who: 'Абрам', text: 'Дима, вот лопаты. Выкопаем яму — вечером нам заплатят.' },
    { who: 'Дима', text: 'Ну поехали. Работа есть работа.' },
    { who: '', text: 'Копайте яму вместе с Абрамом: подойдите к яме и жмите ПРОБЕЛ / ТАП.' }
  ], () => { S.phase = 'dig1'; setQuest('Копать яму вместе с Абрамом'); });
}

$('startBtn').addEventListener('click', startGame);
$('againBtn').addEventListener('click', startGame);

buildWorld();
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (S.phase !== 'menu' && S.phase !== 'over') update(dt);
  else { S.t += dt; npcs(dt); }
  draw();
  hud();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

})();
