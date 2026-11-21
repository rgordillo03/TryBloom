import './globals.css';
import { headers } from 'next/headers';
import { Analytics } from '@vercel/analytics/react';
import { DICT, localeFromAcceptLanguage } from '@/lib/i18n';

// Reads the browser's Accept-Language header so the <title>,
// description and OG tags are already localized on first paint.
export async function generateMetadata() {
  const locale = localeFromAcceptLanguage(headers().get('accept-language'));
  const t = DICT[locale].meta;

  return {
    title: t.title,
    description: t.description,
    openGraph: {
      title: t.title,
      description: t.ogDescription,
      type: 'website',
      locale,
    },
    icons: {
      icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌿</text></svg>",
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = localeFromAcceptLanguage(headers().get('accept-language'));

  return (
    // Client-side detection may refine this (e.g. a saved manual choice);
    // page.tsx updates document.documentElement.lang on mount.
    <html lang={locale}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&family=Lora:ital,wght@0,400;0,500;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
