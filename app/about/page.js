import s from './about.module.css';

export const metadata = {
  title: 'About — The Cabin Critic',
  description: 'What is The Cabin Critic and how does it work?',
};

export default function About() {
  return (
    <div className={s.page}>
      <div className={s.wrap}>
        <a href="/" className={s.back}>← Back</a>

        <h1 className={s.title}>About The Cabin Critic</h1>

        <p className={s.lead}>
          The Cabin Critic helps you figure out what to watch before you board your American Airlines flight — without scrolling through a seatback screen in the gate area.
        </p>

        <h2 className={s.h2}>How it works</h2>
        <p className={s.body}>
          Enter your AA flight number and we pull the entertainment catalog directly from American Airlines' system for your specific flight. We then look up each movie's Rotten Tomatoes critic score and IMDb rating via the OMDB API, rank everything from best to worst, and flag anything worth your time.
        </p>

        <h2 className={s.h2}>Why the catalog might be empty</h2>
        <p className={s.body}>
          AA typically loads entertainment catalogs 1–3 days before departure. If your flight is more than a few days out, try again closer to your departure date. Short-haul flights (under ~2 hours) may have a limited or no catalog.
        </p>

        <h2 className={s.h2}>Data sources</h2>
        <p className={s.body}>
          Flight entertainment data comes from <a href="https://entertainment.aa.com" target="_blank" rel="noopener noreferrer" className={s.link}>American Airlines</a>. Movie scores are sourced from the <a href="https://www.omdbapi.com" target="_blank" rel="noopener noreferrer" className={s.link}>OMDB API</a>, which aggregates data from Rotten Tomatoes and IMDb. Scores reflect critic consensus at the time of lookup and may not match exactly what appears on those sites.
        </p>

        <h2 className={s.h2}>Contact</h2>
        <p className={s.body}>
          Questions or feedback? Reach out at <a href="mailto:hello@thecabincritic.com" className={s.link}>hello@thecabincritic.com</a>.
        </p>

        <footer className={s.footer}>
          © {new Date().getFullYear()} The Cabin Critic ·{' '}
          <a href="/privacy" className={s.footerLink}>Privacy Policy</a>
        </footer>
      </div>
    </div>
  );
}
