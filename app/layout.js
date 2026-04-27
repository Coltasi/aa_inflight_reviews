import './globals.css';
import { Analytics } from '@vercel/analytics/next';

export const metadata = {
  title: 'The Cabin Critic — Inflight Movie Ratings',
  description: 'Know what to watch before you board. RT & IMDb scores for your AA inflight movies.',
  manifest: '/manifest.json',
  themeColor: '#001141',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Cabin Critic',
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Cabin Critic" />
        <meta name="theme-color" content="#001141" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon-192.png" type="image/png" />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
