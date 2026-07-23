import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { handleAuthCallbackUrl } from '@/lib/auth/handleAuthCallbackUrl';

const AuthCallback = () => {
  const navigate = useNavigate();
  const ranRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [loginHint, setLoginHint] = useState(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    (async () => {
      const result = await handleAuthCallbackUrl(window.location.href);
      if (result.ok === false) {
        setError(result.error);
        setLoginHint(result.action === 'login');
        return;
      }
      if (result.kind === 'recovery') {
        navigate('/auth/update-password', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    })();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm text-center"
        >
          <p className="text-5xl mb-4">⚠️</p>
          <h1 className="text-2xl font-bold mb-2">
            {loginHint ? 'Nesten ferdig' : 'Innlogging feilet'}
          </h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          {loginHint ? (
            <p className="text-sm font-medium text-foreground">
              Åpne Pastelly fra hjemskjermen for å logge inn.
            </p>
          ) : (
            <button
              onClick={() => navigate('/', { replace: true })}
              className="rounded-xl bg-green-200 px-4 py-2 font-semibold text-green-900"
            >
              Tilbake
            </button>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
        <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Logger deg inn...</p>
      </motion.div>
    </div>
  );
};

export default AuthCallback;
