import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

const UPDATED = '31. juli 2026';

const Privacy = () => {
  return (
    <div className="relative h-[100dvh] overflow-y-auto overflow-x-hidden overscroll-contain scroll-touch bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 min-h-full"
        style={{
          background:
            'radial-gradient(60% 45% at 20% 15%, hsl(var(--member-rose) / 0.35), transparent 70%),' +
            'radial-gradient(55% 40% at 85% 25%, hsl(var(--member-peach) / 0.3), transparent 70%),' +
            'radial-gradient(65% 55% at 75% 90%, hsl(var(--calendar-accent) / 0.35), transparent 70%)',
        }}
      />

      <main className="relative z-10 mx-auto w-full max-w-2xl px-6 py-safe">
        <header className="flex items-center justify-between pt-6 pb-8">
          <Link
            to="/"
            className="font-display text-lg font-extrabold tracking-tight text-foreground"
          >
            Pastelly
          </Link>
          <Link
            to="/"
            className="min-h-11 rounded-full px-4 py-2 text-sm font-semibold text-foreground/80 transition-colors hover:text-foreground"
          >
            Til forsiden
          </Link>
        </header>

        <article className="pb-16 space-y-8 text-foreground">
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Personvern
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">Sist oppdatert: {UPDATED}</p>
          </div>

          <p className="text-base leading-relaxed text-muted-foreground">
            Pastelly er en delt kalender for hjemmet. Denne siden forklarer hvilke opplysninger vi
            behandler, hvorfor, og hvilke rettigheter du har. Behandlingsansvarlig er Studio P. A.
            Halvorsen (org. knyttet til appen Pastelly).
          </p>

          <Section title="1. Hva vi samler inn">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-foreground">Konto:</strong> e-postadresse og passord (passord
                lagres kryptert hos leverandøren vår, ikke i klartekst hos oss).
              </li>
              <li>
                <strong className="text-foreground">Profil:</strong> visningsnavn, valgfritt
                profilbilde, fargevalg og språkpreferanser.
              </li>
              <li>
                <strong className="text-foreground">Kalenderinnhold:</strong> aktiviteter, notater,
                steder du selv legger inn, nedtellinger og invitasjoner i kalendere du er med i.
              </li>
              <li>
                <strong className="text-foreground">Tekniske data:</strong> innloggingssesjon og,
                hvis du tillater push-varsler, en enhetsidentifikator hos push-leverandøren.
              </li>
            </ul>
            <p className="mt-3">
              Vi ber ikke om posisjon. Eventuell posisjonsrelatert tekst i systemet skyldes
              tekniske krav fra push-biblioteket, ikke at appen bruker GPS.
            </p>
          </Section>

          <Section title="2. Formål">
            <ul className="list-disc space-y-2 pl-5">
              <li>gi deg og husholdet tilgang til delt kalender</li>
              <li>sende e-post for bekreftelse, innlogging og passordtilbakestilling</li>
              <li>sende push-varsler du har bedt om (f.eks. daglig oversikt eller nedtellinger)</li>
              <li>drifte, sikre og feilsøke tjenesten</li>
            </ul>
            <p className="mt-3">
              Rettslig grunnlag er i hovedsak avtale (når du bruker Pastelly) og berettiget interesse
              for sikkerhet og drift. Der loven krever samtykke (f.eks. enkelte varsler), ber vi om det.
            </p>
          </Section>

          <Section title="3. Deling med andre">
            <p>
              Innhold i en delt kalender er synlig for de andre medlemmene i den kalenderen. Vi selger
              ikke personopplysninger. Vi bruker underleverandører for å levere tjenesten:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                <strong className="text-foreground">Supabase</strong> — autentisering og database
              </li>
              <li>
                <strong className="text-foreground">OneSignal</strong> — push-varsler (hvis aktivert)
              </li>
              <li>
                Vertskap / hosting for nettsiden og appen
              </li>
            </ul>
            <p className="mt-3">
              Disse behandler data på våre vegne og skal ikke bruke dem til egne formål.
            </p>
          </Section>

          <Section title="4. Lagring og sletting">
            <p>
              Vi lagrer opplysningene så lenge kontoen din er aktiv. Du kan slette kontoen i appen
              under Profil → Konto → Slett konto. Da slettes innloggingen din, og du fjernes fra
              kalendere. Kalendere der du er alene slettes. I delte kalendere kan innhold du har lagt
              inn bli stående hos de andre medlemmene (med navn som «Slettet bruker»), slik at deres
              kalender ikke mister historikk.
            </p>
          </Section>

          <Section title="5. Dine rettigheter">
            <p>
              Du kan be om innsyn, retting, begrensning, dataportabilitet og sletting der det følger
              av personvernregelverket. Du kan også klage til Datatilsynet. Ta kontakt på e-posten
              under, så hjelper vi deg.
            </p>
          </Section>

          <Section title="6. Barn">
            <p>
              Pastelly er ikke rettet mot barn under 13 år. Vi ber ikke bevisst om opplysninger fra
              barn under denne alderen.
            </p>
          </Section>

          <Section title="7. Endringer">
            <p>
              Vi kan oppdatere denne siden ved behov. Vesentlige endringer vil fremgå av datoen øverst,
              og vi kan varsle i appen dersom det er nødvendig.
            </p>
          </Section>

          <Section title="8. Kontakt">
            <p>
              Spørsmål om personvern:{' '}
              <a
                href="mailto:hei@pastelly.no?subject=Personvern"
                className="font-medium text-foreground underline underline-offset-2"
              >
                hei@pastelly.no
              </a>
            </p>
            <p className="mt-2">
              Nettsted:{' '}
              <a
                href="https://pastelly.no"
                className="font-medium text-foreground underline underline-offset-2"
              >
                https://pastelly.no
              </a>
            </p>
          </Section>

          <section className="rounded-2xl border border-border/60 bg-background/70 p-5 space-y-3">
            <h2 className="font-display text-lg font-bold">Privacy (English summary)</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Pastelly is a shared home calendar. We process your email, profile details you choose
              to add, calendar content you create, and technical data needed to sign you in and
              (optionally) send push notifications. Data is stored with processors such as Supabase
              and OneSignal. We do not sell your data. Household members can see content in shared
              calendars. You can delete your account in the app (Profile → Account → Delete account).
              Contact:{' '}
              <a href="mailto:hei@pastelly.no" className="underline underline-offset-2">
                hei@pastelly.no
              </a>
              . Full details above in Norwegian.
            </p>
          </section>
        </article>

        <footer className="border-t border-border/40 pb-10 pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Pastelly ·{' '}
          <Link to="/" className="underline underline-offset-2">
            Forsiden
          </Link>
        </footer>
      </main>
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
