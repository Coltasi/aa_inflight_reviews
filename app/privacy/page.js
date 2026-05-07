import s from '../about/about.module.css';

export const metadata = {
  title: 'Privacy Policy — The Cabin Critic',
  description: 'Privacy policy for The Cabin Critic.',
};

export default function Privacy() {
  const updated = 'May 7, 2025';
  return (
    <div className={s.page}>
      <div className={s.wrap}>
        <a href="/" className={s.back}>← Back</a>

        <h1 className={s.title}>Privacy Policy</h1>
        <p className={s.lead}>Last updated: {updated}</p>

        <h2 className={s.h2}>What we collect</h2>
        <p>
          The Cabin Critic does not collect, store, or sell any personal information. We do not require you to create an account or provide an email address to use the service.
        </p>
        <p style={{marginTop:'0.75rem'}}>
          When you search for a flight, your flight number is sent to our server to query American Airlines' entertainment catalog and the OMDB API. We do not log or retain these queries.
        </p>

        <h2 className={s.h2}>Cookies</h2>
        <p>
          We do not set first-party cookies. If advertising is served on this site, our advertising partners (such as Google AdSense) may use cookies to serve relevant ads. You can opt out of personalized advertising at <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">adssettings.google.com</a>.
        </p>

        <h2 className={s.h2}>Third-party services</h2>
        <p>
          This site uses the following third-party services:
        </p>
        <ul style={{paddingLeft:'1.25rem', marginTop:'0.5rem', lineHeight:'2'}}>
          <li><a href="https://www.omdbapi.com/privacypolicy.htm" target="_blank" rel="noopener noreferrer">OMDB API</a> — movie ratings data</li>
          <li><a href="https://www.aa.com/i18n/utility-page/privacy-policy.jsp" target="_blank" rel="noopener noreferrer">American Airlines</a> — flight entertainment catalog</li>
          <li><a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">Vercel</a> — hosting and infrastructure</li>
        </ul>

        <h2 className={s.h2}>Children's privacy</h2>
        <p>
          This service is not directed at children under 13. We do not knowingly collect any information from children.
        </p>

        <h2 className={s.h2}>Changes to this policy</h2>
        <p>
          We may update this policy from time to time. Continued use of the site after changes constitutes acceptance of the updated policy.
        </p>

        <h2 className={s.h2}>Contact</h2>
        <p>
          Questions about this policy? Email us at <a href="mailto:hello@thecabincritic.com">hello@thecabincritic.com</a>.
        </p>

        <footer className={s.footer}>
          © {new Date().getFullYear()} The Cabin Critic ·{' '}
          <a href="/about">About</a>
        </footer>
      </div>
    </div>
  );
}
