import './globals.css';

export const metadata = {
  title: 'The Cabin Critic — Inflight Movie Ratings',
  description: 'Know what to watch before you board. Rotten Tomatoes & IMDb scores for your AA inflight entertainment.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
