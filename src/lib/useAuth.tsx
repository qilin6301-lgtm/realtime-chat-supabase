import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function init() {
      const {
        data: { user: currentUser }
      } = await supabase.auth.getUser();
      if (!mounted) return;
      setUser(currentUser);
      setLoading(false);
    }
    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub?.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    return await supabase.auth.signInWithPassword({ email, password });
  }

  async function signOut() {
    return await supabase.auth.signOut();
  }

  return { user, loading, signIn, signOut };
}
