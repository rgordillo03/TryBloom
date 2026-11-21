'use client';
// ═══════════════════════════════════════════════════════════════
// GARDEN SECTION — the living garden on the free page
// ═══════════════════════════════════════════════════════════════
// status line → garden → next milestone → stats → rules → "only here" nudge
// The garden itself (GardenScene) and its rules (engine) are the exact
// same files as in the real Bloom app — see garden/config.js.
// ═══════════════════════════════════════════════════════════════
import { forwardRef } from 'react';
import GardenScene from '@/garden/GardenScene.jsx';
import type { Dictionary } from '@/lib/i18n';

// What buildGarden() returns (only the parts we read here).
export type GardenState = {
  empty: boolean;
  status: 'empty' | 'fresh' | 'fading' | 'thirsty' | 'dying' | 'revived';
  streak: number;
  bestStreak: number;
  todayActive: boolean;
  diedSoFar: number;
  totalActions: number;
  nextMilestone: { kind: 'bush' | 'tree'; inDays: number };
  counts: { flowers: number; bushes: number; trees: number; total: number };
};

const STATUS_COLOR: Record<GardenState['status'], string> = {
  empty: 'var(--sage-d)', fresh: 'var(--sage-d)', revived: 'var(--sage-d)',
  fading: 'var(--terra)', thirsty: 'var(--terra-d)', dying: '#B4483B',
};

type Props = {
  t: Dictionary;
  garden: GardenState;
  gardenId: string;
  name: string;
  avatar: string | null;
  hourOverride?: number;
  pricingUrl: string;
  onSignupClick: () => void;
};

const GardenSection = forwardRef<HTMLDivElement, Props>(function GardenSection(
  { t, garden: g, gardenId, name, avatar, hourOverride, pricingUrl, onSignupClick }, ref,
) {
  // What's next? Keep the streak alive, or the next bush / tree.
  let milestone: { icon: string; text: string } | null = null;
  if (!g.empty && g.streak > 0 && !g.todayActive) {
    milestone = { icon: '💧', text: t.keepStreak(g.streak) };
  } else if (!g.empty && (g.status === 'fresh' || g.status === 'revived')) {
    const { kind, inDays } = g.nextMilestone;
    milestone = kind === 'tree'
      ? { icon: '🌳', text: t.nextTree(inDays) }
      : { icon: '🌿', text: t.nextBush(inDays) };
  }

  // The scene shows the visitor's avatar as a little companion.
  const members = avatar ? [{ user_id: 'me', profiles: { avatar, display_name: name } }] : [];

  return (
    <section ref={ref} style={{ marginTop: 26, textAlign: 'center', scrollMarginTop: 20 }}>
      <p style={{
        fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em',
        color: 'var(--sage-d)', fontWeight: 600, marginBottom: 6,
      }}>
        {t.gardenTitle}
      </p>
      <p style={{
        fontSize: 13, color: STATUS_COLOR[g.status], fontStyle: 'italic', lineHeight: 1.5,
        marginBottom: g.status === 'dying' && g.diedSoFar > 0 ? 2 : 12, padding: '0 8px',
      }}>
        {t.gardenStatus[g.status]}
      </p>
      {g.status === 'dying' && g.diedSoFar > 0 && (
        <p style={{ fontSize: 11, color: '#B4483B', opacity: 0.8, marginBottom: 12 }}>{t.diedSoFar(g.diedSoFar)}</p>
      )}

      <GardenScene
        garden={g}
        gardenId={gardenId}
        gardenName={name}
        gardenType="solo"
        members={members}
        hourOverride={hourOverride}
      />

      {g.empty && (
        <p style={{ fontSize: 12, color: 'var(--brown-l)', fontStyle: 'italic', margin: '10px 16px 0', lineHeight: 1.5 }}>
          {t.gardenEmptyHint}
        </p>
      )}

      {milestone && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
          background: 'var(--sage-bg)', borderRadius: 14, padding: '10px 14px', marginTop: 14,
        }}>
          <span style={{ fontSize: 18 }}>{milestone.icon}</span>
          <p style={{ fontSize: 12, color: 'var(--brown-m)', lineHeight: 1.45 }}>{milestone.text}</p>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 14 }}>
        {[
          { v: g.streak, l: t.statStreak, i: '🔥' },
          { v: g.counts.total, l: t.statPlants, i: '🌸' },
          { v: g.bestStreak, l: t.statBest, i: '🏆' },
        ].map((s) => (
          <div key={s.l} style={{
            flex: 1, background: 'var(--bg-card)', borderRadius: 14, padding: '12px 6px',
            border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-soft)',
          }}>
            <p style={{ fontSize: 13, marginBottom: 2 }}>{s.i}</p>
            <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, color: 'var(--ink)', lineHeight: 1.2 }}>{s.v}</p>
            <p style={{ fontSize: 9, color: 'var(--brown-l)', letterSpacing: '0.06em' }}>{s.l}</p>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 11, color: 'var(--brown-l)', marginTop: 12, lineHeight: 1.5, padding: '0 6px' }}>
        {t.gardenRules}
      </p>
      <p style={{ fontSize: 12, color: 'var(--brown-l)', fontStyle: 'italic', marginTop: 8 }}>
        {t.onlyOnThisPhone}{' '}
        <a href={pricingUrl} target="_blank" rel="noopener noreferrer" onClick={onSignupClick}
          style={{ color: 'var(--terra-d)', fontWeight: 600, textDecoration: 'none', borderBottom: '1px solid var(--terra-l)', whiteSpace: 'nowrap' }}>
          {t.keepItSafe}
        </a>
      </p>
    </section>
  );
});

export default GardenSection;
