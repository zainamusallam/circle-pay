import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

const LEGACY_IMPORT_OWNER_KEY = 'circle-pay:legacy-import-owner';

function claimLegacyState<T>(
  userId: string,
  readLegacyState: (() => unknown) | undefined,
  isValid: (value: unknown) => value is T,
): T | null {
  if (!readLegacyState) return null;
  try {
    const candidate = readLegacyState();
    if (!isValid(candidate)) return null;
    const ownerId = localStorage.getItem(LEGACY_IMPORT_OWNER_KEY);
    if (ownerId && ownerId !== userId) return null;
    if (!ownerId) localStorage.setItem(LEGACY_IMPORT_OWNER_KEY, userId);
    return candidate;
  } catch {
    return null;
  }
}

export function useCloudState<T>(
  userId: string | null,
  stateKey: string,
  initialState: T,
  isValid: (value: unknown) => value is T,
  readLegacyState?: () => unknown,
) {
  const [state, setState] = useState<T>(initialState);
  const [loading, setLoading] = useState(Boolean(userId && supabase));
  const [error, setError] = useState<string | null>(null);
  const [synced, setSynced] = useState(false);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const latestState = useRef(state);
  latestState.current = state;

  useEffect(() => {
    let active = true;
    setState(initialState);
    setError(null);
    setSynced(false);
    setLoadedUserId(null);

    if (!userId || !supabase) {
      setLoading(false);
        setSynced(false);
      setLoadedUserId(userId);
      return () => { active = false; };
    }

    const client = supabase;
    setLoading(true);
    const localKey = `circle-pay:${stateKey}:${userId}`;
    let localState: T | null = null;
    try {
      const raw = localStorage.getItem(localKey);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (isValid(parsed)) localState = parsed;
      }
    } catch {
      // Continue with the cloud copy or the supplied initial state.
    }

    const loadCloudState = async () => {
      const { data, error: loadError } = await client
        .from('circle_pay_user_state')
        .select('state, updated_at')
        .eq('user_id', userId)
        .eq('state_key', stateKey)
        .maybeSingle();

      if (!active) return;
      const cloudState = data?.state;
      const legacyState = loadError ? null : claimLegacyState(userId, readLegacyState, isValid);
      if (loadError) {
        setError(loadError.message);
        setState(localState ?? initialState);
      } else if (isValid(cloudState)) {
        setState(cloudState);
        setSynced(true);
        try { localStorage.setItem(localKey, JSON.stringify(cloudState)); } catch { /* Cloud remains authoritative. */ }
      } else {
        setState(localState ?? legacyState ?? initialState);
      }
      setLoading(false);
      setLoadedUserId(userId);
    };

    void loadCloudState();
    return () => { active = false; };
  }, [userId, stateKey, initialState, isValid, readLegacyState]);

  useEffect(() => {
    if (!userId || !supabase || loading || loadedUserId !== userId) return;

    const client = supabase;
    let active = true;
    setSynced(false);
    const localKey = `circle-pay:${stateKey}:${userId}`;
    try { localStorage.setItem(localKey, JSON.stringify(state)); } catch { /* Cloud persistence still runs. */ }

    const timer = window.setTimeout(() => {
      void client.from('circle_pay_user_state').upsert({
        user_id: userId,
        state_key: stateKey,
        state,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,state_key' }).then(({ error: saveError }) => {
        if (active) {
          setError(saveError?.message ?? null);
          setSynced(!saveError);
        }
      });
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [userId, stateKey, state, loading, loadedUserId]);

  useEffect(() => {
    if (!userId || !supabase || loading || loadedUserId !== userId) return;
    const client = supabase;
    let active = true;
    const refresh = async () => {
      const { data } = await client
        .from('circle_pay_user_state')
        .select('state, updated_at')
        .eq('user_id', userId)
        .eq('state_key', stateKey)
        .maybeSingle();
      const cloudState = data?.state;
      if (active && isValid(cloudState) && JSON.stringify(cloudState) !== JSON.stringify(latestState.current)) {
        setState(cloudState);
      }
    };
    const interval = window.setInterval(() => { void refresh(); }, 30_000);
    window.addEventListener('focus', refresh);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
    };
  }, [userId, stateKey, loading, loadedUserId, isValid]);

  return { state, setState, loading, error, synced };
}
