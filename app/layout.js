import './globals.css';

export const metadata = {
  title: 'AA Movie Rater — Inflight Entertainment Guide',
  description: 'Look up Rotten Tomatoes scores for your American Airlines inflight movies',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
