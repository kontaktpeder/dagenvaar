import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

/**
 * Auth callback landing page. Supabase processes hash/code fragments automatically
 * on load via detectSessionInUrl; we just wait for the session then redirect.
 */
const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const complete = async () => {
      // Handle explicit PKCE ?code= flow
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
      }
      if (mounted) navigate('/', { replace: true });
    };

    // Give supabase-js a tick to detect tokens in the URL hash
    const t = window.setTimeout(complete, 100);
    return () => {
      mounted = false;
      window.clearTimeout(t);
    };
  }, [navigate]);

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
