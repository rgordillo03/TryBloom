// ═══════════════════════════════════════════════════════════════
// DRAW — the garden's "paint box" (plain Canvas 2D, no libraries)
// ═══════════════════════════════════════════════════════════════
// Every function here draws one thing: the sky, the island, a daisy,
// a tree… GardenScene.jsx decides WHAT to draw and WHERE; this file
// only knows HOW. Plants are drawn around (0, 0) = the spot where the
// stem touches the ground, so the scene can move/scale/bounce them
// freely with ctx.translate / ctx.scale.
//
// Colours always go through `P(hex)` ("paint"), which mixes in the
// current dryness (towards straw-brown) and night (towards blue).
// That single trick is what makes the whole garden dry out or go to
// sleep together.
// ═══════════════════════════════════════════════════════════════

const TAU = Math.PI * 2;

// ── Palettes ───────────────────────────────────────────────────
// Shared gardens: each member gets their own flower colour (in join order).
export const MEMBER_COLORS = ['#e98a7a', '#b8a4e3', '#f2c14e', '#8fc1d4', '#e8a3c4', '#f6a96b', '#9fd0a8', '#d9a0e0'];
// Solo gardens: a soft mixed bouquet.
export const SOLO_COLORS = ['#e98a7a', '#e8a3c4', '#b8a4e3', '#f6f1ea', '#f2a65a', '#d77fa1', '#f2c14e'];

// ── Colour helpers ─────────────────────────────────────────────
const rgbCache = new Map();
function rgb(hex) {
  let v = rgbCache.get(hex);
  if (!v) {
    const n = parseInt(hex.slice(1), 16);
    v = [n >> 16, (n >> 8) & 255, n & 255];
    rgbCache.set(hex, v);
  }
  return v;
}
const mixArr = (a, b, k) => [0, 1, 2].map(i => a[i] + (b[i] - a[i]) * k);
const css = (c, a = 1) => a >= 1
  ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`
  : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a.toFixed(3)})`;

const DRY = [170, 142, 104];   // straw
const NIGHT = [36, 44, 78];    // moonlit blue

// P(hex, k) → CSS colour with dryness + night applied.
// k = how strongly this thing dries (sky 0.3, plants 1).
export function makePaint(dry, night) {
  const d = dry * 0.8, n = night * 0.42;
  const P = (hex, k = 1) => css(mixArr(mixArr(rgb(hex), DRY, d * k), NIGHT, n));
  P.a = (hex, alpha, k = 1) => css(mixArr(mixArr(rgb(hex), DRY, d * k), NIGHT, n), alpha);
  return P;
}

// ── Small shape helpers ────────────────────────────────────────
function circle(ctx, x, y, r, fill) {
  ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); ctx.fill();
}
function oval(ctx, x, y, rx, ry, fill, rot = 0) {
  ctx.fillStyle = fill; ctx.beginPath(); ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot, 0, TAU); ctx.fill();
}
function poly(ctx, pts, fill) {
  ctx.fillStyle = fill; ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  ctx.closePath(); ctx.fill();
}
const seeded = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// ═══════════════════════════════════════════════════════════════
// SKY — follows the user's local clock
// ═══════════════════════════════════════════════════════════════
const SKY = [
  [0, '#20263f', '#383e5e'], [5, '#272d4c', '#4d4b6c'], [6.5, '#efc9b1', '#f5e3d1'],
  [9, '#e4ede4', '#f7f0e4'], [16.5, '#e8eee2', '#f7efe2'], [18.5, '#f2c4a0', '#f8e2c8'],
  [20.5, '#463f63', '#86697a'], [22, '#20263f', '#383e5e'], [24, '#20263f', '#383e5e'],
];

export function nightAt(h) {
  if (h < 5) return 1;
  if (h < 6.5) return 1 - (h - 5) / 1.5;
  if (h < 18.5) return 0;
  if (h < 21) return (h - 18.5) / 2.5;
  return 1;
}

function skyColors(h) {
  for (let k = 0; k < SKY.length - 1; k++) {
    const [h0, t0, b0] = SKY[k], [h1, t1, b1] = SKY[k + 1];
    if (h >= h0 && h <= h1) {
      const f = (h - h0) / (h1 - h0);
      return [mixArr(rgb(t0), rgb(t1), f), mixArr(rgb(b0), rgb(b1), f)];
    }
  }
  return [rgb(SKY[0][1]), rgb(SKY[0][2])];
}

export function drawSky(ctx, W, H, { hour, night, dry, t, rain }) {
  let [top, bot] = skyColors(hour);
  const dusty = [214, 200, 178], storm = [150, 158, 170];
  top = mixArr(mixArr(top, dusty, dry * 0.35), storm, rain * 0.45);
  bot = mixArr(mixArr(bot, dusty, dry * 0.35), storm, rain * 0.3);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, css(top)); g.addColorStop(1, css(bot));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // Stars
  if (night > 0.05) {
    for (let i = 0; i < 46; i++) {
      const x = seeded(i) * W, y = seeded(i + 99) * H * 0.55;
      const tw = 0.55 + 0.45 * Math.sin(t * (1 + seeded(i + 7) * 2) + i);
      circle(ctx, x, y, 0.5 + seeded(i + 3) * 0.9, `rgba(255,248,225,${(night * tw * 0.85).toFixed(3)})`);
    }
  }
  // Sun travels from morning (left) to evening (right)
  if (hour > 5.8 && hour < 20.4) {
    const p = (hour - 6) / 14;
    const x = W * (0.12 + 0.76 * p), y = H * (0.3 - 0.19 * Math.sin(Math.PI * Math.min(1, Math.max(0, p))));
    const a = (1 - night) * (1 - rain * 0.8);
    circle(ctx, x, y, 22, `rgba(242,198,109,${(0.22 * a).toFixed(3)})`);
    circle(ctx, x, y, 13, `rgba(242,198,109,${(0.95 * a).toFixed(3)})`);
  }
  // Moon (a crescent cut out with a sky-coloured circle)
  if (night > 0.05) {
    const x = W * 0.8, y = H * 0.14;
    circle(ctx, x, y, 11, `rgba(243,234,210,${night.toFixed(3)})`);
    circle(ctx, x + 5, y - 3, 9.5, css(top, night));
  }
  // Drifting clouds (greyer in the rain)
  const cloudA = Math.max(rain * 0.9, (1 - night) * 0.7);
  const cloudC = rain > 0 ? mixArr([255, 255, 255], [165, 172, 184], rain) : [255, 255, 255];
  for (let k = 0; k < 2 + Math.round(rain * 2); k++) {
    const x = ((t * (5 + k * 2) + k * 170) % (W + 140)) - 70;
    const y = H * (0.1 + k * 0.07);
    const c = css(cloudC, cloudA);
    circle(ctx, x, y, 12, c); circle(ctx, x + 13, y - 5, 14, c); circle(ctx, x + 28, y, 11, c);
    oval(ctx, x + 14, y + 4, 24, 7, c);
  }
}

export function drawRainbow(ctx, cx, cy, r, alpha) {
  if (alpha <= 0) return;
  const bands = ['#e98a7a', '#f2b45c', '#f2d66b', '#9fd0a8', '#8fc1d4', '#b8a4e3'];
  ctx.lineWidth = 4;
  bands.forEach((b, i) => {
    ctx.strokeStyle = css(rgb(b), alpha);
    ctx.beginPath(); ctx.arc(cx, cy, r - i * 4, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
  });
}

export function drawRain(ctx, W, H, t, k) {
  if (k <= 0) return;
  ctx.strokeStyle = `rgba(150,180,205,${(0.7 * k).toFixed(3)})`;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 0; i < 70; i++) {
    const x = (seeded(i) * W + t * 30) % W;
    const y = ((t * 360 + seeded(i + 50) * H) % (H * 0.95));
    ctx.moveTo(x, y); ctx.lineTo(x - 2, y + 9);
  }
  ctx.stroke();
}

// ═══════════════════════════════════════════════════════════════
// ISLAND — the floating isometric plot
// ═══════════════════════════════════════════════════════════════
// Cell (i, j) → screen: x = cx + (i − j)·cw/2,  y = cy + (i + j)·ch/2
// That's all "isometric" means here: a grid turned 45° and squashed.
export function islandGeometry(W, H, plotRing, t) {
  const A = Math.min(W * 0.43, H * 0.6);          // half width of the diamond
  const cw = (2 * A) / (2 * plotRing + 1);        // one cell's width
  return {
    A, B: A / 2, cw, ch: cw / 2, R: plotRing,
    cx: W / 2,
    cy: H * 0.53 + Math.sin(t * 1.1) * 3,         // gentle floating bob
    depth: A * 0.2,
    s: Math.max(0.45, Math.min(1.6, cw / 40)),    // plant scale (shrinks as the garden grows)
  };
}

export function cellToScreen(g, i, j, jx = 0, jy = 0) {
  return [g.cx + ((i - j) * g.cw) / 2 + jx, g.cy + ((i + j) * g.ch) / 2 + jy];
}

export function drawIsland(ctx, g, P, t, seed = 0) {
  const { cx, cy, A, B, depth, R } = g;

  // Soft shadow far below (it floats!)
  oval(ctx, cx, cy + B + depth + A * 0.42, A * 0.42, 5, 'rgba(60,45,30,0.08)');

  // Rocky underside: a low-poly chunk of earth tapering down
  const top = cy + depth, front = cy + B + depth, tip = front + A * 0.2;
  poly(ctx, [[cx - A, top], [cx - A * 0.35, front - B * 0.35 + A * 0.12], [cx - A * 0.1, tip]], P('#8a7360'));
  poly(ctx, [[cx - A, top], [cx, front], [cx - A * 0.1, tip], [cx - A * 0.35, front - B * 0.35 + A * 0.12]], P('#7d6857'));
  poly(ctx, [[cx + A, top], [cx, front], [cx - A * 0.1, tip], [cx + A * 0.45, front - B * 0.45 + A * 0.1]], P('#655445'));
  // Little roots hanging down
  ctx.strokeStyle = P('#8a6a4c'); ctx.lineWidth = 1.2; ctx.lineCap = 'round';
  for (let k = 0; k < 4; k++) {
    const f = 0.3 + k * 0.14, x0 = cx - A + A * 2 * f, y0 = top + B * (1 - Math.abs(1 - 2 * f)) + 1;
    const sw = Math.sin(t * 1.3 + k) * 2;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x0 + 3, y0 + 7, x0 + sw, y0 + 11 + k * 2); ctx.stroke();
  }

  // Side faces (soil)
  poly(ctx, [[cx - A, cy], [cx, cy + B], [cx, cy + B + depth], [cx - A, cy + depth]], P('#b48a66'));
  poly(ctx, [[cx + A, cy], [cx, cy + B], [cx, cy + B + depth], [cx + A, cy + depth]], P('#93694b'));
  // Soil layers + pebbles
  ctx.strokeStyle = P('#9b7454'); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx - A, cy + depth * 0.62); ctx.lineTo(cx, cy + B + depth * 0.62); ctx.lineTo(cx + A, cy + depth * 0.62); ctx.stroke();
  for (let k = 0; k < 9; k++) {
    const f = seeded(seed + k), side = k % 2 ? 1 : -1;
    const x = cx + side * A * f, y = cy + B * (1 - f) + depth * (0.3 + seeded(seed + k + 20) * 0.6);
    oval(ctx, x, y, 2.2, 1.4, P(side < 0 ? '#c9a789' : '#a98667'));
  }

  // Grass lip with little drips over the edge
  poly(ctx, [[cx - A, cy], [cx, cy + B], [cx, cy + B + 5], [cx - A, cy + 5]], P('#8fb571'));
  poly(ctx, [[cx + A, cy], [cx, cy + B], [cx, cy + B + 5], [cx + A, cy + 5]], P('#7ea463'));
  for (let k = 1; k < 10; k++) {
    const f = k / 10;
    circle(ctx, cx - A + A * f, cy + B * f + 5, 2.2, P('#8fb571'));
    circle(ctx, cx + A - A * f, cy + B * f + 5, 2.2, P('#7ea463'));
  }

  // Top face + checkered garden cells
  poly(ctx, [[cx, cy - B], [cx + A, cy], [cx, cy + B], [cx - A, cy]], P('#a7c98a'));
  for (let i = -R; i <= R; i++) {
    for (let j = -R; j <= R; j++) {
      if ((i + j) % 2 === 0) continue;
      const [x, y] = cellToScreen(g, i, j);
      poly(ctx, [[x, y - g.ch / 2], [x + g.cw / 2, y], [x, y + g.ch / 2], [x - g.cw / 2, y]], 'rgba(255,255,255,0.07)');
    }
  }
  // Grass tufts swaying
  ctx.strokeStyle = P('#86ad69'); ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = -R; i <= R; i++) {
    for (let j = -R; j <= R; j++) {
      for (let k = 0; k < 2; k++) {
        const n = (i + 9) * 31 + (j + 9) * 7 + k * 3 + seed;
        const [x, y] = cellToScreen(g, i, j, (seeded(n) - 0.5) * g.cw * 0.6, (seeded(n + 1) - 0.5) * g.ch * 0.6);
        const sw = Math.sin(t * 1.7 + n) * 1.2;
        ctx.moveTo(x - 1.5, y); ctx.lineTo(x - 2 + sw, y - 4);
        ctx.moveTo(x + 1.5, y); ctx.lineTo(x + 2 + sw, y - 5);
      }
    }
  }
  ctx.stroke();
}

// Wooden plank with the garden's name, nailed to the front-left soil wall.
// ctx.transform(1, 0.5, …) skews it so it lies flat along that wall —
// it can never cover a plant there.
export function drawSign(ctx, g, P, name) {
  if (!name) return;
  const label = name.length > 22 ? name.slice(0, 21) + '…' : name;
  const fx = g.cx - g.A * 0.5, fy = g.cy + g.B * 0.5 + g.depth * 0.52;
  const h = Math.min(16, g.depth * 0.62);
  ctx.save();
  ctx.transform(1, g.B / g.A, 0, 1, fx, fy);    // slope of the left wall
  ctx.font = `italic ${Math.round(h * 0.68)}px 'Lora', serif`;
  const w = Math.min(g.A * 0.9, ctx.measureText(label).width + 14);
  ctx.fillStyle = 'rgba(40,30,20,0.18)'; ctx.fillRect(-w / 2 + 1.5, -h / 2 + 1.5, w, h);
  ctx.fillStyle = P('#c79a6c'); ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = P('#b0845a'); ctx.fillRect(-w / 2, h / 2 - 2, w, 2);
  ctx.fillStyle = P('#6e5038');
  circle(ctx, -w / 2 + 3.5, 0, 1.1, P('#6e5038')); circle(ctx, w / 2 - 3.5, 0, 1.1, P('#6e5038'));
  ctx.fillStyle = P('#4e3a2a'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, 0, 0.5, w - 12);
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════
// PLANTS — all drawn at (0, 0) = where they touch the ground
// ═══════════════════════════════════════════════════════════════
// o = { s: scale, t: time, dry: 0..1, color, colors, seed, stage }

function shadow(ctx, w, s) { oval(ctx, 0, 0, w * s, w * 0.36 * s, 'rgba(40,30,20,0.13)'); }

function stem(ctx, P, s, hx, hy, h = 9) {
  ctx.strokeStyle = P('#5f8a48'); ctx.lineWidth = 1.7 * s; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(0, -h * s, hx, hy); ctx.stroke();
}

// Reflection (daily question) → daisy
function daisy(ctx, P, o) {
  const { s, dry } = o;
  const sway = Math.sin(o.t * 1.6 + o.seed * 9) * 2 * s * (1 - dry * 0.7);
  const hx = sway + dry * 5 * s, hy = -17 * s + dry * 7 * s;
  shadow(ctx, 5, s);
  stem(ctx, P, s, hx, hy);
  oval(ctx, 3.2 * s, -6 * s, 3.2 * s, 1.4 * s, P('#6f9a52'), -0.5);
  const pr = 4.8 * s * (1 - dry * 0.35), rot = o.seed * TAU;
  for (let i = 0; i < 6; i++) {
    const a = rot + (i * TAU) / 6;
    oval(ctx, hx + Math.cos(a) * pr * 0.68, hy + Math.sin(a) * pr * 0.55, pr * 0.52, pr * 0.32, P(o.color), a);
  }
  circle(ctx, hx, hy, pr * 0.38, P('#e9b949'));
}

// Love note → tulip
function tulip(ctx, P, o) {
  const { s, dry } = o;
  const sway = Math.sin(o.t * 1.5 + o.seed * 9) * 2 * s * (1 - dry * 0.7);
  const hx = sway + dry * 5 * s, hy = -18 * s + dry * 7 * s;
  shadow(ctx, 5, s);
  oval(ctx, -3 * s, -5 * s, 5.5 * s, 1.5 * s, P('#6f9a52'), 1.15);
  oval(ctx, 3 * s, -5.5 * s, 5.5 * s, 1.5 * s, P('#7aa75c'), -1.15);
  stem(ctx, P, s, hx, hy, 10);
  const w = 4.2 * s * (1 - dry * 0.25);
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(dry * 0.6);
  ctx.fillStyle = P(o.color); ctx.beginPath();
  ctx.moveTo(-w, -1 * s);
  ctx.quadraticCurveTo(-w * 1.05, 5 * s, 0, 5.5 * s);
  ctx.quadraticCurveTo(w * 1.05, 5 * s, w, -1 * s);
  ctx.lineTo(w * 0.55, -5 * s); ctx.lineTo(w * 0.2, -1.5 * s);
  ctx.lineTo(0, -6 * s); ctx.lineTo(-w * 0.2, -1.5 * s);
  ctx.lineTo(-w * 0.55, -5 * s); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.beginPath();
  ctx.ellipse(-w * 0.35, 1 * s, w * 0.22, 3 * s, 0.2, 0, TAU); ctx.fill();
  ctx.restore();
}

// Goal → small sunflower (petals lean towards the owner's colour)
function sunflower(ctx, P, o) {
  const { s, dry } = o;
  const sway = Math.sin(o.t * 1.3 + o.seed * 9) * 1.6 * s * (1 - dry * 0.7);
  const hx = sway + dry * 6 * s, hy = -23 * s + dry * 8 * s;
  shadow(ctx, 6, s);
  stem(ctx, P, s, hx, hy, 12);
  oval(ctx, -4 * s, -9 * s, 4.2 * s, 2 * s, P('#6f9a52'), 0.5);
  oval(ctx, 4 * s, -13 * s, 3.6 * s, 1.7 * s, P('#7aa75c'), -0.5);
  const pr = 5.6 * s * (1 - dry * 0.35);
  for (let i = 0; i < 11; i++) {
    const a = (i * TAU) / 11 + o.seed;
    oval(ctx, hx + Math.cos(a) * pr * 0.72, hy + Math.sin(a) * pr * 0.62, pr * 0.42, pr * 0.2, P(o.petal), a);
  }
  circle(ctx, hx, hy, pr * 0.42, P('#7a4f2a'));
  circle(ctx, hx - pr * 0.12, hy - pr * 0.12, pr * 0.14, P('#9a6a3e'));
}

// 7-day streak → bush with little flowers in everyone's colours
function bush(ctx, P, o) {
  const { s, dry } = o;
  const k = 1 - dry * 0.18, w = Math.sin(o.t * 1.1 + o.seed * 7) * 0.8 * s;
  shadow(ctx, 15, s);
  [[-8, -7, 9, '#6a9650'], [7, -8, 9, '#6a9650'], [0, -14, 9.5, '#7aa75c'], [-1, -6, 8, '#7aa75c'], [4, -12, 6, '#86b06a']]
    .forEach(b => circle(ctx, b[0] * s + w * (-b[1] / 14), b[1] * s, b[2] * s * k, P(b[3])));
  circle(ctx, -4 * s + w, -15 * s, 3 * s * k, P('#97c07a'));
  if (dry < 0.85) {
    [[-6, -12], [4, -16], [8, -6], [-9, -4], [1, -8], [-3, -17], [6, -11]].forEach((d, i) =>
      circle(ctx, d[0] * s + w, d[1] * s, 1.9 * s * (1 - dry * 0.6), P(o.colors[i % o.colors.length])));
  }
}

// 14-day streak → tree that keeps maturing
function tree(ctx, P, o) {
  const { s, dry, stage } = o;
  const size = stage === 'young' ? 0.7 : 1;
  const k = 1 - dry * 0.22;
  const w = Math.sin(o.t * 0.9 + o.seed * 5) * 1.5 * s;
  const S = s * size;
  shadow(ctx, 18 * size, s);
  // trunk + a branch
  poly(ctx, [[-3.2 * S, 0], [3.2 * S, 0], [2 * S, -30 * S], [-2 * S, -30 * S]], P('#7a5a3f'));
  ctx.strokeStyle = P('#7a5a3f'); ctx.lineWidth = 1.8 * S;
  ctx.beginPath(); ctx.moveTo(1 * S, -20 * S); ctx.lineTo(8 * S + w * 0.3, -28 * S); ctx.stroke();
  // bare twigs show through when it's very dry
  if (dry > 0.6) {
    ctx.lineWidth = 1.2 * S;
    ctx.beginPath();
    ctx.moveTo(0, -30 * S); ctx.lineTo(-9 * S + w, -52 * S);
    ctx.moveTo(0, -32 * S); ctx.lineTo(10 * S + w, -50 * S);
    ctx.moveTo(0, -34 * S); ctx.lineTo(1 * S + w, -60 * S);
    ctx.stroke();
  }
  // canopy
  [[0, -40, 16, '#6a9455'], [-12, -32, 12, '#7fa864'], [12, -33, 12, '#7fa864'], [0, -54, 11, '#86b06a'], [-6, -47, 8, '#7fa864']]
    .forEach(b => circle(ctx, b[0] * S + w * (-b[1] / 50), b[1] * S, b[2] * S * k * (dry > 0.6 ? 0.75 : 1), P(b[3])));
  circle(ctx, -5 * S + w, -50 * S, 5 * S * k, P('#97c07a'));
  // blossoms
  if ((stage === 'blossoming' || stage === 'fruiting') && dry < 0.85) {
    [[-8, -44], [6, -50], [10, -36], [-12, -30], [2, -38], [-3, -58], [14, -30], [-14, -38], [7, -42]].forEach(d =>
      circle(ctx, d[0] * S + w, d[1] * S, 2.2 * S * (1 - dry * 0.6), P('#f3b8c6')));
  }
  // fruit + a bird's nest
  if (stage === 'fruiting' && dry < 0.7) {
    [[-9, -36], [9, -45], [3, -30], [-4, -52]].forEach(d => circle(ctx, d[0] * S + w, d[1] * S, 2.4 * S, P('#f08a4b')));
    const nx = 9 * S + w * 0.3, ny = -28 * S;
    oval(ctx, nx, ny, 4.5 * S, 2 * S, P('#8a6446'));
    const hop = Math.max(0, Math.sin(o.t * 2.2 + o.seed)) * 1.5 * S;
    circle(ctx, nx + 1 * S, ny - 3 * S - hop, 2.3 * S, P('#d97b5a'));
    circle(ctx, nx + 2 * S, ny - 3.6 * S - hop, 0.5 * S, '#2c2420');
    poly(ctx, [[nx + 3.2 * S, ny - 3.2 * S - hop], [nx + 5 * S, ny - 2.8 * S - hop], [nx + 3.2 * S, ny - 2.4 * S - hop]], P('#e9b949'));
  }
}

// Empty garden: a little mound with a sprout, waiting
export function drawSeed(ctx, P, s, t) {
  oval(ctx, 0, 0, 9 * s, 3.5 * s, P('#9b7454'));
  oval(ctx, 0, -1 * s, 7 * s, 2.5 * s, P('#b48a66'));
  const sw = Math.sin(t * 1.8) * 1 * s;
  ctx.strokeStyle = P('#5f8a48'); ctx.lineWidth = 1.6 * s; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, -1.5 * s); ctx.lineTo(sw, -8 * s); ctx.stroke();
  oval(ctx, sw - 2.4 * s, -8.5 * s, 2.6 * s, 1.3 * s, P('#7aa75c'), 0.5);
  oval(ctx, sw + 2.4 * s, -9 * s, 2.6 * s, 1.3 * s, P('#86b06a'), -0.5);
}

export function drawPlant(ctx, P, plant, o) {
  if (plant.kind === 'tree') return tree(ctx, P, o);
  if (plant.kind === 'bush') return bush(ctx, P, o);
  if (plant.type === 'note') return tulip(ctx, P, o);
  if (plant.type === 'goal') return sunflower(ctx, P, o);
  return daisy(ctx, P, o);
}

// Tap area for each plant (relative to its ground point)
export function plantBox(plant, s) {
  if (plant.kind === 'tree') {
    const size = plant.stage === 'young' ? 0.7 : 1;
    return { w: 34 * s * size, h: 68 * s * size };
  }
  if (plant.kind === 'bush') return { w: 30 * s, h: 26 * s };
  return { w: 16 * s, h: (plant.type === 'goal' ? 30 : 25) * s };
}

// ═══════════════════════════════════════════════════════════════
// LITTLE LIFE — butterflies, fireflies, companions, particles
// ═══════════════════════════════════════════════════════════════
export function drawButterfly(ctx, x, y, s, t, color, phase) {
  s *= 1.5;
  const f = 0.25 + 0.75 * Math.abs(Math.sin(t * 10 + phase));
  oval(ctx, x - 2.6 * s * f, y, 2.7 * s * f, 2.2 * s, color);
  oval(ctx, x + 2.6 * s * f, y, 2.7 * s * f, 2.2 * s, color);
  oval(ctx, x, y, 0.7 * s, 1.8 * s, '#5a3e2b');
}

export function drawFirefly(ctx, x, y, a) {
  circle(ctx, x, y, 5, `rgba(255,240,160,${(0.16 * a).toFixed(3)})`);
  circle(ctx, x, y, 1.6, `rgba(255,246,190,${(0.95 * a).toFixed(3)})`);
}

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
export function drawCompanion(ctx, x, y, emoji, size, hop) {
  oval(ctx, x, y + 2, size * 0.32 * (1 - hop / 30), size * 0.1, 'rgba(40,30,20,0.16)');
  ctx.font = `${Math.round(size)}px ${EMOJI_FONT}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.fillStyle = '#000'; // opaque! emojis inherit the alpha of the last fill colour
  ctx.fillText(emoji, x, y - hop);
}

export function drawParticle(ctx, p) {
  const a = Math.max(0, 1 - p.age / p.life);
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
  ctx.globalAlpha = a;
  oval(ctx, 0, 0, p.size, p.size * 0.55, p.color);
  ctx.restore();
}
