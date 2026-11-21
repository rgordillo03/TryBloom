# 🌸 Bloom Try — Standalone Free Experience

The free public taste of Bloom. Users can visit, enter their name, read a daily quote and question, and plant blooms — all without signing up. No database, no persistence.

## What this is

- **A standalone Next.js 14 app**, deployed separately from the main marketing site
- **URL target:** `try.trybloom.co` (or wherever you deploy)
- **Not connected to Supabase** — completely ephemeral
- **Vercel Analytics** enabled — tracks page visits + custom events

## Languages 🌍

The app detects the visitor's **browser language** and serves Bloom in **German, English or Spanish**. A visitor with a German browser lands on a fully German page — no click needed.

**Detection order** (`lib/i18n.ts`):
1. A manual choice previously saved in `localStorage` (`bloom_try_locale`)
2. `navigator.languages`, in the browser's own priority order
3. `navigator.language`
4. English fallback

Regional tags collapse to their base language, so `de-AT`, `de-CH` → German and `es-MX`, `es-AR` → Spanish. Anything unsupported (e.g. French) falls back to English.

The `<title>`, meta description, OG tags and `<html lang>` are resolved **server-side** from the `Accept-Language` header, so the page is already correct before any JS runs — this matters for SEO and for link previews shared on WhatsApp/Instagram.

A quiet `DE · EN · ES` switcher sits in the header (and under the welcome form) for anyone whose browser guesses wrong — expats, shared laptops, travellers. The choice persists and survives a session reset.

### Adding a fourth language

1. Add the code to `Locale`, `LOCALES` and `LOCALE_LABELS` in `lib/i18n.ts`
2. Add an entry to `DICT`, `QUESTIONS_BY_LOCALE` and `QUOTES_BY_LOCALE`

TypeScript will flag any string you forget.

## Features

- Automatic language detection (DE / EN / ES) with manual override
- Name entry (stored in browser localStorage only)
- Daily rotating quote from a curated list
- Daily rotating reflection question
- Optional textarea to answer the question
- "Plant Bloom" button always active — planting works with or without answering
- Session-based streak & bloom counter (grows during the visit)
- Beautiful bloom animation on plant
- "A bloom is planted" confirmation screen (matches website demo)
- Soft upsell links to `trybloom.co/pricing` (opens in new tab)

## Analytics events tracked

- `name_entered` — when user submits their name
- `bloom_planted` — when they plant a bloom (with `hadAnswer: boolean` prop)
- `another_moment` — when they click "Another moment"
- `signup_click` — when they click "Get the real Bloom"
- `locale_changed` — when they switch language manually (with `locale` prop)

## Deploy to Vercel

### Option 1: Deploy from GitHub

1. Push this folder to a NEW GitHub repo called `bloom-try`
2. Go to vercel.com/new
3. Import the `bloom-try` repo
4. Framework: Next.js (auto-detected)
5. Click Deploy — no environment variables needed
6. Once live, add custom domain: `try.trybloom.co`

### Option 2: Deploy from local

```bash
cd bloom-try
npm install
npx vercel --prod
```

## Setting up the subdomain `try.trybloom.co`

If your main domain is `trybloom.co`:

1. In your DNS provider (Namecheap, GoDaddy, Cloudflare, etc.)
2. Add a CNAME record:
   - **Type:** CNAME
   - **Host/Name:** `try`
   - **Value/Target:** `cname.vercel-dns.com`
3. In Vercel project settings for `bloom-try`:
   - Go to Settings → Domains → Add
   - Enter: `try.trybloom.co`
   - Vercel confirms the CNAME setup automatically

That's it! `try.trybloom.co` will point to this free experience.

## Local development

```bash
cd bloom-try
npm install
npm run dev
```

Open http://localhost:3000

## Structure

```
bloom-try/
├── app/
│   ├── globals.css       # All design tokens + animations
│   ├── layout.tsx        # Fonts + Analytics
│   └── page.tsx          # The whole app (welcome + main + planted)
├── components/
│   ├── BloomLogo.tsx        # Your real flower logo (inline SVG)
│   ├── Flower.tsx           # The blooming flower with stem + leaves
│   └── LanguageSwitcher.tsx # DE · EN · ES segmented control
├── lib/
│   ├── i18n.ts           # Locale detection + all DE/EN/ES content
│   └── data.ts           # Legacy re-export shim (English set)
├── package.json
├── tsconfig.json
├── next.config.js
└── next-env.d.ts
```
