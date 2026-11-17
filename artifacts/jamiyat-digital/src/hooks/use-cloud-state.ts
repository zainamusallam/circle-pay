import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

const LEGACY_IMPORT_OWNER_KEY = 'circle-pay:legacy-import-owner';

function parseState<T>(raw: string | null, isValid: (value: unknown) => value is T): T | null {
  if (!raw) return null;
  try {
    const candidate: unknown = JSON.parse(raw);
    return isValid(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

function claimLegacyState<T>(
  userId: string,
  stateKey: string,
  readLegacyState: (() => unknown) | undefined,
  isValid: (value: unknown) => value is T,
): T | null {
  try {
    const localState = parseState(localStorage.getItem(`circle-pay:${stateKey}:local`), isValid);
    const importOwnerKey = localState ? 'circle-pay:local-import-owner' : LEGACY_IMPORT_OWNER_KEY;
    const ownerId = localStorage.getItem(importOwnerKey);
    if (ownerId && ownerId !== userId) return null;
    const candidate = localState ?? readLegacyState?.();
    if (!isValid(candidate)) return null;
    if (!ownerId) localStorage.setItem(importOwnerKey, userId);
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
  const [canSave, setCanSave] = useState(false);
  const savedState = useRef<string | null>(null);
  const writes = useRef(Promise.resolve());
  const dirty = useRef(false);
  const latestState = useRef(state);
  latestState.current = state;

  useEffect(() => {
    let active = true;
    setState(initialState);
    setError(null);
    setSynced(false);
    setLoadedUserId(null);
    setCanSave(false);
    savedState.current = null;
    dirty.current = false;

    if (!userId || !supabase) {
      setLoading(false);
      setLoadedUserId(userId);
      return () => { active = false; };
    }

    const client = supabase;
    setLoading(true);
    const localKey = `circle-pay:${stateKey}:${userId}`;

    const loadCloudState = async () => {
      const { data, error: loadError } = await client
        .from('circle_pay_user_state')
        .select('state, updated_at')
        .eq('user_id', userId)
        .eq('state_key', stateKey)
        .maybeSingle();

      if (!active) return;
      let accountState: T | null = null;
      try {
        accountState = parseState(localStorage.getItem(localKey), isValid);
      } catch {
        // Continue with the cloud copy or a one-time import from the previous demo.
      }
      const importedState = loadError ? null : claimLegacyState(userId, stateKey, readLegacyState, isValid);

      if (loadError) {
        setError(loadError.message);
        setState(accountState ?? importedState ?? initialState);
      } else if (data && isValid(data.state)) {
        savedState.current = JSON.stringify(data.state);
        setState(data.state);
        setSynced(true);
        try { localStorage.setItem(localKey, JSON.stringify(data.state)); } catch { /* Supabase remains authoritative. */ }
      } else {
        setState(accountState ?? importedState ?? initialState);
      }
      setCanSave(!loadError);
      setLoading(false);
      setLoadedUserId(userId);
    };

    void loadCloudState();
    return () => { active = false; };
  }, [userId, stateKey, initialState, isValid, readLegacyState]);

  useEffect(() => {
    if (!userId || !supabase || loading || loadedUserId !== userId || !canSave) return;

    const client = supabase;
    let active = true;
    setSynced(false);
    const localKey = `circle-pay:${stateKey}:${userId}`;
    try { localStorage.setItem(localKey, JSON.stringify(state)); } catch { /* Cloud persistence still runs. */ }
    const serialized = JSON.stringify(state);
    if (savedState.current === serialized) {
      setSynced(true);
      return;
    }
    dirty.current = true;

    const timer = window.setTimeout(() => {
      writes.current = writes.current.catch(() => {}).then(async () => {
        const { error: saveError } = await client.from('circle_pay_user_state').upsert({
          user_id: userId, state_key: stateKey, state, updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,state_key' });
        if (!active) return;
        if (!saveError) savedState.current = serialized;
        dirty.current = Boolean(saveError) || JSON.stringify(latestState.current) !== serialized;
        setError(saveError?.message ?? null);
        setSynced(!dirty.current);
      });
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [userId, stateKey, state, loading, loadedUserId, canSave]);

  useEffect(() => {
    if (!userId || !supabase || loading || loadedUserId !== userId) return;
    const client = supabase;
    let active = true;
    const refresh = async () => {
      if (dirty.current) return;
      const before = JSON.stringify(latestState.current);
      const { data, error: refreshError } = await client
        .from('circle_pay_user_state')
        .select('state, updated_at')
        .eq('user_id', userId)
        .eq('state_key', stateKey)
        .maybeSingle();
      if (refreshError) {
        if (active) setError(refreshError.message);
        return;
      }
      const cloudState = data?.state;
      if (active && !dirty.current && before === JSON.stringify(latestState.current) && isValid(cloudState) && JSON.stringify(cloudState) !== before) {
        savedState.current = JSON.stringify(cloudState);
        setState(cloudState);
        try { localStorage.setItem(`circle-pay:${stateKey}:${userId}`, JSON.stringify(cloudState)); } catch { /* Supabase remains authoritative. */ }
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

  return { state, setState, loading: loading || Boolean(userId && loadedUserId !== userId), error, synced };
}
