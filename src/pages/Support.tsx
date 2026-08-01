import { useEffect, useRef, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

type Lang = 'nb' | 'en';

const SUPPORT_EMAIL = 'support@pastelly.no';

const copy = {
  nb: {
    updated: '1. august 2026',
    title: 'Hjelp & support',
    home: 'Til forsiden',
    switchLang: 'English',
    switchTo: '/support',
    intro:
      'Trenger du hjelp med Pastelly? Vi svarer på spørsmål om konto, kalender, invitasjoner og appen.',
    contactTitle: 'Kontakt oss',
    contactBody: 'Send oss en e-post — vi leser alt som kommer inn:',
    responseHint: 'Vi prøver å svare innen et par virkedager.',
    tipsTitle: 'Før du skriver',
    tips: [
      'Hvilken enhet bruker du (iPhone, iPad, nett)?',
      'Hva prøvde du å gjøre, og hva skjedde?',
      'Skjermbilde hjelper ofte hvis noe ser feil ut.',
    ],
    commonTitle: 'Vanlige ting',
    commonItems: [
      [
        'Invitasjon',
        'Del den korte koden (8 tegn) eller lenken. Partneren velger «Jeg har kode» etter innlogging.',
      ],
      [
        'Glemt passord',
        'Bruk «Glemt passord» på innloggingssiden. Lenken åpner Pastelly så du kan sette nytt passord.',
      ],
      [
        'Slett konto',
        'I appen: Profil → Konto → Slett konto. Da fjernes innloggingen din.',
      ],
    ] as const,
    privacyTitle: 'Personvern',
    privacyBody: 'Les mer om hvordan vi behandler data:',
    privacyLink: 'Personvernerklæring',
    privacyHref: '/personvern',
    footerHome: 'Forsiden',
    mailSubject: 'Hjelp med Pastelly',
  },
  en: {
    updated: '1 August 2026',
    title: 'Help & support',
    home: 'Back to home',
    switchLang: 'Norsk',
    switchTo: '/hjelp',
    intro:
      'Need help with Pastelly? We’re happy to help with account, calendar, invites, and the app.',
    contactTitle: 'Contact us',
    contactBody: 'Email us — we read everything that comes in:',
    responseHint: 'We aim to reply within a couple of business days.',
    tipsTitle: 'Before you write',
    tips: [
      'Which device are you on (iPhone, iPad, web)?',
      'What were you trying to do, and what happened?',
      'A screenshot often helps if something looks wrong.',
    ],
    commonTitle: 'Common topics',
    commonItems: [
      [
        'Invite',
        'Share the short code (8 characters) or the link. Your partner chooses “I have a code” after signing in.',
      ],
      [
        'Forgot password',
        'Use “Forgot password” on the sign-in screen. The link opens Pastelly so you can set a new password.',
      ],
      [
        'Delete account',
        'In the app: Profile → Account → Delete account. That removes your sign-in.',
      ],
    ] as const,
    privacyTitle: 'Privacy',
    privacyBody: 'Read more about how we handle data:',
    privacyLink: 'Privacy Policy',
    privacyHref: '/privacy',
    footerHome: 'Home',
    mailSubject: 'Help with Pastelly',
  },
} as const;

const Support = () => {
  const { pathname } = useLocation();
  const lang: Lang = pathname.startsWith('/support') ? 'en' : 'nb';
  const t = copy[lang];
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-background">
      <div
        ref={scrollRef}
        className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-touch"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[140vh]"
          style={{
            background:
              'radial-gradient(60% 45% at 20% 15%, hsl(var(--member-rose) / 0.35), transparent 70%),' +
              'radial-gradient(55% 40% at 85% 25%, hsl(var(--member-peach) / 0.3), transparent 70%),' +
              'radial-gradient(65% 55% at 75% 90%, hsl(var(--calendar-accent) / 0.35), transparent 70%)',
          }}
        />

        <main className="relative z-10 mx-auto w-full max-w-2xl px-6 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))]">
          <header className="flex items-center justify-between gap-3 pb-8 pt-2">
            <Link
              to="/"
              className="font-display text-lg font-extrabold tracking-tight text-foreground"
            >
              Pastelly
            </Link>
            <div className="flex items-center gap-2">
              <Link
                to={t.switchTo}
                className="min-h-11 rounded-full px-3 py-2 text-sm font-semibold text-foreground/80 transition-colors hover:text-foreground"
              >
                {t.switchLang}
              </Link>
              <Link
                to="/"
                className="min-h-11 rounded-full px-3 py-2 text-sm font-semibold text-foreground/80 transition-colors hover:text-foreground"
              >
                {t.home}
              </Link>
            </div>
          </header>

          <article className="space-y-8 text-foreground">
            <div>
              <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                {t.title}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {lang === 'nb' ? 'Sist oppdatert' : 'Last updated'}: {t.updated}
              </p>
            </div>

            <p className="text-base leading-relaxed text-muted-foreground">{t.intro}</p>

            <Section title={t.contactTitle}>
              <p>{t.contactBody}</p>
              <p className="mt-3">
                <a
                  href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(t.mailSubject)}`}
                  className="text-lg font-semibold text-foreground underline underline-offset-2"
                >
                  {SUPPORT_EMAIL}
                </a>
              </p>
              <p className="mt-2 text-sm">{t.responseHint}</p>
            </Section>

            <Section title={t.tipsTitle}>
              <ul className="list-disc space-y-2 pl-5">
                {t.tips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </Section>

            <Section title={t.commonTitle}>
              <ul className="list-disc space-y-2 pl-5">
                {t.commonItems.map(([label, body]) => (
                  <li key={label}>
                    <strong className="text-foreground">{label}:</strong> {body}
                  </li>
                ))}
              </ul>
            </Section>

            <Section title={t.privacyTitle}>
              <p>
                {t.privacyBody}{' '}
                <Link
                  to={t.privacyHref}
                  className="font-medium text-foreground underline underline-offset-2"
                >
                  {t.privacyLink}
                </Link>
              </p>
            </Section>
          </article>

          <footer className="mt-10 border-t border-border/40 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-6 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Pastelly
            {' · '}
            <Link to="/" className="underline underline-offset-2">
              {t.footerHome}
            </Link>
            {' · '}
            <Link to={t.switchTo} className="underline underline-offset-2">
              {t.switchLang}
            </Link>
          </footer>
        </main>
      </div>
    </div>
  );
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-bold tracking-tight">{title}</h2>
      <div className="space-y-2 text-base leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export default Support;
