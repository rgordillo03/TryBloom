'use client';

import { LOCALES, LOCALE_LABELS, type Locale } from '@/lib/i18n';

type Props = {
  locale: Locale;
  onChange: (next: Locale) => void;
  label: string;
  align?: 'center' | 'right';
};

/**
 * A quiet segmented control. The browser language is detected
 * automatically — this is only for people whose browser guesses wrong
 * (expats, shared laptops, travellers).
 */
export default function LanguageSwitcher({ locale, onChange, label, align = 'right' }: Props) {
  return (
    <div
      role="group"
      aria-label={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        padding: 3,
        background: 'var(--bg-card)',
        border: '1px solid var(--card-border)',
        borderRadius: 10,
        margin: align === 'center' ? '0 auto' : 0,
      }}
    >
      {LOCALES.map((code) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            onClick={() => onChange(code)}
            aria-pressed={active}
            lang={code}
            style={{
              appearance: 'none',
              border: 'none',
              cursor: active ? 'default' : 'pointer',
              padding: '5px 9px',
              borderRadius: 7,
              fontFamily: 'Lora, serif',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.08em',
              lineHeight: 1,
              transition: 'background 0.2s ease, color 0.2s ease',
              background: active ? 'var(--terra)' : 'transparent',
              color: active ? '#fff' : 'var(--brown-l)',
            }}
            onMouseEnter={(e) => {
              if (!active) e.currentTarget.style.color = 'var(--terra-d)';
            }}
            onMouseLeave={(e) => {
              if (!active) e.currentTarget.style.color = 'var(--brown-l)';
            }}
          >
            {LOCALE_LABELS[code]}
          </button>
        );
      })}
    </div>
  );
}
