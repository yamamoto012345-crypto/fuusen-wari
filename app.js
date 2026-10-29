const COLORS = ['#ff5c8a', '#ffb703', '#4cc9f0', '#7bd957', '#b388ff', '#ff8c42'];
const STARS = ['⭐', '✨', '🌟', '💖', '🎈'];
const BEST_KEY = 'fuusen-wari-best';

// むずかしさ: 最初の EASY_SEC 秒は一定、その後 RAMP_SEC 秒かけて少しずつ速くなり、頭打ちになる
const EASY_SEC = 30;
const RAMP_SEC = 120;
const SPAWN_START_MS = 1100;
const SPAWN_MIN_MS = 350;

let score = 0;
let best = 0;
let running = false;
let elapsed = 0;
let untilSpawn = 0;
let lastTs = 0;
let audio = null;

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const startEl = document.getElementById('start');
const overEl = document.getElementById('over');
const overScoreEl = document.getElementById('overScore');
const overBestEl = document.getElementById('overBest');
const newRecordEl = document.getElementById('newRecord');
const retryEl = document.getElementById('retry');

function loadBest() {
  try {
    const v = parseInt(localStorage.getItem(BEST_KEY), 10);
    return Number.isFinite(v) && v > 0 ? v : 0;
  } catch (e) { return 0; }
}

function saveBest(v) {
  try { localStorage.setItem(BEST_KEY, String(v)); } catch (e) { /* 保存できなくても遊べる */ }
}

function showBest() {
  bestEl.textContent = '🏆 ' + best;
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
  return Math.min(1, Math.max(0, (elapsed - EASY_SEC) / RAMP_SEC));
}

function spawn() {
  const b = document.createElement('div');
  b.className = 'b';
  const size = 0.8 + Math.random() * 0.7;
  b.style.width = 110 * size + 'px';
  b.style.height = 140 * size + 'px';
  b.style.left = Math.random() * Math.max(0, innerWidth - 130) + 'px';
  b.style.background = COLORS[Math.floor(Math.random() * COLORS.length)];
  document.body.appendChild(b);

  // 画面外までの所要時間。上端に着くまでは、この約7割（はじめは 約6〜10秒、いちばん むずかしいと 約3〜4.5秒）
  const duration = (9000 + Math.random() * 5000) * (1 - 0.55 * level());
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
    untilSpawn = SPAWN_START_MS - (SPAWN_START_MS - SPAWN_MIN_MS) * level();
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
    saveBest(best);
    showBest();
  }
  overScoreEl.textContent = '⭐ ' + score;
  overBestEl.textContent = '🏆 ' + best;
  newRecordEl.hidden = !(isNew && score > 0);
  retryEl.disabled = true;
  overEl.style.display = 'flex';
  setTimeout(() => { retryEl.disabled = false; }, 700); // 連打で すぐ再開しないように
}

function begin() {
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

document.addEventListener('visibilitychange', () => {
  if (!running) return;
  document.getAnimations().forEach((a) => (document.hidden ? a.pause() : a.play()));
});

startEl.addEventListener('pointerdown', begin);
retryEl.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (!retryEl.disabled) begin();
});

best = loadBest();
showBest();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
