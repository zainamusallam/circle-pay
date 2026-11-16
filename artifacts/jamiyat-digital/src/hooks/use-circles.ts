import { useCallback, useEffect, useState } from 'react';
import { buildCircle, type Circle } from '@/lib/circles';
import { collectMonth, ensureWallets, initialFunding, simulateBilling, type FundingState } from '@/lib/funding';
import { upgradeFundingState } from '@/lib/funding-migration';

const KEY = 'jamiyat-digital:funding:v1';
const LEGACY_KEY = 'jamiyat-digital:v1';

function load(): FundingState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as FundingState;
      if (Array.isArray(parsed.circles) && Array.isArray(parsed.wallets) &&
          Array.isArray(parsed.transactions) && typeof parsed.simulatedDate === 'string') return upgradeFundingState(parsed);
    }
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const circles = JSON.parse(legacy);
      if (Array.isArray(circles)) return initialFunding(circles as Circle[]);
    }
  } catch { /* Unavailable or invalid browser storage starts a fresh local demo. */ }
  return initialFunding();
}

export function useCircles() {
  const [state, setState] = useState<FundingState>(load);
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); setStorageError(false); }
    catch { setStorageError(true); }
  }, [state]);

  const patchMonth = useCallback((id: string, month: number, paid: boolean) => {
    setState((s) => ({ ...s, circles: s.circles.map((c) => c.id !== id ? c : {
      ...c, schedule: c.schedule.map((e) =>
        e.month !== month || e.funding || e.collected ? e : { ...e, paid }),
    }) }));
  }, []);
  const markPaid = useCallback((id: string, month: number) => patchMonth(id, month, true), [patchMonth]);
  const undoPaid = useCallback((id: string, month: number) => patchMonth(id, month, false), [patchMonth]);
  const markCollected = useCallback((id: string, month: number) => {
    const timestamp = new Date().toISOString();
    setState((s) => collectMonth(s, id, month, timestamp));
  }, []);
  const undoCollected = useCallback((id: string, month: number) => {
    setState((s) => ({ ...s, circles: s.circles.map((c) => c.id !== id ? c : {
      ...c, schedule: c.schedule.map((e) =>
        e.month !== month || e.funding || c.schedule.some((x) => x.month > month && x.collected)
          ? e : { ...e, collected: false }),
    }) }));
  }, []);
  const addCircle = useCallback((input: Parameters<typeof buildCircle>[0]) => {
    const circle = buildCircle(input);
    setState((s) => {
      const circles = [...s.circles, circle];
      return { ...s, circles, wallets: ensureWallets(circles, s.wallets) };
    });
    return circle;
  }, []);
  const joinByInviteCode = useCallback((code: string, memberName: string) => {
    const normalizedCode = code.trim().toUpperCase();
    const normalizedName = memberName.trim();
    const circle = state.circles.find((item) => item.inviteCode?.toUpperCase() === normalizedCode);
    if (!circle || !normalizedName) return null;
    if (circle.members.some((member) => member.toLocaleLowerCase() === normalizedName.toLocaleLowerCase())) return null;
    const openSpot = circle.members.find((member) => member.startsWith('Open spot '));
    if (!openSpot) return null;
    const updatedCircle = {
      ...circle,
      members: circle.members.map((member) => member === openSpot ? normalizedName : member),
      schedule: circle.schedule.map((entry) => entry.recipient === openSpot ? { ...entry, recipient: normalizedName } : entry),
    };
    setState((current) => ({
      ...current,
      circles: current.circles.map((item) => item.id === circle.id ? updatedCircle : item),
      wallets: ensureWallets(
        current.circles.map((item) => item.id === circle.id ? updatedCircle : item),
        current.wallets,
      ),
    }));
    return updatedCircle;
  }, [state.circles]);
  const removeCircle = useCallback((id: string) => {
    // Do not allow deletion to silently discard held simulated funds.
    setState((s) => ({ ...s, circles: s.circles.filter((c) =>
      c.id !== id || c.schedule.some((e) => !e.collected && !!e.funding?.payments.length)) }));
  }, []);
  const toggleAutoDebit = useCallback((id: string, enabled: boolean) => {
    setState((s) => ({ ...s, circles: s.circles.map((c) => c.id !== id ? c : { ...c, autoDebit: enabled }) }));
  }, []);
  const simulateNextMonth = useCallback(() => {
    const timestamp = new Date().toISOString();
    setState((s) => simulateBilling(s, timestamp));
  }, []);
  const reset = useCallback(() => setState(initialFunding()), []);

  return {
    ...state, storageError, markPaid, undoPaid, markCollected, undoCollected,
    addCircle, joinByInviteCode, removeCircle, toggleAutoDebit, simulateNextMonth, reset,
  };
}
export type CirclesApi = ReturnType<typeof useCircles>;
