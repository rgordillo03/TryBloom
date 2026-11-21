# 🌿 Bloom Free: Phase 2 (living garden + settings)

The free version now has the same living garden as the real app, and a settings
window. Still no database and no login: everything lives in the visitor's browser.

---

## What changed

| File | New or changed | What it does |
|---|---|---|
| `app/page.tsx` | changed | Garden on the main page. Settings gear. Streak and bloom count now come from the garden (**bug fix**: the old streak never went above 1 day). |
| `lib/i18n.ts` | changed | New EN / DE / ES texts. "Nothing is saved" became "Everything stays in your browser", because the garden is now kept. |
| `components/GardenSection.tsx` | **new** | Status line, garden, next milestone, stats, the "lives only in this browser" nudge |
| `components/SettingsSheet.tsx` | **new** | Avatar (5), name, language, start over |
| `garden/config.js` · `engine.js` · `draw.js` · `GardenScene.jsx` | **new** | The garden, copied from the real app's `src/garden/` |
| `lib/dates.js` · `lib/avatars.js` | **new** | Local dates and the avatar list, copied from the real app |
| `docs/FREE-PHASE-2-GUIDE.md` | **new** | This guide |

**Same rules as the real app:** one answer a day plants a flower; 7 days in a row
grow a bush; 14 days a tree; from the 7th quiet day one plant dies per day. No
growth limit. People still have reasons to buy: a backup, more than one phone,
shared gardens, notes and goals, and the bamboo card.

**What the browser remembers** (localStorage):

| Key | Holds |
|---|---|
| `bloom_try_history` | every bloom planted: `[{ id, createdAt }]` |
| `bloom_try_avatar` | `sprout` · `blossom` · `mushroom` · `moon` · `sun` |
| `bloom_try_garden_id` | a random id that makes each visitor's island shape unique |
| `bloom_try_name`, `bloom_try_locale`, `bloom_try_planted_date`, `bloom_try_reflection` | same as before |

Visitors from before this update keep their last bloom, so nobody starts
from zero.

> 🔁 **Two copies of the garden.** `garden/` here and `src/garden/` in the real app
> are the same code, with two small additions here: `'use client'` at the top of
> `GardenScene.jsx`, and type comments for TypeScript. When you change a rule or a
> drawing in one, copy the file to the other.

---

## 1. Try it on your computer first (easier than the real app: no keys needed)

1. Unzip `bloom-free-phase2.zip` (it's the complete free app), then open the folder in VS Code → Terminal → New Terminal
2. `npm install` (first time only)
3. `npm run dev` → Ctrl+click **http://localhost:3000** (Next.js uses port 3000, the real app uses 5173)
4. Test the flow: enter a name → answer → **Plant Bloom** → after the celebration the page scrolls to your garden and the flower grows in
5. Time travel: `http://localhost:3000/?garden-days=10` (dying) · `?garden-hour=22` (night)

---

## 2. Upload to GitHub on a new branch

Same steps as the real app, just in the other repo:

1. Open **github.com/rgordillo03/Try-Bloom-Multilingual**, branch **main**
2. **Add file → Upload files**
3. From the unzipped folder, drag **only these 5 folders**: **`app`, `components`, `garden`, `lib`, `docs`** (Chrome or Edge).
   Never drag `node_modules` or `.next`: they appear after `npm install` / `npm run dev` and are thousands of files.
4. You should see **17 files**. Six of them are unchanged (`globals.css`, `layout.tsx`, `BloomLogo.tsx`, `Flower.tsx`,
   `LanguageSwitcher.tsx`, `data.ts`). Uploading them again is harmless; GitHub only records real changes.
5. Commit message: `Free version: living garden + settings`
   → **Create a new branch for this commit and start a pull request**
   → branch name `phase-2-garden` → **Propose changes** → **Create pull request**

## 3. Preview and test

Open the Vercel bot's **Visit Preview** link on your phone. This app has no Supabase
keys, so the preview works straight away.

- [ ] New visitor: name → answer → plant → the garden shows the new flower
- [ ] Gear → pick an avatar → it shows next to your name and sits on the island
- [ ] Gear → change your name → the wooden sign on the island changes too
- [ ] Gear → language → everything switches (DE / EN / ES)
- [ ] Gear → Start over → back to the welcome screen with an empty garden
- [ ] `?garden-days=5` (thirsty) and `?garden-days=10` (dying) on the preview link

## 4. Set the launch date, then merge

On the `phase-2-garden` branch: `garden/config.js` → ✏️ → set `launchDate` to your
merge day → commit to that branch. Then open the PR → **Merge pull request**.

> 💡 **Order:** this gives free visitors the garden. If you want paying customers
> to get it first, merge the real app's Phase 2 before this one.

**Undo:** Vercel → Deployments → promote the previous one, or click **Revert** on the merged PR.
