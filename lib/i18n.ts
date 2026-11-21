// ─── Locale system ────────────────────────────────────────
// Detects the visitor's browser language and serves Bloom in
// German, English or Spanish. Users can override manually.

export type Locale = 'en' | 'de' | 'es';

export const LOCALES: Locale[] = ['de', 'en', 'es'];
export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_STORAGE_KEY = 'bloom_try_locale';

export const LOCALE_LABELS: Record<Locale, string> = {
  de: 'DE',
  en: 'EN',
  es: 'ES',
};

/** Turn any language tag ("de-AT", "es_MX", "EN") into a supported Locale, or null. */
export function normalizeLocale(tag: string | undefined | null): Locale | null {
  if (!tag) return null;
  const base = tag.toLowerCase().replace('_', '-').split('-')[0];
  return (LOCALES as string[]).includes(base) ? (base as Locale) : null;
}

/**
 * Client-side detection order:
 *   1. Explicit user choice (localStorage)
 *   2. navigator.languages, in the browser's own priority order
 *   3. navigator.language
 *   4. English fallback
 */
export function detectLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;

  try {
    const saved = normalizeLocale(localStorage.getItem(LOCALE_STORAGE_KEY));
    if (saved) return saved;
  } catch {
    // localStorage can throw in private/blocked contexts — fall through
  }

  const candidates: string[] =
    navigator.languages && navigator.languages.length
      ? Array.from(navigator.languages)
      : [navigator.language];

  for (const tag of candidates) {
    const match = normalizeLocale(tag);
    if (match) return match;
  }

  return DEFAULT_LOCALE;
}

/** Server-side detection from the Accept-Language header (used for metadata). */
export function localeFromAcceptLanguage(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE;

  const parsed = header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const qParam = params.find((p) => p.trim().startsWith('q='));
      const q = qParam ? parseFloat(qParam.split('=')[1]) : 1;
      return { tag, q: Number.isNaN(q) ? 0 : q };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of parsed) {
    const match = normalizeLocale(tag);
    if (match) return match;
  }

  return DEFAULT_LOCALE;
}

// ─── UI strings ───────────────────────────────────────────

export type Dictionary = {
  meta: { title: string; description: string; ogDescription: string };
  loading: string;
  welcomeTitlePre: string;
  welcomeSubLine1: string;
  welcomeSubLine2: string;
  nameLabel: string;
  namePlaceholder: string;
  enterGarden: string;
  privacyLine1: string;
  privacyLine2: string;
  greetings: {
    lateNight: string;
    morning: string;
    afternoon: string;
    evening: string;
    night: string;
  };
  resetTitle: string;
  languageLabel: string;
  streakZero: string;
  streak: (days: number) => string;
  bloomsPlanted: (n: number) => string;
  dailyBloom: string;
  todaysQuestion: string;
  tapToAnswer: string;
  answerPlaceholder: string;
  cancel: string;
  plantBloom: string;
  plantedTitle: string;
  plantedSub: string;
  todaysReflection: string;
  you: string;
  questionLabel: string;
  tapHint: string;
  celebrationEyebrow: string;
  celebrationPlantedPre: string;
  celebrationPlantedEm: string;
  celebrationSub: string;
  footerPlanted: string;
  footerNotPlanted: string;
  getRealBloom: string;
  // ─── Phase 2: settings window ───
  settingsTitle: string;
  youSection: string;
  yourName: string;
  nameHint: string;
  avatarLabel: string;
  save: string;
  close: string;
  startOver: string;
  startOverHint: string;
  startOverConfirm: string;
  // ─── Phase 2: the garden ───
  gardenTitle: string;
  gardenStatus: { empty: string; fresh: string; fading: string; thirsty: string; dying: string; revived: string };
  gardenEmptyHint: string;
  diedSoFar: (n: number) => string;
  nextBush: (days: number) => string;
  nextTree: (days: number) => string;
  keepStreak: (days: number) => string;
  statStreak: string;
  statPlants: string;
  statBest: string;
  gardenRules: string;
  onlyOnThisPhone: string;
  keepItSafe: string;
};

export const DICT: Record<Locale, Dictionary> = {
  // ══════════════════════════ ENGLISH ══════════════════════
  en: {
    meta: {
      title: 'Bloom — Try it free',
      description:
        'A safe space to reflect. One tap a day. Try Bloom, free — no signup needed.',
      ogDescription: 'Tap. Reflect. Grow.',
    },
    loading: 'Loading your moment…',
    welcomeTitlePre: 'Welcome to',
    welcomeSubLine1: 'A safe space to reflect.',
    welcomeSubLine2: 'One tap a day.',
    nameLabel: 'What should we call you?',
    namePlaceholder: 'Your name',
    enterGarden: 'Enter your garden',
    privacyLine1: 'This is a free taste of Bloom.',
    privacyLine2: 'Everything stays in your browser. Nothing is sent anywhere.',
    greetings: {
      lateNight: 'Late night',
      morning: 'Good morning',
      afternoon: 'Good afternoon',
      evening: 'Good evening',
      night: 'Sweet night',
    },
    resetTitle: 'Reset your session',
    languageLabel: 'Language',
    streakZero: 'Plant your first bloom',
    streak: (d) => `${d} day streak!`,
    bloomsPlanted: (n) => `${n} bloom${n !== 1 ? 's' : ''} planted`,
    dailyBloom: 'Daily bloom',
    todaysQuestion: "Today's question",
    tapToAnswer: 'Tap to answer →',
    answerPlaceholder: 'Take a breath. Answer honestly, or just a few words…',
    cancel: 'Cancel',
    plantBloom: 'Plant Bloom 🌸',
    plantedTitle: "Today's bloom is planted!",
    plantedSub: 'Come back tomorrow for a new question',
    todaysReflection: "Today's reflection",
    you: '(you)',
    questionLabel: 'QUESTION',
    tapHint: 'tap',
    celebrationEyebrow: 'Your Garden',
    celebrationPlantedPre: 'A bloom is',
    celebrationPlantedEm: 'planted',
    celebrationSub: 'in your garden',
    footerPlanted: 'Share your garden with someone you love.',
    footerNotPlanted: 'Want to grow a garden together?',
    getRealBloom: 'Get the real Bloom →',
    settingsTitle: 'Settings',
    youSection: 'You',
    yourName: 'Your name',
    nameHint: 'Saved only in this browser.',
    avatarLabel: 'Your avatar',
    save: 'Save',
    close: 'Close',
    startOver: 'Start over',
    startOverHint: 'Deletes your name and your garden from this browser.',
    startOverConfirm: 'Yes, delete everything',
    gardenTitle: 'Your garden',
    gardenStatus: {
      empty: 'Your garden is waiting for its first seed',
      fresh: 'Your garden is blooming',
      fading: 'Your garden misses you. The colors are starting to fade.',
      thirsty: 'Your plants are thirsty. Water them today, or they start drying away.',
      dying: 'Your garden is drying away, one plant a day. Come back to save the rest.',
      revived: 'Welcome back! The rain brought your garden back to life.',
    },
    gardenEmptyHint: "Answer today's question to plant your first flower.",
    diedSoFar: (n) => (n === 1 ? '1 plant has dried away so far' : `${n} plants have dried away so far`),
    nextBush: (d) => (d === 1 ? "1 more day of streak and this week's flowers grow into a bush" : `${d} more days of streak and this week's flowers grow into a bush`),
    nextTree: (d) => (d === 1 ? '1 more day of streak and your bush grows into a tree' : `${d} more days of streak and your bush grows into a tree`),
    keepStreak: (d) => `Water your garden today to keep your ${d}-day streak`,
    statStreak: 'STREAK',
    statPlants: 'PLANTS',
    statBest: 'BEST',
    gardenRules: 'One answer a day plants a flower · 7 days in a row grow a bush · 14 days a tree',
    onlyOnThisPhone: 'This garden lives only in this browser.',
    keepItSafe: 'Keep it safe with Bloom →',
  },

  // ══════════════════════════ GERMAN ═══════════════════════
  de: {
    meta: {
      title: 'Bloom — Kostenlos ausprobieren',
      description:
        'Ein sicherer Ort zum Innehalten. Ein Tap pro Tag. Bloom kostenlos testen — ohne Anmeldung.',
      ogDescription: 'Tap. Innehalten. Wachsen.',
    },
    loading: 'Dein Moment wird geladen…',
    welcomeTitlePre: 'Willkommen bei',
    welcomeSubLine1: 'Ein sicherer Ort zum Innehalten.',
    welcomeSubLine2: 'Ein Tap pro Tag.',
    nameLabel: 'Wie dürfen wir dich nennen?',
    namePlaceholder: 'Dein Name',
    enterGarden: 'Zu deinem Garten',
    privacyLine1: 'Das ist ein kostenloser Vorgeschmack auf Bloom.',
    privacyLine2: 'Alles bleibt in deinem Browser. Nichts wird verschickt.',
    greetings: {
      lateNight: 'Späte Stunde',
      morning: 'Guten Morgen',
      afternoon: 'Guten Tag',
      evening: 'Guten Abend',
      night: 'Gute Nacht',
    },
    resetTitle: 'Sitzung zurücksetzen',
    languageLabel: 'Sprache',
    streakZero: 'Pflanze deine erste Blüte',
    streak: (d) => (d === 1 ? '1 Tag in Folge!' : `${d} Tage in Folge!`),
    bloomsPlanted: (n) => `${n} ${n === 1 ? 'Blüte' : 'Blüten'} gepflanzt`,
    dailyBloom: 'Blüte des Tages',
    todaysQuestion: 'Frage des Tages',
    tapToAnswer: 'Tippen zum Antworten →',
    answerPlaceholder: 'Atme kurz durch. Antworte ehrlich — auch ein paar Worte reichen…',
    cancel: 'Abbrechen',
    plantBloom: 'Blüte pflanzen 🌸',
    plantedTitle: 'Die Blüte für heute ist gepflanzt!',
    plantedSub: 'Komm morgen wieder für eine neue Frage',
    todaysReflection: 'Deine Reflexion heute',
    you: '(du)',
    questionLabel: 'FRAGE',
    tapHint: 'tippen',
    celebrationEyebrow: 'Dein Garten',
    celebrationPlantedPre: 'Eine Blüte ist',
    celebrationPlantedEm: 'gepflanzt',
    celebrationSub: 'in deinem Garten',
    footerPlanted: 'Teile deinen Garten mit jemandem, den du liebst.',
    footerNotPlanted: 'Lust, gemeinsam einen Garten wachsen zu lassen?',
    getRealBloom: 'Das echte Bloom holen →',
    settingsTitle: 'Einstellungen',
    youSection: 'Du',
    yourName: 'Dein Name',
    nameHint: 'Nur in diesem Browser gespeichert.',
    avatarLabel: 'Dein Avatar',
    save: 'Speichern',
    close: 'Schließen',
    startOver: 'Neu anfangen',
    startOverHint: 'Löscht deinen Namen und deinen Garten aus diesem Browser.',
    startOverConfirm: 'Ja, alles löschen',
    gardenTitle: 'Dein Garten',
    gardenStatus: {
      empty: 'Dein Garten wartet auf seinen ersten Samen',
      fresh: 'Dein Garten blüht',
      fading: 'Dein Garten vermisst dich. Die Farben beginnen zu verblassen.',
      thirsty: 'Deine Pflanzen haben Durst. Gieß sie heute, sonst beginnen sie zu vertrocknen.',
      dying: 'Dein Garten vertrocknet, jeden Tag eine Pflanze. Komm zurück und rette den Rest.',
      revived: 'Willkommen zurück! Der Regen hat deinen Garten wieder zum Leben erweckt.',
    },
    gardenEmptyHint: 'Beantworte die Frage des Tages, um deine erste Blume zu pflanzen.',
    diedSoFar: (n) => (n === 1 ? '1 Pflanze ist bisher vertrocknet' : `${n} Pflanzen sind bisher vertrocknet`),
    nextBush: (d) => (d === 1 ? 'Noch 1 Tag in Folge, dann wachsen die Blumen dieser Woche zu einem Busch' : `Noch ${d} Tage in Folge, dann wachsen die Blumen dieser Woche zu einem Busch`),
    nextTree: (d) => (d === 1 ? 'Noch 1 Tag in Folge, dann wird dein Busch zu einem Baum' : `Noch ${d} Tage in Folge, dann wird dein Busch zu einem Baum`),
    keepStreak: (d) => `Gieß deinen Garten heute, damit deine Serie von ${d} Tagen hält`,
    statStreak: 'SERIE',
    statPlants: 'PFLANZEN',
    statBest: 'BESTE',
    gardenRules: 'Eine Antwort am Tag pflanzt eine Blume · 7 Tage in Folge lassen einen Busch wachsen · 14 Tage einen Baum',
    onlyOnThisPhone: 'Dieser Garten lebt nur in diesem Browser.',
    keepItSafe: 'Mit Bloom sicher aufbewahren →',
  },

  // ══════════════════════════ SPANISH ══════════════════════
  es: {
    meta: {
      title: 'Bloom — Pruébalo gratis',
      description:
        'Un espacio seguro para reflexionar. Un toque al día. Prueba Bloom gratis — sin registro.',
      ogDescription: 'Toca. Reflexiona. Crece.',
    },
    loading: 'Cargando tu momento…',
    welcomeTitlePre: 'Bienvenido a',
    welcomeSubLine1: 'Un espacio seguro para reflexionar.',
    welcomeSubLine2: 'Un toque al día.',
    nameLabel: '¿Cómo te llamamos?',
    namePlaceholder: 'Tu nombre',
    enterGarden: 'Entrar a tu jardín',
    privacyLine1: 'Esto es una probadita gratis de Bloom.',
    privacyLine2: 'Todo se queda en tu navegador. No se envía nada.',
    greetings: {
      lateNight: 'Buena madrugada',
      morning: 'Buenos días',
      afternoon: 'Buenas tardes',
      evening: 'Buenas noches',
      night: 'Dulce noche',
    },
    resetTitle: 'Reiniciar tu sesión',
    languageLabel: 'Idioma',
    streakZero: 'Planta tu primera flor',
    streak: (d) => (d === 1 ? '¡Racha de 1 día!' : `¡Racha de ${d} días!`),
    bloomsPlanted: (n) => `${n} ${n === 1 ? 'flor plantada' : 'flores plantadas'}`,
    dailyBloom: 'Flor del día',
    todaysQuestion: 'Pregunta de hoy',
    tapToAnswer: 'Toca para responder →',
    answerPlaceholder: 'Respira. Responde con honestidad, aunque sean pocas palabras…',
    cancel: 'Cancelar',
    plantBloom: 'Plantar flor 🌸',
    plantedTitle: '¡La flor de hoy está plantada!',
    plantedSub: 'Vuelve mañana para una nueva pregunta',
    todaysReflection: 'Tu reflexión de hoy',
    you: '(tú)',
    questionLabel: 'PREGUNTA',
    tapHint: 'toca',
    celebrationEyebrow: 'Tu jardín',
    celebrationPlantedPre: 'Una flor está',
    celebrationPlantedEm: 'plantada',
    celebrationSub: 'en tu jardín',
    footerPlanted: 'Comparte tu jardín con alguien que quieres.',
    footerNotPlanted: '¿Quieres hacer crecer un jardín juntos?',
    getRealBloom: 'Consigue el Bloom real →',
    settingsTitle: 'Ajustes',
    youSection: 'Tú',
    yourName: 'Tu nombre',
    nameHint: 'Solo se guarda en este navegador.',
    avatarLabel: 'Tu avatar',
    save: 'Guardar',
    close: 'Cerrar',
    startOver: 'Empezar de nuevo',
    startOverHint: 'Borra tu nombre y tu jardín de este navegador.',
    startOverConfirm: 'Sí, borrar todo',
    gardenTitle: 'Tu jardín',
    gardenStatus: {
      empty: 'Tu jardín espera su primera semilla',
      fresh: 'Tu jardín está floreciendo',
      fading: 'Tu jardín te extraña. Los colores empiezan a apagarse.',
      thirsty: 'Tus plantas tienen sed. Riégalas hoy o empezarán a secarse.',
      dying: 'Tu jardín se está secando, una planta por día. Vuelve para salvar las demás.',
      revived: '¡Qué bueno verte de nuevo! La lluvia le devolvió la vida a tu jardín.',
    },
    gardenEmptyHint: 'Responde la pregunta de hoy para plantar tu primera flor.',
    diedSoFar: (n) => (n === 1 ? '1 planta se ha secado hasta ahora' : `${n} plantas se han secado hasta ahora`),
    nextBush: (d) => (d === 1 ? '1 día más de racha y las flores de esta semana crecen en un arbusto' : `${d} días más de racha y las flores de esta semana crecen en un arbusto`),
    nextTree: (d) => (d === 1 ? '1 día más de racha y tu arbusto se convierte en árbol' : `${d} días más de racha y tu arbusto se convierte en árbol`),
    keepStreak: (d) => `Riega tu jardín hoy para mantener tu racha de ${d} días`,
    statStreak: 'RACHA',
    statPlants: 'PLANTAS',
    statBest: 'MEJOR',
    gardenRules: 'Una respuesta al día planta una flor · 7 días seguidos hacen un arbusto · 14 días un árbol',
    onlyOnThisPhone: 'Este jardín solo vive en este navegador.',
    keepItSafe: 'Guárdalo con Bloom →',
  },
};

// ─── Questions bank (rotates daily, per locale) ────────────

export type Question = { q: string; cat: string };

export const QUESTIONS_BY_LOCALE: Record<Locale, Question[]> = {
  en: [
    { q: "What's quietly asking for your attention right now?", cat: 'awareness' },
    { q: 'What small thing brought you joy today?', cat: 'gratitude' },
    { q: 'When did you last feel truly at peace?', cat: 'presence' },
    { q: "What would you do today if you weren't afraid?", cat: 'courage' },
    { q: 'What is one kind thing you could say to yourself?', cat: 'self-compassion' },
    { q: 'What energy did you wake up with this morning?', cat: 'awareness' },
    { q: 'What are you holding onto that you could gently put down?', cat: 'release' },
    { q: 'Who made you feel seen this week?', cat: 'connection' },
    { q: 'What is one boundary you want to honor more this week?', cat: 'awareness' },
    { q: 'If today had a color, what would it be?', cat: 'playful' },
    { q: 'What made you smile this week?', cat: 'the small stuff' },
    { q: 'What song describes your mood today?', cat: 'right now' },
    { q: 'What is the best part of your morning?', cat: 'rituals' },
    { q: 'Who deserves a text from you today?', cat: 'people' },
    { q: 'What tiny thing are you looking forward to?', cat: 'future' },
    { q: 'What did today teach you about yourself?', cat: 'reflection' },
    { q: "What are you tolerating that you shouldn't?", cat: 'clarity' },
    { q: 'What small win can you celebrate right now?', cat: 'gratitude' },
    { q: "What would 'enough' look like for you today?", cat: 'presence' },
    { q: 'Who inspires you, and why?', cat: 'connection' },
  ],

  de: [
    { q: 'Was möchte gerade leise deine Aufmerksamkeit?', cat: 'achtsamkeit' },
    { q: 'Welche Kleinigkeit hat dir heute Freude gemacht?', cat: 'dankbarkeit' },
    { q: 'Wann hast du dich zuletzt wirklich ruhig gefühlt?', cat: 'gegenwart' },
    { q: 'Was würdest du heute tun, wenn du keine Angst hättest?', cat: 'mut' },
    { q: 'Was könntest du dir selbst heute Freundliches sagen?', cat: 'selbstmitgefühl' },
    { q: 'Mit welcher Energie bist du heute aufgewacht?', cat: 'achtsamkeit' },
    { q: 'Woran hältst du fest, das du sanft loslassen könntest?', cat: 'loslassen' },
    { q: 'Wer hat dir diese Woche das Gefühl gegeben, gesehen zu werden?', cat: 'verbindung' },
    { q: 'Welche Grenze möchtest du diese Woche besser wahren?', cat: 'achtsamkeit' },
    { q: 'Wenn dieser Tag eine Farbe hätte — welche wäre es?', cat: 'verspielt' },
    { q: 'Was hat dich diese Woche zum Lächeln gebracht?', cat: 'die kleinen dinge' },
    { q: 'Welches Lied beschreibt deine Stimmung heute?', cat: 'jetzt gerade' },
    { q: 'Was ist der schönste Teil deines Morgens?', cat: 'rituale' },
    { q: 'Wer verdient heute eine Nachricht von dir?', cat: 'menschen' },
    { q: 'Auf welche Kleinigkeit freust du dich?', cat: 'zukunft' },
    { q: 'Was hat dir der heutige Tag über dich selbst gezeigt?', cat: 'reflexion' },
    { q: 'Was erträgst du gerade, das du nicht ertragen müsstest?', cat: 'klarheit' },
    { q: 'Welchen kleinen Erfolg kannst du gerade jetzt feiern?', cat: 'dankbarkeit' },
    { q: 'Wie würde sich „genug" für dich heute anfühlen?', cat: 'gegenwart' },
    { q: 'Wer inspiriert dich — und warum?', cat: 'verbindung' },
  ],

  es: [
    { q: '¿Qué está pidiendo tu atención en silencio ahora mismo?', cat: 'conciencia' },
    { q: '¿Qué pequeña cosa te dio alegría hoy?', cat: 'gratitud' },
    { q: '¿Cuándo fue la última vez que sentiste verdadera paz?', cat: 'presencia' },
    { q: '¿Qué harías hoy si no tuvieras miedo?', cat: 'valentía' },
    { q: '¿Qué palabra amable podrías decirte a ti mismo hoy?', cat: 'autocompasión' },
    { q: '¿Con qué energía despertaste esta mañana?', cat: 'conciencia' },
    { q: '¿Qué estás sosteniendo que podrías soltar con calma?', cat: 'soltar' },
    { q: '¿Quién te hizo sentir visto esta semana?', cat: 'conexión' },
    { q: '¿Qué límite quieres respetar más esta semana?', cat: 'conciencia' },
    { q: 'Si hoy tuviera un color, ¿cuál sería?', cat: 'juego' },
    { q: '¿Qué te hizo sonreír esta semana?', cat: 'lo pequeño' },
    { q: '¿Qué canción describe tu ánimo de hoy?', cat: 'ahora mismo' },
    { q: '¿Qué es lo mejor de tus mañanas?', cat: 'rituales' },
    { q: '¿Quién merece un mensaje tuyo hoy?', cat: 'personas' },
    { q: '¿Qué cosita pequeña te ilusiona?', cat: 'futuro' },
    { q: '¿Qué te enseñó hoy sobre ti mismo?', cat: 'reflexión' },
    { q: '¿Qué estás tolerando que no deberías?', cat: 'claridad' },
    { q: '¿Qué pequeño logro puedes celebrar ahora mismo?', cat: 'gratitud' },
    { q: '¿Cómo se sentiría "suficiente" para ti hoy?', cat: 'presencia' },
    { q: '¿Quién te inspira, y por qué?', cat: 'conexión' },
  ],
};

// ─── Quotes bank (rotates daily, per locale) ───────────────

export type Quote = { text: string; author: string };

export const QUOTES_BY_LOCALE: Record<Locale, Quote[]> = {
  en: [
    { text: 'The lotus flower blooms most beautifully from the deepest mud.', author: 'Buddhist Proverb' },
    { text: 'The present moment is filled with joy, if you are attentive enough to see it.', author: 'Thich Nhat Hanh' },
    { text: 'Wherever you are, be there totally.', author: 'Eckhart Tolle' },
    { text: 'The quieter you become, the more you can hear.', author: 'Ram Dass' },
    { text: 'Do not let the behavior of others destroy your inner peace.', author: 'Dalai Lama' },
    { text: 'The soul becomes dyed with the color of its thoughts.', author: 'Marcus Aurelius' },
    { text: 'Every moment is a fresh beginning.', author: 'T.S. Eliot' },
    { text: 'The mind is everything. What you think, you become.', author: 'Buddha' },
    { text: 'Nature does not hurry, yet everything is accomplished.', author: 'Lao Tzu' },
    { text: 'Almost everything works better if you unplug it for a while — including you.', author: 'Anne Lamott' },
    { text: 'You cannot control what happens outside, only what happens within.', author: 'Wayne Dyer' },
    { text: 'In the middle of every difficulty lies opportunity.', author: 'Albert Einstein' },
    { text: 'What we plant in contemplation, we reap in action.', author: 'Meister Eckhart' },
    { text: "It is not the mountain we conquer, but ourselves.", author: 'Edmund Hillary' },
    { text: 'Rest when you are weary. Renew your body, your mind, your spirit.', author: 'Ralph Marston' },
  ],

  de: [
    { text: 'Die Lotusblüte blüht am schönsten aus dem tiefsten Schlamm.', author: 'Buddhistisches Sprichwort' },
    { text: 'Der gegenwärtige Moment ist voller Freude — wenn du aufmerksam genug bist, sie zu sehen.', author: 'Thich Nhat Hanh' },
    { text: 'Wo immer du bist, sei ganz dort.', author: 'Eckhart Tolle' },
    { text: 'Je stiller du wirst, desto mehr kannst du hören.', author: 'Ram Dass' },
    { text: 'Lass das Verhalten anderer nicht deinen inneren Frieden zerstören.', author: 'Dalai Lama' },
    { text: 'Die Seele färbt sich mit der Farbe ihrer Gedanken.', author: 'Marc Aurel' },
    { text: 'Jeder Augenblick ist ein neuer Anfang.', author: 'T.S. Eliot' },
    { text: 'Der Geist ist alles. Was du denkst, das wirst du.', author: 'Buddha' },
    { text: 'Die Natur eilt nicht, und doch wird alles vollendet.', author: 'Laotse' },
    { text: 'Fast alles funktioniert wieder, wenn man es kurz ausschaltet — auch du.', author: 'Anne Lamott' },
    { text: 'Du kannst nicht steuern, was außen geschieht — nur, was innen geschieht.', author: 'Wayne Dyer' },
    { text: 'Inmitten jeder Schwierigkeit liegt eine Möglichkeit.', author: 'Albert Einstein' },
    { text: 'Was wir in der Stille säen, ernten wir im Handeln.', author: 'Meister Eckhart' },
    { text: 'Nicht den Berg bezwingen wir, sondern uns selbst.', author: 'Edmund Hillary' },
    { text: 'Ruh dich aus, wenn du müde bist. Erneuere Körper, Geist und Seele.', author: 'Ralph Marston' },
  ],

  es: [
    { text: 'La flor de loto florece más bella desde el lodo más profundo.', author: 'Proverbio budista' },
    { text: 'El momento presente está lleno de alegría, si estás atento para verla.', author: 'Thich Nhat Hanh' },
    { text: 'Dondequiera que estés, está ahí por completo.', author: 'Eckhart Tolle' },
    { text: 'Mientras más silencio hay en ti, más puedes escuchar.', author: 'Ram Dass' },
    { text: 'No dejes que el comportamiento de otros destruya tu paz interior.', author: 'Dalái Lama' },
    { text: 'El alma se tiñe del color de sus pensamientos.', author: 'Marco Aurelio' },
    { text: 'Cada momento es un nuevo comienzo.', author: 'T.S. Eliot' },
    { text: 'La mente lo es todo. En lo que piensas, te conviertes.', author: 'Buda' },
    { text: 'La naturaleza no se apresura, y sin embargo todo se cumple.', author: 'Lao Tsé' },
    { text: 'Casi todo funciona mejor si lo desconectas un rato — tú incluido.', author: 'Anne Lamott' },
    { text: 'No controlas lo que pasa afuera, solo lo que pasa adentro.', author: 'Wayne Dyer' },
    { text: 'En medio de cada dificultad se encuentra la oportunidad.', author: 'Albert Einstein' },
    { text: 'Lo que sembramos en la contemplación, lo cosechamos en la acción.', author: 'Maestro Eckhart' },
    { text: 'No conquistamos la montaña, sino a nosotros mismos.', author: 'Edmund Hillary' },
    { text: 'Descansa cuando estés cansado. Renueva tu cuerpo, tu mente, tu espíritu.', author: 'Ralph Marston' },
  ],
};

// ─── Utilities ────────────────────────────────────────────

export function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function getTimeOfDayGreeting(locale: Locale): string {
  const g = DICT[locale].greetings;
  const hour = new Date().getHours();
  if (hour < 5) return g.lateNight;
  if (hour < 12) return g.morning;
  if (hour < 17) return g.afternoon;
  if (hour < 21) return g.evening;
  return g.night;
}

export const FLOWER_COLORS = [
  '#C17F59',
  '#D4A574',
  '#E8C4B8',
  '#C9A96E',
  '#8B9E7E',
  '#B5C7A9',
  '#F0D5C8',
];
