import { useCallback, useMemo } from 'react';
import { buildCircle, type Circle } from '@/lib/circles';
import { collectMonth, ensureWallets, initialFunding, simulateBilling, type FundingState } from '@/lib/funding';
import { upgradeFundingState } from '@/lib/funding-migration';
import { normalizePrivateInviteCode } from '@/lib/private-invites';
import { useLocalState } from './use-local-state';

function isFundingState(value: unknown): value is FundingState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<FundingState>;
  return Array.isArray(state.circles) && Array.isArray(state.wallets) &&
    Array.isArray(state.transactions) && typeof state.simulatedDate === 'string';
}

function readLegacyFundingState(): unknown {
  try {
    const current = localStorage.getItem('jamiyat-digital:funding:v1');
    if (current) {
      const parsed: unknown = JSON.parse(current);
      if (isFundingState(parsed)) return upgradeFundingState(parsed);
    }
    const legacy = localStorage.getItem('jamiyat-digital:v1');
    if (legacy) {
      const circles: unknown = JSON.parse(legacy);
      if (Array.isArray(circles)) return initialFunding(circles as Circle[]);
    }
  } catch {
    // Malformed legacy data is left untouched; the account receives demo defaults.
  }
  return null;
}

export function useCircles() {
  const initial = useMemo(() => initialFunding(), []);
  const cloud = useLocalState('funding', initial, isFundingState, readLegacyFundingState);
  const { state, setState } = cloud;

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
  const addPrivateCircle = useCallback((input: Parameters<typeof buildCircle>[0]) => {
    if (!input.inviteCode) throw new Error('Private circles require an invite code.');
    const circle = buildCircle(input);
    setState((current) => {
      const circles = [...current.circles.filter((item) => item.id !== circle.id), circle];
      return { ...current, circles, wallets: ensureWallets(circles, current.wallets) };
    });
    return circle;
  }, [setState]);
  const joinByInviteCode = useCallback((code: string, memberName: string) => {
    const normalizedCode = normalizePrivateInviteCode(code);
    const normalizedName = memberName.trim();
    const circle = state.circles.find((item) => normalizePrivateInviteCode(item.inviteCode ?? '') === normalizedCode);
    if (!circle) {
      throw new Error('No circle with that code is saved in this browser. Cross-device joining is paused while cloud storage is off.');
    }
    if (circle.members.some((member) => member.toLocaleLowerCase() === normalizedName.toLocaleLowerCase())) {
      throw new Error('That name is already in this circle.');
    }
    const openSpotIndex = circle.members.findIndex((member) => member.startsWith('Open spot '));
    if (openSpotIndex < 0) throw new Error('This circle has no open participant spots.');
    const openSpot = circle.members[openSpotIndex];
    const updatedCircle: Circle = {
      ...circle,
      members: circle.members.map((member, index) => index === openSpotIndex ? normalizedName : member),
      schedule: circle.schedule.map((entry) => entry.recipient === openSpot ? { ...entry, recipient: normalizedName } : entry),
    };
    setState((current) => {
      const circles = current.circles.map((item) => item.id === updatedCircle.id ? updatedCircle : item);
      return { ...current, circles, wallets: ensureWallets(circles, current.wallets) };
    });
    return updatedCircle;
  }, [state.circles, setState]);
  const removeCircle = useCallback((id: string) => {
    // Do not allow deletion to silently discard held simulated funds.
    setState((s) => ({ ...s, circles: s.circles.filter((c) =>
      c.id !== id || c.schedule.some((e) => !e.collected && !!e.funding?.payments.length)) }));
  }, [setState]);
  const toggleAutoDebit = useCallback((id: string, enabled: boolean) => {
    setState((s) => ({ ...s, circles: s.circles.map((c) => c.id !== id ? c : { ...c, autoDebit: enabled }) }));
  }, []);
  const simulateNextMonth = useCallback(() => {
    const timestamp = new Date().toISOString();
    setState((s) => simulateBilling(s, timestamp));
  }, []);
  const reset = useCallback(() => setState(initialFunding()), []);

  return {
    ...state,
    loading: cloud.loading,
    synced: cloud.synced,
    storageError: Boolean(cloud.error),
    storageMessage: cloud.error,
    markPaid, undoPaid, markCollected, undoCollected,
    addCircle, addPrivateCircle, joinByInviteCode, removeCircle, toggleAutoDebit, simulateNextMonth, reset,
  };
}
export type CirclesApi = ReturnType<typeof useCircles>;
