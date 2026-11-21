'use client';
// ═══════════════════════════════════════════════════════════════
// SETTINGS SHEET — name, avatar, language, start over
// ═══════════════════════════════════════════════════════════════
// Same idea as the "You" section in the real Bloom app, but everything
// is saved only in this browser (localStorage), never sent anywhere.
// ═══════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AVATARS } from '@/lib/avatars.js';
import { LOCALES, type Dictionary, type Locale } from '@/lib/i18n';

const LANGUAGE_NAMES: Record<Locale, { flag: string; label: string }> = {
  de: { flag: '🇩🇪', label: 'Deutsch' },
  en: { flag: '🇬🇧', label: 'English' },
  es: { flag: '🇪🇸', label: 'Español' },
};

const sectionLabel: React.CSSProperties = {
  fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em',
  color: 'var(--sage-d)', fontWeight: 600, marginBottom: 10,
};
const fieldLabel: React.CSSProperties = {
  fontSize: 12, color: 'var(--brown-m)', display: 'block', marginBottom: 6,
};

type Props = {
  t: Dictionary;
  name: string;
  avatar: string | null;
  locale: Locale;
  onSaveName: (name: string) => void;
  onChangeAvatar: (id: string) => void;
  onChangeLocale: (locale: Locale) => void;
  onStartOver: () => void;
  onClose: () => void;
};

export default function SettingsSheet({
  t, name, avatar, locale, onSaveName, onChangeAvatar, onChangeLocale, onStartOver, onClose,
}: Props) {
  const [draft, setDraft] = useState(name);
  const [confirmReset, setConfirmReset] = useState(false);
  useEffect(() => setDraft(name), [name]);

  const trimmed = draft.trim();
  const nameChanged = trimmed.length > 0 && trimmed !== name;

  // createPortal renders the sheet straight into <body>. The page's
  // fade-in animation leaves a CSS transform on its container, and a
  // transform makes `position: fixed` stick to that container instead of
  // the screen — so without the portal the sheet would open at the very
  // bottom of the page instead of over what you're looking at.
  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(61,50,41,0.35)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        animation: 'fadeIn 0.25s ease both',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.settingsTitle}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto',
          background: 'var(--bg)', borderRadius: '24px 24px 0 0',
          padding: '22px 22px 30px', boxShadow: 'var(--shadow-lifted)',
          animation: 'fadeUp 0.3s ease both',
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--card-border)', margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: 22, color: 'var(--ink)', textAlign: 'center', marginBottom: 20 }}>{t.settingsTitle}</h2>

        <p style={sectionLabel}>{t.youSection}</p>

        {/* Avatar */}
        <label style={fieldLabel}>{t.avatarLabel}</label>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginBottom: 18 }}>
          {AVATARS.map((a) => {
            const active = avatar === a.id;
            return (
              <button
                key={a.id}
                type="button"
                aria-label={a.id}
                aria-pressed={active}
                onClick={() => onChangeAvatar(a.id)}
                style={{
                  flex: 1, aspectRatio: '1 / 1', maxWidth: 58, borderRadius: '50%',
                  background: active ? 'linear-gradient(135deg, var(--peach), var(--blush))' : 'var(--bg-card)',
                  border: active ? '2px solid var(--terra)' : '1px solid var(--card-border)',
                  fontSize: 24, lineHeight: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transform: active ? 'scale(1.06)' : 'none', transition: 'all 0.2s',
                }}
              >
                {a.emoji}
              </button>
            );
          })}
        </div>

        {/* Name */}
        <label style={fieldLabel} htmlFor="settings-name">{t.yourName}</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
          <input
            id="settings-name"
            value={draft}
            maxLength={30}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && nameChanged && onSaveName(trimmed)}
            style={{
              flex: 1, minWidth: 0, padding: '12px 14px', fontSize: 16,
              background: 'var(--bg-card)', border: '1.5px solid var(--card-border)',
              borderRadius: 12, color: 'var(--brown)', outline: 'none',
            }}
          />
          <button
            type="button"
            className="btn btn-primary"
            disabled={!nameChanged}
            onClick={() => onSaveName(trimmed)}
            style={{ padding: '12px 18px', opacity: nameChanged ? 1 : 0.4 }}
          >
            {t.save}
          </button>
        </div>
        <p style={{ fontSize: 11, color: 'var(--brown-l)', fontStyle: 'italic', marginBottom: 18 }}>{t.nameHint}</p>

        {/* Language */}
        <label style={fieldLabel}>{t.languageLabel}</label>
        <div role="group" aria-label={t.languageLabel}
          style={{ display: 'flex', gap: 6, background: 'var(--bg-card)', borderRadius: 12, padding: 4, marginBottom: 26, border: '1px solid var(--card-border)' }}>
          {LOCALES.map((code) => {
            const active = code === locale;
            return (
              <button
                key={code}
                type="button"
                lang={code}
                aria-pressed={active}
                onClick={() => onChangeLocale(code)}
                style={{
                  flex: 1, padding: '10px 4px', borderRadius: 10, fontSize: 13,
                  background: active ? 'var(--bg)' : 'transparent',
                  border: active ? '1px solid var(--terra)' : '1px solid transparent',
                  color: active ? 'var(--brown)' : 'var(--brown-l)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <span style={{ fontSize: 15 }}>{LANGUAGE_NAMES[code].flag}</span>
                {LANGUAGE_NAMES[code].label}
              </button>
            );
          })}
        </div>

        {/* Start over */}
        <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: 18 }}>
          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              style={{
                width: '100%', padding: 12, borderRadius: 12, background: 'transparent',
                border: '1px solid var(--card-border)', color: 'var(--terra-d)', fontSize: 13,
              }}
            >
              {t.startOver}
            </button>
          ) : (
            <div style={{ textAlign: 'center', animation: 'fadeIn 0.2s ease both' }}>
              <p style={{ fontSize: 12, color: 'var(--brown-m)', marginBottom: 10 }}>{t.startOverHint}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setConfirmReset(false)}>
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={onStartOver}
                  style={{ flex: 1.4, padding: 12, borderRadius: 12, border: 'none', background: '#B4483B', color: '#fff', fontSize: 13 }}
                >
                  {t.startOverConfirm}
                </button>
              </div>
            </div>
          )}
        </div>

        <button type="button" className="btn btn-secondary" onClick={onClose} style={{ width: '100%', marginTop: 14 }}>
          {t.close}
        </button>
      </div>
    </div>,
    document.body,
  );
}
