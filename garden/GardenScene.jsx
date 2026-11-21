'use client';

// ═══════════════════════════════════════════════════════════════
// GARDEN SCENE — the living, animated garden (React + <canvas>)
// ═══════════════════════════════════════════════════════════════
// React draws the box; a requestAnimationFrame loop paints ~30 frames a
// second inside it. Why a canvas and not SVG/HTML? Hundreds of swaying
// stems, particles and colour fades are much cheaper to paint than to
// keep as DOM elements — the phone stays cool and the battery happy.
//
// Props
//   garden       → result of buildGarden() (engine.js)
//   gardenId     → used for the island's look + "rain shown today" memory
//   gardenName   → painted on the wooden sign
//   gardenType   → 'solo' | 'couple' | 'group' (decides flower colours)
//   members      → [{ user_id, profiles: { avatar, display_name } }]
//   hourOverride → optional, force a time of day (for previews/testing)
// ═══════════════════════════════════════════════════════════════

import { useEffect, useRef } from 'react';
import * as D from './draw.js';
import { hash01 } from './engine.js';
import { avatarEmoji } from '../lib/avatars.js';

const FRAME_MS = 1000 / 30;                 // 30 fps is plenty for a calm garden
const grownThisSession = new Set();          // plants whose grow-in already played

/**
 * Type hints for TypeScript files that import this (the free version is TS).
 * @param {{
 *   garden: any, gardenId: string, gardenName?: string, gardenType?: string,
 *   members?: Array<{ user_id: string, profiles?: { avatar?: string | null, display_name?: string } }>,
 *   hourOverride?: number
 * }} props
 */
export default function GardenScene({ garden, gardenId, gardenName, gardenType, members = [], hourOverride }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  // The loop reads the latest props from here (so it never needs restarting).
  const propsRef = useRef({});
  propsRef.current = { garden, gardenId, gardenName, gardenType, members, hourOverride };
  // Animation state that lives between frames.
  const fx = useRef({
    taps: new Map(), hops: new Map(), born: new Map(), particles: [],
    rainStart: null, rainFrom: 0, last: 0, visible: true, layout: null,
  });

  // 🌧️ Coming back after drying out → rain shower, once per garden per day.
  useEffect(() => {
    if (!garden?.revivedToday) return;
    const key = `bloom-rain-${gardenId}-${new Date().toDateString()}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, '1');
    } catch { /* private mode: just show it */ }
    fx.current.rainStart = performance.now() + 400;
    fx.current.rainFrom = garden.revivedFrom;
  }, [garden?.revivedToday, garden?.revivedFrom, gardenId]);

  // 🌱 Plants born today grow in (once per app session), one after another.
  useEffect(() => {
    const now = performance.now();
    let k = 0;
    (garden?.plants || []).forEach(p => {
      if (p.isNew && !grownThisSession.has(p.id)) {
        grownThisSession.add(p.id);
        fx.current.born.set(p.id, now + 250 + k++ * 220);
      }
    });
  }, [garden]);

  // The animation loop — started once when the scene appears.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let W = 0, H = 0, raf = 0, lastPaint = 0;

    const resize = () => {
      const r = wrapRef.current.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(wrapRef.current);
    // Pause painting when the garden is scrolled out of view.
    const io = new IntersectionObserver(([e]) => { fx.current.visible = e.isIntersecting; });
    io.observe(canvas);

    const frame = now => {
      raf = requestAnimationFrame(frame);
      if (!fx.current.visible || document.hidden || !W) return;
      if (now - lastPaint < FRAME_MS) return;
      lastPaint = now;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fx.current.layout = paint(ctx, W, H, now, propsRef.current, fx.current, reduced);
    };
    raf = requestAnimationFrame(frame);

    const onTap = e => {
      const r = canvas.getBoundingClientRect();
      handleTap(e.clientX - r.left, e.clientY - r.top, fx.current, performance.now());
    };
    canvas.addEventListener('pointerdown', onTap);

    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      canvas.removeEventListener('pointerdown', onTap);
    };
  }, []);

  return (
    <div ref={wrapRef} style={{
      width: '100%', aspectRatio: '1 / 1.04', borderRadius: 22, overflow: 'hidden',
      position: 'relative', touchAction: 'manipulation', userSelect: 'none',
      boxShadow: 'inset 0 0 0 1px rgba(61,50,41,0.06)',
    }}>
      <canvas ref={canvasRef} role="img" aria-label={gardenName || 'Garden'}
        style={{ width: '100%', height: '100%', display: 'block', cursor: 'pointer' }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PAINT ONE FRAME
// ═══════════════════════════════════════════════════════════════
const easeOutBack = x => 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2);

function localHour() {
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60;
}

function paint(ctx, W, H, now, props, fx, reduced) {
  const t = reduced ? 0 : now / 1000;
  const dt = Math.min(0.06, (now - (fx.last || now)) / 1000);
  fx.last = now;
  const garden = props.garden || { plants: [], plotRing: 1, dryness: 0 }; // null = still loading
  const hour = props.hourOverride ?? localHour();
  const night = D.nightAt(hour);

  // ── Rain timeline (0 → 7 s): clouds, drops, colours return, rainbow
  let dry = garden.dryness, rain = 0, rainbow = 0;
  if (fx.rainStart !== null) {
    const e = (now - fx.rainStart) / 1000;
    if (e > 7.5) fx.rainStart = null;
    else if (e >= 0) {
      rain = e < 0.7 ? e / 0.7 : e > 4.6 ? Math.max(0, 1 - (e - 4.6) / 0.9) : 1;
      const p = Math.min(1, Math.max(0, (e - 1) / 3.2));
      dry = fx.rainFrom * (1 - p) + garden.dryness * p;
      if (e > 4.4) rainbow = Math.sin(Math.min(1, (e - 4.4) / 3.1) * Math.PI) * 0.55;
    } else {
      dry = fx.rainFrom;
    }
  }
  const P = D.makePaint(dry, night);
  const seed = Math.floor(hash01(props.gardenId || 'g') * 1000);

  D.drawSky(ctx, W, H, { hour, night, dry, t, rain });
  const g = D.islandGeometry(W, H, garden.plotRing || 1, reduced ? 0 : t);
  D.drawRainbow(ctx, g.cx, g.cy + g.B * 0.4, g.A * 1.05, rainbow);
  D.drawIsland(ctx, g, P, t, seed);
  D.drawSign(ctx, g, P, props.gardenName);

  // ── Colours per owner
  const memberIds = (props.members || []).map(m => m.user_id);
  const shared = props.gardenType && props.gardenType !== 'solo';
  const colorOf = (ownerId, plantId) => {
    const idx = memberIds.indexOf(ownerId);
    if (shared && idx >= 0) return D.MEMBER_COLORS[idx % D.MEMBER_COLORS.length];
    return D.SOLO_COLORS[Math.floor(hash01(plantId) * D.SOLO_COLORS.length)];
  };

  // ── Plants, back to front
  const boxes = [];
  if (garden.empty) {
    const [x, y] = D.cellToScreen(g, 0, 0);
    const hs = hopScale(fx.taps.get('seed'), now);
    ctx.save(); ctx.translate(x, y); ctx.scale(1 - (hs - 1) * 0.6, hs);
    D.drawSeed(ctx, P, g.s, t);
    ctx.restore();
    boxes.push({ id: 'seed', kind: 'seed', x, y, w: 24 * g.s, h: 16 * g.s, color: '#86b06a' });
  }

  const items = garden.plants.map(p => {
    const loose = p.kind === 'flower' ? 0.17 : 0.05;
    const [x, y] = D.cellToScreen(g, p.cell.i, p.cell.j, p.jitter.x * g.cw * loose, p.jitter.y * g.ch * loose);
    return { p, x, y };
  }).sort((a, b) => (a.p.cell.i + a.p.cell.j) - (b.p.cell.i + b.p.cell.j) || a.y - b.y);

  let flowerCount = 0;
  for (const { p, x, y } of items) {
    // grow-in
    let grow = 1;
    const bornAt = fx.born.get(p.id);
    if (bornAt !== undefined) {
      const e = (now - bornAt) / 1100;
      if (e <= 0) grow = 0.001;
      else if (e < 1) grow = Math.max(0.001, easeOutBack(e));
      else fx.born.delete(p.id);
    }
    // tap bounce: squash & stretch that wobbles out
    let sx = 1, sy = 1;
    const tappedAt = fx.taps.get(p.id);
    if (tappedAt !== undefined) {
      const e = (now - tappedAt) / 700;
      if (e < 1) { const w = Math.sin(e * Math.PI * 3) * (1 - e); sy = 1 + w * 0.24; sx = 1 - w * 0.14; }
      else fx.taps.delete(p.id);
    }
    const color = colorOf(p.owners[0], p.id);
    const colors = p.owners.length > 1 || shared
      ? p.owners.map(o => colorOf(o, p.id + o))
      : [0, 1, 2].map(k => D.SOLO_COLORS[Math.floor(hash01(p.id + k) * D.SOLO_COLORS.length)]);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sx * grow, sy * grow);
    D.drawPlant(ctx, P, p, {
      s: g.s, t, dry, color, colors, stage: p.stage, seed: hash01(p.id),
      petal: mixHex('#f2b632', color, 0.3),
    });
    ctx.restore();
    if (p.kind === 'flower') flowerCount++;
    boxes.push({ id: p.id, kind: p.kind, x, y, color, ...D.plantBox(p, g.s) });
  }

  // ── Companions: each member's avatar sits on the front edge of the island
  const companions = [];
  const withAvatar = (props.members || []).filter(m => avatarEmoji(m.profiles?.avatar));
  const n = withAvatar.length;
  withAvatar.forEach((m, k) => {
    const spread = Math.min(34, (g.A * 1.2) / Math.max(1, n));
    const x = g.cx + (k - (n - 1) / 2) * spread;
    const y = g.cy + g.B - Math.abs(x - g.cx) * 0.5 - 2;
    const idle = reduced ? 0 : Math.max(0, Math.sin(t * 1.6 + k * 1.7)) * 1.5;
    const tapHop = hopHeight(fx.hops.get(m.user_id), now);
    const size = Math.max(16, Math.min(24, 20 * g.s));
    D.drawCompanion(ctx, x, y, avatarEmoji(m.profiles.avatar), size, idle + tapHop);
    companions.push({ id: m.user_id, x, y: y - size / 2, r: size * 0.7 });
  });

  // ── Butterflies by day, fireflies by night (only in a healthy garden)
  if (!reduced && dry < 0.5 && night < 0.6 && flowerCount + (garden.counts?.bushes || 0) > 0) {
    const count = Math.min(3, Math.ceil((flowerCount + (garden.counts?.bushes || 0) * 3) / 5));
    const colors = ['#e98aa0', '#f2c14e', '#b8a4e3'];
    for (let k = 0; k < count; k++) {
      const bx = g.cx + Math.sin(t * 0.33 + k * 2.1) * g.A * 0.62;
      const by = g.cy - g.B * 0.25 + Math.sin(t * 0.61 + k * 1.3) * g.B * 0.45 - 28 * g.s;
      D.drawButterfly(ctx, bx, by, Math.max(0.8, g.s), t, colors[k], k);
    }
  }
  if (!reduced && night > 0.3 && dry < 0.7) {
    for (let k = 0; k < 9; k++) {
      const fxp = g.cx + Math.sin(t * 0.21 + k * 1.9) * g.A * 0.8;
      const fyp = g.cy - g.B * 0.4 + Math.cos(t * 0.27 + k * 2.3) * g.B * 0.7 - 10;
      D.drawFirefly(ctx, fxp, fyp, night * (0.5 + 0.5 * Math.sin(t * 2.3 + k * 4)));
    }
  }

  // ── Falling leaves while the garden dries out
  if (!reduced && dry > 0.45 && items.length && Math.random() < 0.05 * dry) {
    const it = items[Math.floor(Math.random() * items.length)];
    fx.particles.push({
      x: it.x + (Math.random() - 0.5) * 14 * g.s, y: it.y - 18 * g.s,
      vx: 6 + Math.random() * 10, vy: 6, g: 18, age: 0, life: 2.4,
      size: 2.2 * g.s + 1, rot: Math.random() * 6, vr: 1.5, color: Math.random() < 0.5 ? '#b8935f' : '#c9a46c',
    });
  }

  // ── Particles (tap bursts, falling leaves)
  fx.particles = fx.particles.filter(p => (p.age += dt) < p.life);
  for (const p of fx.particles) {
    p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    D.drawParticle(ctx, p);
  }

  D.drawRain(ctx, W, H, t, rain);

  return { boxes, companions, g };
}

// ═══════════════════════════════════════════════════════════════
// TAPS — a little bounce + a puff of petals. Nothing opens.
// ═══════════════════════════════════════════════════════════════
function hopScale(tappedAt, now) {
  if (tappedAt === undefined) return 1;
  const e = (now - tappedAt) / 700;
  return e < 1 ? 1 + Math.sin(e * Math.PI * 3) * (1 - e) * 0.2 : 1;
}
function hopHeight(tappedAt, now) {
  if (tappedAt === undefined) return 0;
  const e = (now - tappedAt) / 600;
  return e < 1 ? Math.sin(e * Math.PI) * 12 : 0;
}

function burst(fx, x, y, colors, count, power = 1) {
  for (let k = 0; k < count; k++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
    const v = (45 + Math.random() * 55) * power;
    fx.particles.push({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 140, age: 0, life: 0.8 + Math.random() * 0.5,
      size: 1.6 + Math.random() * 1.8, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 8,
      color: colors[k % colors.length],
    });
  }
}

function handleTap(x, y, fx, now) {
  const L = fx.layout;
  if (!L) return;
  const buzz = () => { try { navigator.vibrate?.(8); } catch { /* not supported */ } };
  for (const c of L.companions) {
    if (Math.hypot(x - c.x, y - c.y) < c.r) {
      fx.hops.set(c.id, now); burst(fx, c.x, c.y, ['#fff3c4', '#f6c5d0'], 6, 0.7); buzz(); return;
    }
  }
  for (let k = L.boxes.length - 1; k >= 0; k--) {           // front-most first
    const b = L.boxes[k];
    if (x >= b.x - b.w / 2 && x <= b.x + b.w / 2 && y >= b.y - b.h && y <= b.y + 5) {
      fx.taps.set(b.id, now);
      const colors = b.kind === 'flower' ? [b.color, '#ffffff', b.color]
        : b.kind === 'tree' ? ['#86b06a', '#f3b8c6', '#a7c98a'] : ['#86b06a', b.color, '#a7c98a'];
      burst(fx, b.x, b.y - b.h * 0.7, colors, b.kind === 'tree' ? 10 : 7);
      buzz();
      return;
    }
  }
  // Tapped bare grass: a tiny sparkle
  const g = L.g;
  if (Math.abs(x - g.cx) / g.A + Math.abs(y - g.cy) / g.B <= 1) burst(fx, x, y, ['#c8e6a8', '#ffffff'], 4, 0.5);
}

function mixHex(a, b, k) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = sh => Math.round(((pa >> sh) & 255) * (1 - k) + ((pb >> sh) & 255) * k);
  return '#' + [16, 8, 0].map(sh => ch(sh).toString(16).padStart(2, '0')).join('');
}
