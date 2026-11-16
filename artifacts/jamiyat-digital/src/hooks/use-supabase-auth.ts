import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { isSupabaseConfigured, missingSupabaseConfig, supabase } from '@/lib/supabase';

export function useSupabaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      setUser(null);
      setError(null);
      return;
    }

    let active = true;
    const client = supabase;
    setLoading(true);
    setError(null);
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (session?.user) {
        setUser(session.user);
        setError(null);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    const initialize = async () => {
      const { data, error: sessionError } = await client.auth.getSession();
      if (sessionError) throw sessionError;
      if (data.session?.user) {
        if (active) setUser(data.session.user);
        return;
      }

      const { data: anonymousData, error: anonymousError } = await client.auth.signInAnonymously();
      if (anonymousError) throw anonymousError;
      if (!anonymousData.session?.user) throw new Error('Circle Pay could not start a demo session.');
      if (active) setUser(anonymousData.session.user);
    };

    void initialize()
      .catch((authError) => {
        if (!active) return;
        setUser(null);
        setError(authError instanceof Error ? authError.message : 'Could not start a demo session.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setError(null);
    setLoading(true);
    setAttempt((current) => current + 1);
  }, []);

  return { user, loading, error, retry, configured: isSupabaseConfigured, missingConfig: missingSupabaseConfig };
}

export const authDisplayName = (user: User | null) => {
  const metadataName = user?.user_metadata?.display_name;
  return typeof metadataName === 'string' && metadataName.trim()
    ? metadataName.trim()
    : user?.email?.split('@')[0] || 'User';
};
