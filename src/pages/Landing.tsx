import { motion } from 'framer-motion';

type LandingProps = {
  onGetStarted: () => void;
  onSignIn: () => void;
};

const Landing = ({ onGetStarted, onSignIn }: LandingProps) => {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background">
      {/* Ambient pastel atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 45% at 20% 15%, hsl(var(--member-rose) / 0.55), transparent 70%),' +
            'radial-gradient(55% 40% at 85% 25%, hsl(var(--member-peach) / 0.5), transparent 70%),' +
            'radial-gradient(65% 55% at 75% 90%, hsl(var(--calendar-accent) / 0.55), transparent 70%),' +
            'radial-gradient(60% 50% at 10% 95%, hsl(var(--member-lavender) / 0.55), transparent 70%)',
        }}
      />

      <main className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col px-6 py-safe">
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="flex items-center justify-between pt-6"
        >
          <span
            className="font-heading text-lg font-extrabold tracking-tight text-foreground"
          >
            Pastelly
          </span>
          <button
            type="button"
            onClick={onSignIn}
            className="rounded-full px-4 py-2 text-sm font-semibold text-foreground/80 transition-colors hover:text-foreground"
          >
            Logg inn
          </button>
        </motion.header>

        <section className="flex flex-1 flex-col items-center justify-center text-center">
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.05 }}
            className="font-heading text-[15vw] font-extrabold leading-[0.95] tracking-tight text-foreground sm:text-8xl"
          >
            Pastelly
          </motion.h1>

          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.18 }}
            className="mt-6 max-w-md font-heading text-2xl font-semibold text-foreground/85 sm:text-3xl"
          >
            Delt kalender gjort enkelt
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.28 }}
            className="mt-4 max-w-sm text-base text-muted-foreground sm:text-lg"
          >
            En rolig kalender for hjemmet. Ikke mer enn du trenger.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.38 }}
            className="mt-10 flex flex-col items-center gap-3"
          >
            <button
              type="button"
              onClick={onGetStarted}
              className="rounded-2xl bg-green-200 px-8 py-3.5 text-base font-semibold text-green-900 shadow-sm transition-transform active:scale-[0.98]"
            >
              Kom i gang
            </button>
            <button
              type="button"
              onClick={onSignIn}
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              Har du konto? Logg inn
            </button>
          </motion.div>
        </section>

        <footer className="pb-6 pt-8 text-center text-xs text-muted-foreground/80">
          © {new Date().getFullYear()} Pastelly
        </footer>
      </main>
    </div>
  );
};

export default Landing;
