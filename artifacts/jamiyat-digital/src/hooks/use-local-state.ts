import { useEffect, useState } from 'react';

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

function loadState<T>(
  stateKey: string,
  initialState: T,
  isValid: (value: unknown) => value is T,
  readLegacyState?: () => unknown,
): T {
  if (typeof window === 'undefined') return initialState;

  const prefix = `circle-pay:${stateKey}:`;
  const localKey = `${prefix}local`;
  try {
    const current = parseState(localStorage.getItem(localKey), isValid);
    if (current) return current;

    const previousOwner = localStorage.getItem(LEGACY_IMPORT_OWNER_KEY);
    if (previousOwner) {
      const previousAccountState = parseState(localStorage.getItem(`${prefix}${previousOwner}`), isValid);
      if (previousAccountState) return previousAccountState;
    }

    const accountKeys = Object.keys(localStorage).filter((key) => key.startsWith(prefix) && key !== localKey);
    const accountStates = accountKeys
      .map((key) => parseState(localStorage.getItem(key), isValid))
      .filter((value): value is T => value !== null);
    if (accountStates.length === 1) return accountStates[0];

    const legacy = readLegacyState?.();
    if (isValid(legacy)) return legacy;
  } catch {
    // Keep the demo usable with its initial data if local storage is unavailable.
  }

  return initialState;
}

export function useLocalState<T>(
  stateKey: string,
  initialState: T,
  isValid: (value: unknown) => value is T,
  readLegacyState?: () => unknown,
) {
  const localKey = `circle-pay:${stateKey}:local`;
  const [state, setState] = useState<T>(() => loadState(stateKey, initialState, isValid, readLegacyState));
  const [error, setError] = useState<string | null>(null);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(localKey, JSON.stringify(state));
      setError(null);
      setSynced(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save demo data on this device.');
      setSynced(false);
    }
  }, [localKey, state]);

  return { state, setState, loading: false, error, synced };
}
