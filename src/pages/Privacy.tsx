import { useEffect, useRef, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

type Lang = 'nb' | 'en';

const CONTROLLER = {
  name: 'Studio P.A. Halvorsen',
  orgNr: '927 309 114',
  website: 'https://studiopah.no',
  email: 'mail@studiopah.no',
  productEmail: 'hei@pastelly.no',
  productSite: 'https://pastelly.no',
};

const copy = {
  nb: {
    updated: '1. august 2026',
    title: 'Personvern',
    home: 'Til forsiden',
    switchLang: 'English',
    switchTo: '/privacy',
    intro:
      'Pastelly er en delt kalender for hjemmet. Denne siden forklarer hvilke opplysninger vi behandler, hvorfor, og hvilke rettigheter du har.',
    controllerTitle: 'Behandlingsansvarlig',
    controllerBody: (
      <>
        Behandlingsansvarlig for Pastelly er {CONTROLLER.name}, org.nr. {CONTROLLER.orgNr}.
        Mer om virksomheten: {''}
        <a href={CONTROLLER.website} className="font-medium text-foreground underline underline-offset-2">
          studiopah.no
        </a>
        .
      </>
    ),
    s1: '1. Hva vi samler inn',
    s1Items: [
      ['Konto', 'e-postadresse og passord (passord lagres kryptert hos leverandøren vår, ikke i klartekst hos oss).'],
      ['Profil', 'visningsnavn, valgfritt profilbilde, fargevalg og språkpreferanser.'],
      [
        'Kalenderinnhold',
        'aktiviteter, notater, steder du selv legger inn, nedtellinger og invitasjoner i kalendere du er med i.',
      ],
      [
        'Tekniske data',
        'innloggingssesjon og, hvis du tillater push-varsler, en enhetsidentifikator hos push-leverandøren.',
      ],
    ] as const,
    s1Extra:
      'Vi ber ikke om posisjon. Eventuell posisjonsrelatert tekst i systemet skyldes tekniske krav fra push-biblioteket, ikke at appen bruker GPS.',
    s2: '2. Formål',
    s2Items: [
      'gi deg og husholdet tilgang til delt kalender',
      'sende e-post for bekreftelse, innlogging og passordtilbakestilling',
      'sende push-varsler du har bedt om (f.eks. daglig oversikt eller nedtellinger)',
      'drifte, sikre og feilsøke tjenesten',
    ],
    s2Extra:
      'Rettslig grunnlag er i hovedsak avtale (når du bruker Pastelly) og berettiget interesse for sikkerhet og drift. Der loven krever samtykke (f.eks. enkelte varsler), ber vi om det.',
    s3: '3. Deling med andre',
    s3Body:
      'Innhold i en delt kalender er synlig for de andre medlemmene i den kalenderen. Vi selger ikke personopplysninger. Vi bruker underleverandører for å levere tjenesten:',
    s3Items: [
      ['Supabase', 'autentisering og database'],
      ['OneSignal', 'push-varsler (hvis aktivert)'],
      ['Hosting', 'nettside og app'],
    ] as const,
    s3Extra: 'Disse behandler data på våre vegne og skal ikke bruke dem til egne formål.',
    s4: '4. Lagring og sletting',
    s4Body:
      'Vi lagrer opplysningene så lenge kontoen din er aktiv. Du kan slette kontoen i appen under Profil → Konto → Slett konto. Da slettes innloggingen din, og du fjernes fra kalendere. Kalendere der du er alene slettes. I delte kalendere kan innhold du har lagt inn bli stående hos de andre medlemmene (med navn som «Slettet bruker»), slik at deres kalender ikke mister historikk.',
    s5: '5. Dine rettigheter',
    s5Body:
      'Du kan be om innsyn, retting, begrensning, dataportabilitet og sletting der det følger av personvernregelverket. Du kan også klage til Datatilsynet. Ta kontakt på e-posten under, så hjelper vi deg.',
    s6: '6. Barn',
    s6Body:
      'Pastelly er ikke rettet mot barn under 13 år. Vi ber ikke bevisst om opplysninger fra barn under denne alderen.',
    s7: '7. Endringer',
    s7Body:
      'Vi kan oppdatere denne siden ved behov. Vesentlige endringer vil fremgå av datoen øverst, og vi kan varsle i appen dersom det er nødvendig.',
    s8: '8. Kontakt',
    contactProduct: 'Pastelly / personvern',
    contactStudio: 'Studio / virksomhet',
    footerHome: 'Forsiden',
  },
  en: {
    updated: '1 August 2026',
    title: 'Privacy Policy',
    home: 'Back to home',
    switchLang: 'Norsk',
    switchTo: '/personvern',
    intro:
      'Pastelly is a shared home calendar. This page explains what data we process, why, and what rights you have.',
    controllerTitle: 'Data controller',
    controllerBody: (
      <>
        The data controller for Pastelly is {CONTROLLER.name}, organisation number {CONTROLLER.orgNr} (Norway).
        More about the business:{' '}
        <a href={CONTROLLER.website} className="font-medium text-foreground underline underline-offset-2">
          studiopah.no
        </a>
        .
      </>
    ),
    s1: '1. What we collect',
    s1Items: [
      ['Account', 'email address and password (passwords are stored encrypted by our provider, not in plain text with us).'],
      ['Profile', 'display name, optional profile photo, colour choices and language preferences.'],
      [
        'Calendar content',
        'events, notes, places you enter, countdowns and invites in calendars you belong to.',
      ],
      [
        'Technical data',
        'sign-in session and, if you allow push notifications, a device identifier with the push provider.',
      ],
    ] as const,
    s1Extra:
      'We do not request your location. Any location-related system text exists because of technical requirements in the push library, not because the app uses GPS.',
    s2: '2. Purpose',
    s2Items: [
      'give you and your household access to a shared calendar',
      'send email for confirmation, sign-in and password reset',
      'send push notifications you have asked for (e.g. daily digest or countdowns)',
      'operate, secure and troubleshoot the service',
    ],
    s2Extra:
      'The legal basis is mainly contract (when you use Pastelly) and legitimate interest for security and operations. Where the law requires consent (e.g. certain notifications), we ask for it.',
    s3: '3. Sharing with others',
    s3Body:
      'Content in a shared calendar is visible to the other members of that calendar. We do not sell personal data. We use processors to deliver the service:',
    s3Items: [
      ['Supabase', 'authentication and database'],
      ['OneSignal', 'push notifications (if enabled)'],
      ['Hosting', 'website and app'],
    ] as const,
    s3Extra: 'They process data on our behalf and must not use it for their own purposes.',
    s4: '4. Retention and deletion',
    s4Body:
      'We keep your data while your account is active. You can delete your account in the app under Profile → Account → Delete account. That removes your sign-in and takes you out of calendars. Calendars where you were alone are deleted. In shared calendars, content you added may remain for the other members (shown as “Deleted user”) so their calendar history is not lost.',
    s5: '5. Your rights',
    s5Body:
      'You may request access, rectification, restriction, data portability and deletion where data protection law provides for it. You may also lodge a complaint with the Norwegian Data Protection Authority (Datatilsynet). Contact us below and we will help.',
    s6: '6. Children',
    s6Body:
      'Pastelly is not directed at children under 13. We do not knowingly collect data from children under that age.',
    s7: '7. Changes',
    s7Body:
      'We may update this page when needed. Material changes will be reflected in the date above, and we may notify you in the app if necessary.',
    s8: '8. Contact',
    contactProduct: 'Pastelly / privacy',
    contactStudio: 'Studio / business',
    footerHome: 'Home',
  },
} as const;

const Privacy = () => {
  const { pathname } = useLocation();
  const lang: Lang = pathname.startsWith('/privacy') ? 'en' : 'nb';
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

            <Section title={t.controllerTitle}>
              <p>{t.controllerBody}</p>
            </Section>

            <Section title={t.s1}>
              <ul className="list-disc space-y-2 pl-5">
                {t.s1Items.map(([label, body]) => (
                  <li key={label}>
                    <strong className="text-foreground">{label}:</strong> {body}
                  </li>
                ))}
              </ul>
              <p className="mt-3">{t.s1Extra}</p>
            </Section>

            <Section title={t.s2}>
              <ul className="list-disc space-y-2 pl-5">
                {t.s2Items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="mt-3">{t.s2Extra}</p>
            </Section>

            <Section title={t.s3}>
              <p>{t.s3Body}</p>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                {t.s3Items.map(([label, body]) => (
                  <li key={label}>
                    <strong className="text-foreground">{label}</strong> — {body}
                  </li>
                ))}
              </ul>
              <p className="mt-3">{t.s3Extra}</p>
            </Section>

            <Section title={t.s4}>
              <p>{t.s4Body}</p>
            </Section>

            <Section title={t.s5}>
              <p>{t.s5Body}</p>
            </Section>

            <Section title={t.s6}>
              <p>{t.s6Body}</p>
            </Section>

            <Section title={t.s7}>
              <p>{t.s7Body}</p>
            </Section>

            <Section title={t.s8}>
              <p>
                {t.contactProduct}:{' '}
                <a
                  href={`mailto:${CONTROLLER.productEmail}?subject=${encodeURIComponent(lang === 'nb' ? 'Personvern' : 'Privacy')}`}
                  className="font-medium text-foreground underline underline-offset-2"
                >
                  {CONTROLLER.productEmail}
                </a>
              </p>
              <p className="mt-2">
                {t.contactStudio}:{' '}
                <a
                  href={`mailto:${CONTROLLER.email}`}
                  className="font-medium text-foreground underline underline-offset-2"
                >
                  {CONTROLLER.email}
                </a>
                {' · '}
                <a
                  href={CONTROLLER.website}
                  className="font-medium text-foreground underline underline-offset-2"
                >
                  studiopah.no
                </a>
              </p>
              <p className="mt-2">
                {CONTROLLER.name}
                <br />
                Org.nr. {CONTROLLER.orgNr}
              </p>
            </Section>
          </article>

          <footer className="mt-10 border-t border-border/40 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-6 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Pastelly · {CONTROLLER.name}
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

export default Privacy;
