'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { track } from '@vercel/analytics';
import BloomLogo from '@/components/BloomLogo';
import Flower from '@/components/Flower';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import GardenSection, { type GardenState } from '@/components/GardenSection';
import SettingsSheet from '@/components/SettingsSheet';
import { buildGarden } from '@/garden/engine.js';
import { GARDEN_RULES } from '@/garden/config.js';
import { localDateStr } from '@/lib/dates.js';
import { avatarEmoji } from '@/lib/avatars.js';
import {
  DICT,
  LOCALES,
  LOCALE_LABELS,
  LOCALE_STORAGE_KEY,
  QUESTIONS_BY_LOCALE,
  QUOTES_BY_LOCALE,
  detectLocale,
  getDayOfYear,
  getTimeOfDayGreeting,
  FLOWER_COLORS,
  type Locale,
} from '@/lib/i18n';

const PRICING_URL = 'https://oneculture.world/collections/bloom';

// Helper: today's date as YYYY-MM-DD string for localStorage
function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Phase 2: what the browser remembers for the garden ──────────────
// Still no database: everything lives in this visitor's localStorage.
const HISTORY_KEY = 'bloom_try_history';      // every bloom: [{ id, createdAt }]
const AVATAR_KEY = 'bloom_try_avatar';        // 'sprout' | 'blossom' | 'mushroom' | 'moon' | 'sun'
const GARDEN_ID_KEY = 'bloom_try_garden_id';  // makes each visitor's island shape unique
type Planted = { id: string; createdAt: string };

function loadHistory(): Planted[] {
  try {
    const list = JSON.parse(localStorage.getItem(HISTORY_KEY) || 'null');
    if (Array.isArray(list)) return list.filter((x) => x && x.id && x.createdAt);
    // Visitors from before Phase 2 only have their last bloom's date: keep that one.
    const legacy = localStorage.getItem('bloom_try_planted_date');
    if (legacy) return [{ id: `legacy-${legacy}`, createdAt: new Date(`${legacy}T12:00:00`).toISOString() }];
  } catch {
    // blocked storage (private mode): start with an empty garden
  }
  return [];
}

function saveHistory(list: Planted[]) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

// 🧪 Garden "time travel" for testing — changes only what this screen shows:
//   ?garden-days=10  → the garden 10 quiet days from now
//   ?garden-hour=22  → night sky
function readGardenTest() {
  if (typeof window === 'undefined') return { days: 0, hour: undefined as number | undefined };
  const q = new URLSearchParams(window.location.search);
  const days = Number(q.get('garden-days')) || 0;
  const hour = q.has('garden-hour') ? Number(q.get('garden-hour')) : undefined;
  return { days, hour: Number.isFinite(hour) ? hour : undefined };
}

export default function BloomTry() {
  const [mounted, setMounted] = useState(false);
  const [locale, setLocale] = useState<Locale>('en');
  const [name, setName] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);

  // Today's state
  const [answer, setAnswer] = useState('');
  const [showTextarea, setShowTextarea] = useState(false);
  const [hasPlantedToday, setHasPlantedToday] = useState(false);
  const [todaysReflection, setTodaysReflection] = useState<string | null>(null);
  const [showReflectionQuestion, setShowReflectionQuestion] = useState(false); // for flip

  // Phase 2: the garden. Streak + bloom count now come from the garden engine
  // (the old counters never went past a 1-day streak).
  const [history, setHistory] = useState<Planted[]>([]);           // saved blooms
  const [gardenHistory, setGardenHistory] = useState<Planted[]>([]); // what the garden shows (updates after the celebration)
  const [gardenId, setGardenId] = useState('try');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [gardenTest, setGardenTest] = useState<{ days: number; hour?: number }>({ days: 0 });
  const gardenRef = useRef<HTMLDivElement>(null);

  // Celebration state
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationColor, setCelebrationColor] = useState('#C17F59');
  const [hasSeenFirstCelebration, setHasSeenFirstCelebration] = useState(false);

  // Daily rotating content
  const [greeting, setGreeting] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ─── Everything text-related derives from the active locale ─
  const t = DICT[locale];
  const day = getDayOfYear();
  const questions = QUESTIONS_BY_LOCALE[locale];
  const quotes = QUOTES_BY_LOCALE[locale];
  const dailyQ = questions[day % questions.length];
  const dailyQuote = quotes[day % quotes.length];

  // ─── Phase 2: the garden, re-grown from the saved history ─
  // Same engine and rules as the real Bloom app (garden/engine.js).
  const garden = useMemo(() => {
    const now = new Date();
    const today = gardenTest.days ? localDateStr(new Date(now.getTime() + gardenTest.days * 86400000)) : localDateStr(now);
    return buildGarden({
      activities: gardenHistory.map((p) => ({ id: p.id, type: 'question', userId: 'me', createdAt: p.createdAt })),
      gardenId,
      today,
      // While time-travelling, pretend the garden launched today so ?garden-days=N shows N quiet days.
      rules: gardenTest.days ? { ...GARDEN_RULES, launchDate: localDateStr(now) } : GARDEN_RULES,
    }) as GardenState;
  }, [gardenHistory, gardenId, gardenTest.days]);

  // ─── On mount: load everything from localStorage, respecting today's date ─
  useEffect(() => {
    // Browser language (or a previously saved manual choice)
    const initialLocale = detectLocale();
    setLocale(initialLocale);
    setGreeting(getTimeOfDayGreeting(initialLocale));
    document.documentElement.lang = initialLocale;

    if (typeof window !== 'undefined') {
      const savedName = localStorage.getItem('bloom_try_name');
      if (savedName) {
        setName(savedName);
        setShowWelcome(false);
      }

      // Check if they've already planted TODAY specifically
      const plantedDate = localStorage.getItem('bloom_try_planted_date');
      const savedReflection = localStorage.getItem('bloom_try_reflection');

      if (plantedDate === todayKey()) {
        setHasPlantedToday(true);
        if (savedReflection) setTodaysReflection(savedReflection);
      }

      // Phase 2: garden history, avatar, and this visitor's own island shape
      const saved = loadHistory();
      setHistory(saved);
      setGardenHistory(saved);
      setAvatar(localStorage.getItem(AVATAR_KEY));
      let id = localStorage.getItem(GARDEN_ID_KEY);
      if (!id) {
        id = `try-${Math.random().toString(36).slice(2, 10)}`;
        localStorage.setItem(GARDEN_ID_KEY, id);
      }
      setGardenId(id);
      setGardenTest(readGardenTest());

      const seenCelebration = localStorage.getItem('bloom_try_seen_celebration');
      if (seenCelebration === 'true') setHasSeenFirstCelebration(true);
    }
    setMounted(true);
  }, []);

  const handleChangeLocale = (next: Locale) => {
    if (next === locale) return;
    setLocale(next);
    setGreeting(getTimeOfDayGreeting(next));
    document.documentElement.lang = next;
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // ignore blocked storage
    }
    track('locale_changed', { locale: next });
  };

  const handleNameSubmit = () => {
    const trimmed = name.trim();
    if (trimmed.length < 1) return;
    localStorage.setItem('bloom_try_name', trimmed);
    setName(trimmed);
    setShowWelcome(false);
    track('name_entered');
  };

  const handlePlantBloom = () => {
    const trimmedAnswer = answer.trim();
    const hadAnswer = trimmedAnswer.length > 0;

    // Phase 2: add this bloom to the garden history (streak + count follow from it)
    const now = new Date();
    const newHistory = [...history, { id: `q-${now.getTime()}`, createdAt: now.toISOString() }];
    setHistory(newHistory);
    saveHistory(newHistory);

    // Save the reflection for today (only if there was an answer)
    localStorage.setItem('bloom_try_planted_date', todayKey());

    if (hadAnswer) {
      localStorage.setItem('bloom_try_reflection', trimmedAnswer);
      setTodaysReflection(trimmedAnswer);
    } else {
      localStorage.removeItem('bloom_try_reflection');
      setTodaysReflection(null);
    }

    setHasPlantedToday(true);
    setShowTextarea(false);

    // Trigger the celebration animation
    const randomColor = FLOWER_COLORS[Math.floor(Math.random() * FLOWER_COLORS.length)];
    setCelebrationColor(randomColor);
    setShowCelebration(true);

    // Mark first celebration as seen
    if (!hasSeenFirstCelebration) {
      localStorage.setItem('bloom_try_seen_celebration', 'true');
      setHasSeenFirstCelebration(true);
    }

    // Auto-hide celebration after ~3.5s, then show the new flower growing in the garden
    setTimeout(() => {
      setShowCelebration(false);
      setGardenHistory(newHistory);
      gardenRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 3500);

    track('bloom_planted', { hadAnswer });
  };

  const handleCancel = () => {
    setAnswer('');
    setShowTextarea(false);
  };

  const handleSignupClick = () => {
    track('signup_click');
  };

  // ─── Settings (Phase 2) ─────────
  const handleSaveName = (next: string) => {
    localStorage.setItem('bloom_try_name', next);
    setName(next);
  };

  const handleChangeAvatar = (id: string) => {
    localStorage.setItem(AVATAR_KEY, id);
    setAvatar(id);
    track('avatar_chosen', { avatar: id });
  };

  const handleStartOver = () => {
    // Full reset — clears everything, useful for testing / privacy
    [
      'bloom_try_name', 'bloom_try_planted_date', 'bloom_try_reflection',
      'bloom_try_streak', 'bloom_try_total_blooms', 'bloom_try_seen_celebration',
      HISTORY_KEY, AVATAR_KEY,
    ].forEach((k) => localStorage.removeItem(k));
    // Note: the language choice is intentionally kept on reset.
    // A fresh garden gets a fresh island shape.
    const freshId = `try-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(GARDEN_ID_KEY, freshId);
    setGardenId(freshId);
    setName('');
    setHistory([]);
    setGardenHistory([]);
    setAvatar(null);
    setHasPlantedToday(false);
    setTodaysReflection(null);
    setHasSeenFirstCelebration(false);
    setShowSettings(false);
    setShowWelcome(true);
    track('start_over');
  };

  const handleFlipReflection = () => {
    setShowReflectionQuestion(prev => !prev);
    track('reflection_flipped');
  };

  // ─── LOADING STATE ─────────
  if (!mounted) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          opacity: 0.4,
          fontFamily: 'Playfair Display, serif',
          fontStyle: 'italic',
          color: 'var(--brown-l)',
        }}>
          {t.loading}
        </div>
      </main>
    );
  }

  // ─── SCREEN 1: WELCOME ─────────
  if (showWelcome) {
    return (
      <main style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        position: 'relative',
      }}>
        <div style={{
          position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
          background: `
            radial-gradient(ellipse 80% 50% at 30% 10%, rgba(181,199,169,0.22) 0%, transparent 55%),
            radial-gradient(ellipse 60% 40% at 80% 80%, rgba(232,196,184,0.25) 0%, transparent 60%)
          `,
        }} />

        <div style={{
          maxWidth: 380,
          width: '100%',
          textAlign: 'center',
          position: 'relative',
          zIndex: 2,
          animation: 'fadeUp 0.8s ease both',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <BloomLogo size={56} />
          </div>

          <h1 style={{ fontSize: 32, color: 'var(--ink)', marginBottom: 12 }}>
            {t.welcomeTitlePre} <em style={{ color: 'var(--terra-d)' }}>bloom</em>
          </h1>

          <p style={{
            fontFamily: 'Playfair Display, serif',
            fontStyle: 'italic',
            fontSize: 16,
            color: 'var(--brown-m)',
            lineHeight: 1.5,
            marginBottom: 36,
          }}>
            {t.welcomeSubLine1}<br />{t.welcomeSubLine2}
          </p>

          <div style={{
            background: 'var(--bg-card)',
            borderRadius: 18,
            padding: '26px 22px',
            border: '1px solid var(--card-border)',
            boxShadow: 'var(--shadow-soft)',
            marginBottom: 18,
          }}>
            <label htmlFor="name" style={{
              display: 'block',
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              color: 'var(--sage-d)',
              marginBottom: 12,
              fontWeight: 600,
            }}>
              {t.nameLabel}
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
              placeholder={t.namePlaceholder}
              autoFocus
              maxLength={30}
              style={{
                width: '100%',
                padding: '13px 16px',
                fontSize: 16,
                fontFamily: 'Playfair Display, serif',
                background: 'var(--bg)',
                border: '1.5px solid var(--card-border)',
                borderRadius: 12,
                color: 'var(--brown)',
                outline: 'none',
                marginBottom: 14,
                textAlign: 'center',
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--terra)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--card-border)'}
            />
            <button
              onClick={handleNameSubmit}
              disabled={name.trim().length < 1}
              className="btn btn-primary"
              style={{ width: '100%', padding: '13px' }}
            >
              {t.enterGarden}
            </button>
          </div>

          <p style={{
            fontSize: 11,
            color: 'var(--brown-l)',
            fontStyle: 'italic',
            opacity: 0.75,
          }}>
            {t.privacyLine1}<br />
            {t.privacyLine2}
          </p>

          {/* Language switcher — welcome screen */}
          <div style={{ marginTop: 22 }}>
            <LanguageSwitcher
              locale={locale}
              onChange={handleChangeLocale}
              label={t.languageLabel}
              align="center"
            />
          </div>
        </div>
      </main>
    );
  }

  // ─── SCREEN 2: MAIN APP ─────────
  return (
    <main style={{
      minHeight: '100vh',
      padding: '20px 20px 60px',
      position: 'relative',
    }}>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 80% 50% at 30% 10%, rgba(181,199,169,0.15) 0%, transparent 55%),
          radial-gradient(ellipse 60% 40% at 80% 80%, rgba(232,196,184,0.15) 0%, transparent 60%)
        `,
      }} />

      <div style={{
        maxWidth: 420,
        margin: '0 auto',
        position: 'relative',
        zIndex: 2,
        animation: 'fadeUp 0.5s ease both',
      }}>

        {/* Header: greeting + settings gear */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 18,
        }}>
          <div>
            <p style={{
              fontSize: 11,
              color: 'var(--sage)',
              marginBottom: 1,
              fontFamily: 'Lora, serif',
            }}>
              {greeting}
            </p>
            <h1 style={{ fontSize: 18, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
              {avatarEmoji(avatar) && <span style={{ fontSize: 18 }}>{avatarEmoji(avatar)}</span>}
              {name}
            </h1>
          </div>

          {/* Phase 2: one gear → Settings (name, avatar, language, start over) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => { setShowSettings(true); track('settings_opened'); }}
            aria-label={t.settingsTitle}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--card-border)',
              borderRadius: 10,
              width: 36,
              height: 36,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
            title={t.settingsTitle}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7A6A5A" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          </div>
        </div>

        {/* Streak card */}
        <div style={{
          background: 'var(--sage-bg)',
          borderRadius: 14,
          padding: '12px 16px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <span style={{ fontSize: 22, display: 'inline-block' }}>🌱</span>
          <div>
            <p style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--ink)',
              fontFamily: 'Lora, serif',
            }}>
              {garden.streak > 0
                ? t.streak(garden.streak)
                : garden.totalActions > 0 ? t.bloomsPlanted(garden.totalActions) : t.streakZero}
            </p>
            {garden.streak > 0 && (
              <p style={{ fontSize: 11, color: 'var(--brown-l)' }}>
                {t.bloomsPlanted(garden.totalActions)}
              </p>
            )}
          </div>
        </div>

        {/* Daily quote card */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 18,
          padding: '20px 22px',
          marginBottom: 16,
          boxShadow: 'var(--shadow-card)',
          border: '1px solid var(--card-border)',
        }}>
          <p style={{
            fontSize: 10,
            color: 'var(--sage)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: 10,
            fontWeight: 500,
          }}>
            {t.dailyBloom}
          </p>
          <p style={{
            fontFamily: 'Playfair Display, serif',
            fontStyle: 'italic',
            fontSize: 15,
            color: 'var(--ink)',
            lineHeight: 1.7,
            marginBottom: 10,
          }}>
            &ldquo;{dailyQuote.text}&rdquo;
          </p>
          <p style={{
            fontSize: 12,
            color: 'var(--sage)',
            fontWeight: 500,
          }}>
            — {dailyQuote.author}
          </p>
        </div>

        {/* ═══ EITHER: Question card (not yet planted) ═══ */}
        {!hasPlantedToday && !showTextarea && (
          <button
            onClick={() => setShowTextarea(true)}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #C17F59, #A66B45)',
              border: 'none',
              borderRadius: 16,
              padding: '20px 22px',
              textAlign: 'left',
              marginBottom: 16,
              boxShadow: '0 4px 18px rgba(193, 127, 89, 0.2)',
              cursor: 'pointer',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span>🌿</span>
              <span style={{
                fontSize: 10,
                color: 'rgba(255, 255, 255, 0.7)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}>
                {t.todaysQuestion} · {dailyQ.cat}
              </span>
            </div>
            <p style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: 15,
              color: '#fff',
              lineHeight: 1.5,
              marginBottom: 10,
            }}>
              {dailyQ.q}
            </p>
            <p style={{
              fontSize: 11,
              color: 'rgba(255, 255, 255, 0.55)',
            }}>
              {t.tapToAnswer}
            </p>
          </button>
        )}

        {/* ═══ EITHER: Question card + textarea (writing) ═══ */}
        {!hasPlantedToday && showTextarea && (
          <div style={{ animation: 'fadeUp 0.3s ease both' }}>
            <div style={{
              background: 'linear-gradient(135deg, #C17F59, #A66B45)',
              borderRadius: '16px 16px 0 0',
              padding: '20px 22px 14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span>🌿</span>
                <span style={{
                  fontSize: 10,
                  color: 'rgba(255, 255, 255, 0.7)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}>
                  {t.todaysQuestion} · {dailyQ.cat}
                </span>
              </div>
              <p style={{
                fontFamily: 'Playfair Display, serif',
                fontSize: 15,
                color: '#fff',
                lineHeight: 1.5,
              }}>
                {dailyQ.q}
              </p>
            </div>
            <div style={{
              background: 'var(--bg-card)',
              borderRadius: '0 0 16px 16px',
              padding: '14px 22px 18px',
              marginBottom: 14,
              border: '1px solid var(--card-border)',
              borderTop: 'none',
              boxShadow: 'var(--shadow-card)',
            }}>
              <textarea
                ref={textareaRef}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder={t.answerPlaceholder}
                autoFocus
                style={{
                  width: '100%',
                  minHeight: 100,
                  padding: '12px 14px',
                  fontSize: 14,
                  lineHeight: 1.6,
                  fontFamily: 'Playfair Display, serif',
                  fontStyle: answer ? 'normal' : 'italic',
                  background: 'var(--bg)',
                  border: '1.5px solid var(--card-border)',
                  borderRadius: 10,
                  color: 'var(--brown)',
                  outline: 'none',
                  resize: 'vertical',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--terra)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--card-border)'}
              />
            </div>
          </div>
        )}

        {/* ═══ OR: "Bloom is planted" card (already planted today) ═══ */}
        {hasPlantedToday && (
          <div style={{
            background: 'var(--sage-bg)',
            borderRadius: 16,
            padding: '24px 22px',
            marginBottom: 16,
            textAlign: 'center',
            animation: 'fadeUp 0.5s ease both',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: 12,
              animation: showCelebration ? 'flowerBurst 1.2s cubic-bezier(0.22,1,0.36,1) both' : 'none',
            }}>
              <span style={{ fontSize: 34 }}>🌸</span>
            </div>
            <p style={{
              fontFamily: 'Playfair Display, serif',
              fontStyle: 'italic',
              fontSize: 16,
              color: 'var(--sage-d)',
              fontWeight: 500,
              marginBottom: 6,
            }}>
              {t.plantedTitle}
            </p>
            <p style={{
              fontSize: 12,
              color: 'var(--brown-l)',
              fontFamily: 'Lora, serif',
            }}>
              {t.plantedSub}
            </p>
          </div>
        )}

        {/* ═══ Action buttons (only when NOT yet planted today) ═══ */}
        {!hasPlantedToday && (
          <div style={{
            display: 'flex',
            gap: 10,
            alignItems: 'stretch',
            marginBottom: 16,
          }}>
            {showTextarea && (
              <button
                onClick={handleCancel}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                {t.cancel}
              </button>
            )}
            <button
              onClick={handlePlantBloom}
              className="btn btn-primary"
              style={{
                flex: showTextarea ? 1.4 : 1,
                width: showTextarea ? undefined : '100%',
                padding: '14px 20px',
              }}
            >
              {t.plantBloom}
            </button>
          </div>
        )}

        {/* ═══ Phase 2: THE LIVING GARDEN ═══ */}
        <GardenSection
          ref={gardenRef}
          t={t}
          garden={garden}
          gardenId={gardenId}
          name={name}
          avatar={avatar}
          hourOverride={gardenTest.hour}
          pricingUrl={PRICING_URL}
          onSignupClick={handleSignupClick}
        />

        {/* ═══ TODAY'S REFLECTION FLIP CARD (only if answered) ═══ */}
        {hasPlantedToday && todaysReflection && (
          <div style={{ marginTop: 24, animation: 'fadeUp 0.6s ease 0.2s both' }}>
            <p style={{
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              color: 'var(--sage-d)',
              fontWeight: 600,
              marginBottom: 10,
              paddingLeft: 4,
              fontFamily: 'Lora, serif',
            }}>
              {t.todaysReflection}
            </p>

            <div
              className={`flip-card ${showReflectionQuestion ? 'flipped' : ''}`}
              onClick={handleFlipReflection}
              style={{ cursor: 'pointer', minHeight: 140 }}
            >
              <div className="flip-card-inner" style={{ minHeight: 140 }}>

                {/* FRONT: The answer */}
                <div
                  className="flip-card-face"
                  style={{
                    background: 'linear-gradient(135deg, rgba(232,196,184,0.35) 0%, rgba(240,213,200,0.25) 100%)',
                    borderRadius: 16,
                    padding: '18px 20px',
                    borderLeft: '3px solid var(--terra)',
                    minHeight: 140,
                    position: 'relative',
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    fontSize: 10,
                    color: 'var(--brown-l)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontFamily: 'Lora, serif',
                  }}>
                    <span style={{ fontSize: 12 }}>↻</span> {t.tapHint}
                  </div>
                  <p style={{
                    fontSize: 11,
                    color: 'var(--terra-d)',
                    fontWeight: 600,
                    marginBottom: 8,
                    fontFamily: 'Lora, serif',
                  }}>
                    {name} {t.you}
                  </p>
                  <p style={{
                    fontFamily: 'Playfair Display, serif',
                    fontStyle: 'italic',
                    fontSize: 16,
                    lineHeight: 1.55,
                    color: 'var(--brown)',
                    paddingRight: 40,
                  }}>
                    {todaysReflection}
                  </p>
                </div>

                {/* BACK: The question */}
                <div
                  className="flip-card-face flip-card-back"
                  style={{
                    background: 'linear-gradient(135deg, rgba(232,196,184,0.35) 0%, rgba(240,213,200,0.25) 100%)',
                    borderRadius: 16,
                    padding: '18px 20px',
                    borderLeft: '3px solid var(--terra)',
                    minHeight: 140,
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    fontSize: 10,
                    color: 'var(--brown-l)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontFamily: 'Lora, serif',
                  }}>
                    <span style={{ fontSize: 12 }}>↻</span> {t.tapHint}
                  </div>
                  <p style={{
                    fontSize: 11,
                    color: 'var(--terra-d)',
                    fontWeight: 600,
                    marginBottom: 8,
                    fontFamily: 'Lora, serif',
                    letterSpacing: '0.08em',
                  }}>
                    {t.questionLabel} · {dailyQ.cat.toUpperCase()}
                  </p>
                  <p style={{
                    fontFamily: 'Playfair Display, serif',
                    fontStyle: 'italic',
                    fontSize: 16,
                    lineHeight: 1.55,
                    color: 'var(--brown)',
                    paddingRight: 40,
                  }}>
                    {dailyQ.q}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ CELEBRATION OVERLAY (big flower burst on plant) ═══
            Rendered into <body> with createPortal so it covers the SCREEN.
            (The fade-in animation leaves a transform on this container, which
            would otherwise centre the overlay on the whole long page.) */}
        {showCelebration && createPortal(
          <div style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            pointerEvents: 'none',
            // Phase 2: a bit more solid, so the text stays readable over the garden
            background: 'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(250,247,242,0.96) 0%, rgba(250,247,242,0.55) 75%)',
            animation: 'fadeIn 0.4s ease both',
          }}>
            <div style={{
              textAlign: 'center',
              animation: 'bloomCelebrateIn 1s cubic-bezier(0.22,1,0.36,1) both',
            }}>
              <div style={{
                animation: 'flowerBurst 1.2s cubic-bezier(0.22,1,0.36,1) both, floatGentle 3s ease-in-out infinite 1.2s',
                marginBottom: 20,
              }}>
                <Flower color="#2F4032" centerColor={celebrationColor} size={100} />
              </div>
              <p style={{
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.25em',
                color: 'var(--sage-d)',
                fontWeight: 600,
                marginBottom: 10,
                fontFamily: 'Lora, serif',
                animation: 'fadeIn 0.6s ease 0.6s both',
              }}>
                {t.celebrationEyebrow}
              </p>
              <p style={{
                fontFamily: 'Playfair Display, serif',
                fontSize: 24,
                color: 'var(--ink)',
                marginBottom: 6,
                animation: 'fadeUp 0.8s ease 0.8s both',
              }}>
                {t.celebrationPlantedPre}{' '}
                <em style={{ color: 'var(--terra-d)' }}>{t.celebrationPlantedEm}</em> 🌸
              </p>
              <p style={{
                fontSize: 13,
                color: 'var(--brown-m)',
                fontFamily: 'Playfair Display, serif',
                fontStyle: 'italic',
                animation: 'fadeUp 0.8s ease 1.1s both',
              }}>
                {t.celebrationSub}
              </p>
            </div>
          </div>,
          document.body,
        )}

        {/* ═══ Phase 2: SETTINGS SHEET ═══ */}
        {showSettings && (
          <SettingsSheet
            t={t}
            name={name}
            avatar={avatar}
            locale={locale}
            onSaveName={handleSaveName}
            onChangeAvatar={handleChangeAvatar}
            onChangeLocale={handleChangeLocale}
            onStartOver={handleStartOver}
            onClose={() => setShowSettings(false)}
          />
        )}

        {/* Subtle footer with link to real site */}
        <div style={{
          marginTop: 50,
          textAlign: 'center',
          paddingTop: 20,
          borderTop: '1px solid var(--card-border)',
        }}>
          <p style={{
            fontSize: 12,
            color: 'var(--brown-l)',
            fontStyle: 'italic',
            lineHeight: 1.6,
            fontFamily: 'Lora, serif',
          }}>
            {hasPlantedToday ? (
              <>
                {t.footerPlanted}<br />
                <a
                  href={PRICING_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleSignupClick}
                  style={{
                    color: 'var(--terra-d)',
                    fontWeight: 600,
                    textDecoration: 'none',
                    borderBottom: '1px solid var(--terra-l)',
                  }}
                >
                  {t.getRealBloom}
                </a>
              </>
            ) : (
              <>
                {t.footerNotPlanted}{' '}
                <a
                  href={PRICING_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleSignupClick}
                  style={{
                    color: 'var(--terra-d)',
                    fontWeight: 600,
                    textDecoration: 'none',
                    borderBottom: '1px solid var(--terra-l)',
                  }}
                >
                  {t.getRealBloom}
                </a>
              </>
            )}
          </p>
        </div>
      </div>
    </main>
  );
}
