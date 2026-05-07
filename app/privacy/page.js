import s from '../about/about.module.css';

export const metadata = {
  title: 'Privacy Policy — The Cabin Critic',
  description: 'Privacy policy for The Cabin Critic.',
};

export default function Privacy() {
  return (
    <div className={s.page}>
      <div className={s.wrap}>
        <a href="/" className={s.back}>← Back</a>

        <h1 className={s.title}>Privacy Policy</h1>
        <p className={s.lead}>Last updated: May 7, 2025</p>

        <h2 className={s.h2}>What we collect</h2>
        <p className={s.body}>
          The Cabin Critic does not collect, store, or sell any personal information. We do not require you to create an account or provide an email address to use the service.
        </p>
        <p className={s.body}>
          When you search for a flight, your flight number is sent to our server to query American Airlines' entertainment catalog and the OMDB API. We do not log or retain these queries.
        </p>

        <h2 className={s.h2}>Cookies</h2>
        <p className={s.body}>
          We do not set first-party cookies. If advertising is served on this site, our advertising partners (such as Google AdSense) may use cookies to serve relevant ads. You can opt out of personalized advertising at <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className={s.link}>adssettings.google.com</a>.
        </p>

        <h2 className={s.h2}>Third-party services</h2>
        <p className={s.body}>This site uses the following third-party services:</p>
        <ul className={s.list}>
          <li><a href="https://www.omdbapi.com/privacypolicy.htm" target="_blank" rel="noopener noreferrer" className={s.link}>OMDB API</a> — movie ratings data</li>
          <li><a href="https://www.aa.com/i18n/utility-page/privacy-policy.jsp" target="_blank" rel="noopener noreferrer" className={s.link}>American Airlines</a> — flight entertainment catalog</li>
          <li><a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className={s.link}>Vercel</a> — hosting and infrastructure</li>
        </ul>

        <h2 className={s.h2}>Children's privacy</h2>
        <p className={s.body}>
          This service is not directed at children under 13. We do not knowingly collect any information from children.
        </p>

        <h2 className={s.h2}>Changes to this policy</h2>
        <p className={s.body}>
          We may update this policy from time to time. Continued use of the site after changes constitutes acceptance of the updated policy.
        </p>

        <h2 className={s.h2}>Contact</h2>
        <p className={s.body}>
          Questions about this policy? Email us at <a href="mailto:hello@thecabincritic.com" className={s.link}>hello@thecabincritic.com</a>.
        </p>

        <footer className={s.footer}>
          © {new Date().getFullYear()} The Cabin Critic ·{' '}
          <a href="/about" className={s.footerLink}>About</a>
        </footer>
      </div>
    </div>
  );
}
