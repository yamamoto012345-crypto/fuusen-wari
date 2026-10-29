const COLORS = ['#ff5c8a', '#ffb703', '#4cc9f0', '#7bd957', '#b388ff', '#ff8c42'];
const STARS = ['⭐', '✨', '🌟', '💖', '🎈'];

let score = 0;
let started = false;
let audio = null;

const scoreEl = document.getElementById('score');
const startEl = document.getElementById('start');

function beep(freq) {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, audio.currentTime);
    o.frequency.exponentialRampToValueAtTime(freq * 2, audio.currentTime + .12);
    g.gain.setValueAtTime(.25, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .2);
    o.connect(g);
    g.connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + .2);
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

function spawn() {
  if (document.hidden) return;
  const b = document.createElement('div');
  b.className = 'b';
  const size = 0.8 + Math.random() * 0.7;
  b.style.width = 110 * size + 'px';
  b.style.height = 140 * size + 'px';
  b.style.left = Math.random() * Math.max(0, innerWidth - 130) + 'px';
  b.style.background = COLORS[Math.floor(Math.random() * COLORS.length)];
  document.body.appendChild(b);

  const duration = 6000 + Math.random() * 4000;
  const anim = b.animate(
    [{ transform: 'translateY(0)' }, { transform: `translateY(${-(innerHeight + 350)}px)` }],
    { duration, easing: 'linear' }
  );
  anim.onfinish = () => b.remove();

  b.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const r = b.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2);
    beep(300 + Math.random() * 500);
    score++;
    scoreEl.textContent = '⭐ ' + score;
    b.remove();
  });
}

function start() {
  if (started) return;
  started = true;
  startEl.style.display = 'none';
  beep(440);
  for (let i = 0; i < 4; i++) setTimeout(spawn, i * 300);
  setInterval(spawn, 900);
}

startEl.addEventListener('pointerdown', start);

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
