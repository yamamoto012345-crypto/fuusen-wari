const COLORS = ['#ff5c8a', '#ffb703', '#4cc9f0', '#7bd957', '#b388ff', '#ff8c42'];
const STARS = ['⭐', '✨', '🌟', '💖', '🎈'];

// モードごとの設定
//  easy/ramp : 最初の easy 秒は一定、その後 ramp 秒かけて少しずつ速くなり、頭打ちになる
//  spawnStart/spawnMin : 風船の出る間隔(ms)。難しくなるほど spawnMin に近づく
//  dur : 画面外までの所要時間(ms) = base + random*range（上端に着くまではこの約7割）。cut は最高難度での短縮率
//  size : 風船の大きさ倍率 = base + random*range
//  おとな: 最後は風船が出る数（約7個/秒）が人の押せる数を超えるので、だいたい1〜3分で終わる
//          （手元のシミュレーションでは、1秒に3回押す人で約1分45秒、6回押す人で約2分30秒）
const MODES = {
  kid: {
    bestKey: 'fuusen-wari-best',
    easy: 30, ramp: 120,
    spawnStart: 1100, spawnMin: 350,
    dur: { base: 9000, range: 5000, cut: 0.55 },
    size: { base: 0.8, range: 0.7 },
  },
  adult: {
    bestKey: 'fuusen-wari-best-adult',
    easy: 0, ramp: 160,
    spawnStart: 750, spawnMin: 140,
    dur: { base: 5500, range: 2500, cut: 0.6 },
    size: { base: 0.6, range: 0.5 },
  },
};

let modeName = 'kid';
let mode = MODES.kid;
let score = 0;
let best = 0;
let running = false;
let elapsed = 0;
let untilSpawn = 0;
let lastTs = 0;
let audio = null;

const $ = (id) => document.getElementById(id);
const scoreEl = $('score');
const bestEl = $('best');
const startEl = $('start');
const overEl = $('over');
const overScoreEl = $('overScore');
const overBestEl = $('overBest');
const overTimeEl = $('overTime');
const newRecordEl = $('newRecord');
const retryEl = $('retry');
const changeEl = $('change');

function loadBest(key) {
  try {
    const v = parseInt(localStorage.getItem(key), 10);
    return Number.isFinite(v) && v > 0 ? v : 0;
  } catch (e) { return 0; }
}

function saveBest(key, v) {
  try { localStorage.setItem(key, String(v)); } catch (e) { /* 保存できなくても遊べる */ }
}

function showBest() {
  bestEl.textContent = '🏆 ' + best;
}

function formatTime(sec) {
  const s = Math.floor(sec);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

function beep(freq, slide = 2, vol = .25) {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, audio.currentTime);
    o.frequency.exponentialRampToValueAtTime(freq * slide, audio.currentTime + .25);
    g.gain.setValueAtTime(vol, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .3);
    o.connect(g);
    g.connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + .3);
  } catch (e) { /* 音が出なくてもゲームは続ける */ }
}

function burst(x, y) {
  for (let i = 0; i < 8; i++) {
    const p = document.createElement('div');
    p.className = 'p';
    p.textContent = STARS[Math.floor(Math.random() * STARS.length)];
    p.style.left = x + 'px';
    p.style.top = y + 'px';
    document.body.appendChild(p);
    const a = Math.random() * Math.PI * 2;
    const d = 60 + Math.random() * 90;
    requestAnimationFrame(() => {
      p.style.transform = `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d}px) rotate(${Math.random() * 360}deg)`;
      p.style.opacity = 0;
    });
    setTimeout(() => p.remove(), 750);
  }
}

// 0（やさしい）〜 1（いちばん むずかしい）
function level() {
  return Math.min(1, Math.max(0, (elapsed - mode.easy) / mode.ramp));
}

function spawn() {
  const b = document.createElement('div');
  b.className = 'b';
  const size = mode.size.base + Math.random() * mode.size.range;
  b.style.width = 110 * size + 'px';
  b.style.height = 140 * size + 'px';
  b.style.left = Math.random() * Math.max(0, innerWidth - 130 * size) + 'px';
  b.style.background = COLORS[Math.floor(Math.random() * COLORS.length)];
  document.body.appendChild(b);

  const duration = (mode.dur.base + Math.random() * mode.dur.range) * (1 - mode.dur.cut * level());
  b.animate(
    [{ transform: 'translateY(0)' }, { transform: `translateY(${-(innerHeight + 350)}px)` }],
    { duration, easing: 'linear', fill: 'forwards' }
  );

  b.addEventListener('pointerdown', (e) => {
    if (!running) return;
    e.preventDefault();
    const r = b.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2);
    beep(300 + Math.random() * 500);
    score++;
    scoreEl.textContent = '⭐ ' + score;
    b.remove();
  });
}

function tick(ts) {
  if (!running) return;
  const dt = Math.min(ts - lastTs, 100); // タブを離れていた間は進めない
  lastTs = ts;
  elapsed += dt / 1000;

  untilSpawn -= dt;
  if (untilSpawn <= 0) {
    spawn();
    untilSpawn = mode.spawnStart - (mode.spawnStart - mode.spawnMin) * level();
  }

  // 風船が1つでも画面の上に着いたらおしまい
  for (const b of document.querySelectorAll('.b')) {
    if (b.getBoundingClientRect().top <= 0) {
      gameOver();
      return;
    }
  }
  requestAnimationFrame(tick);
}

function gameOver() {
  running = false;
  document.getAnimations().forEach((a) => a.pause());
  beep(400, 0.4, .3);

  const isNew = score > best;
  if (isNew) {
    best = score;
    saveBest(mode.bestKey, best);
    showBest();
  }
  overScoreEl.textContent = '⭐ ' + score;
  overBestEl.textContent = '🏆 ' + best;
  overTimeEl.textContent = '⏱ ' + formatTime(elapsed);
  newRecordEl.hidden = !(isNew && score > 0);
  retryEl.disabled = true;
  changeEl.disabled = true;
  overEl.style.display = 'flex';
  setTimeout(() => { retryEl.disabled = false; changeEl.disabled = false; }, 700); // 連打で すぐ再開しないように
}

function begin(name) {
  if (name) {
    modeName = name;
    mode = MODES[name];
    best = loadBest(mode.bestKey);
    showBest();
    document.body.dataset.mode = name;
  }
  document.querySelectorAll('.b, .p').forEach((el) => el.remove());
  score = 0;
  elapsed = 0;
  untilSpawn = 0;
  scoreEl.textContent = '⭐ 0';
  startEl.style.display = 'none';
  overEl.style.display = 'none';
  running = true;
  beep(440);
  lastTs = performance.now();
  requestAnimationFrame(tick);
}

function backToStart() {
  document.querySelectorAll('.b, .p').forEach((el) => el.remove());
  overEl.style.display = 'none';
  startEl.style.display = 'flex';
}

document.addEventListener('visibilitychange', () => {
  if (!running) return;
  document.getAnimations().forEach((a) => (document.hidden ? a.pause() : a.play()));
});

document.querySelectorAll('[data-mode]').forEach((btn) => {
  if (btn === document.body) return;
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    begin(btn.dataset.mode);
  });
});
retryEl.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (!retryEl.disabled) begin();
});
changeEl.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (!changeEl.disabled) backToStart();
});

best = loadBest(mode.bestKey);
showBest();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
