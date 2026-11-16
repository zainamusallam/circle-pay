import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildCircle, type Circle } from '@/lib/circles';
import { collectMonth, ensureWallets, initialFunding, simulateBilling, type FundingState } from '@/lib/funding';
import { upgradeFundingState } from '@/lib/funding-migration';
import { normalizePrivateInviteCode } from '@/lib/private-invites';
import { supabase } from '@/lib/supabase';
import { useCloudState } from './use-cloud-state';

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

function circleFromRow(value: unknown, ownerId: string, inviteCode: string): Circle | null {
  if (!value || typeof value !== 'object') return null;
  const circle = value as Circle;
  if (typeof circle.id !== 'string' || !Array.isArray(circle.members) || !Array.isArray(circle.schedule)) return null;
  return { ...circle, ownerId, inviteCode };
}

function mapOwnMemberToUser(circle: Circle, ownName: string): Circle {
  if (!ownName || ownName === 'Ahmed') return circle;
  return {
    ...circle,
    members: circle.members.map((member) => member === ownName ? 'Ahmed' : member),
    schedule: circle.schedule.map((entry) => ({
      ...entry,
      recipient: entry.recipient === ownName ? 'Ahmed' : entry.recipient,
      funding: entry.funding ? {
        ...entry.funding,
        payments: entry.funding.payments.map((payment) => ({
          ...payment,
          member: payment.member === ownName ? 'Ahmed' : payment.member,
        })),
      } : undefined,
    })),
  };
}

export function useCircles(userId: string | null) {
  const initial = useMemo(() => initialFunding(), []);
  const cloud = useCloudState(userId, 'funding', initial, isFundingState, readLegacyFundingState);
  const { state, setState } = cloud;
  const latestCircles = useRef(state.circles);
  latestCircles.current = state.circles;
  const [privateCircleError, setPrivateCircleError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !supabase || cloud.loading) return;
    const client = supabase;
    let active = true;
    const syncPrivateCircles = async () => {
      const [circlesResult, membersResult] = await Promise.all([
        client.from('private_circles').select('id, owner_id, invite_code, circle_data'),
        client.from('private_circle_members').select('circle_id, member_name').eq('user_id', userId),
      ]);
      if (!active) return;
      const error = circlesResult.error ?? membersResult.error;
      if (error) {
        setPrivateCircleError(error.message);
        return;
      }
      setPrivateCircleError(null);
      const ownNames = new Map((membersResult.data ?? []).map((member) => [member.circle_id, member.member_name]));
       const remote = (circlesResult.data ?? []).flatMap((row) => {
        const circle = circleFromRow(row.circle_data, row.owner_id, row.invite_code);
        if (!circle) return [];
        const ownName = ownNames.get(row.id);
        return [ownName ? mapOwnMemberToUser(circle, ownName) : circle];
      });
      const registeredIds = new Set(remote.map((circle) => circle.id));
      const legacyPrivateCircles = latestCircles.current.filter((circle) =>
        circle.inviteCode && !circle.ownerId && !registeredIds.has(circle.id),
      );
      const newlyRegistered: Circle[] = [];
      for (const circle of legacyPrivateCircles) {
        const inviteCode = normalizePrivateInviteCode(circle.inviteCode ?? '');
        const { data, error: registrationError } = await client.rpc('create_private_circle', {
          p_circle_id: circle.id,
          p_invite_code: inviteCode,
          p_circle_data: { ...circle, inviteCode },
        });
        if (registrationError) {
          setPrivateCircleError(`Could not enable invite ${circle.inviteCode}: ${registrationError.message}`);
          continue;
        }
        const saved = circleFromRow(data, userId, inviteCode);
        if (saved) newlyRegistered.push(saved);
      }
      remote.push(...newlyRegistered);
      setState((current) => {
        const remoteById = new Map(remote.map((circle) => [circle.id, circle]));
        const merged = current.circles.map((circle) => remoteById.get(circle.id) ?? circle);
        const known = new Set(merged.map((circle) => circle.id));
        for (const circle of remote) if (!known.has(circle.id)) merged.push(circle);
        return { ...current, circles: merged, wallets: ensureWallets(merged, current.wallets) };
      });
    };
    void syncPrivateCircles();
    return () => { active = false; };
  }, [userId, cloud.loading, setState]);

  useEffect(() => {
    if (!userId || !supabase || cloud.loading) return;
    const client = supabase;
    let active = true;
    const owned = state.circles.filter((circle) => circle.ownerId === userId && circle.inviteCode);
    const timer = window.setTimeout(() => {
      void Promise.all(owned.map(async (circle) => {
        const { error } = await client
          .from('private_circles')
          .update({ circle_data: circle })
          .eq('id', circle.id)
          .eq('owner_id', userId);
        if (active && error) setPrivateCircleError(error.message);
      }));
    }, 400);
    return () => { active = false; window.clearTimeout(timer); };
  }, [state.circles, userId, cloud.loading]);

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
  const addPrivateCircle = useCallback(async (input: Parameters<typeof buildCircle>[0]) => {
    if (!userId || !supabase || !input.inviteCode) throw new Error('Sign in and set up Supabase to create a private circle.');
    const circle = buildCircle(input);
    const { data, error } = await supabase.rpc('create_private_circle', {
      p_circle_id: circle.id,
      p_invite_code: circle.inviteCode,
      p_circle_data: circle,
    });
    if (error) throw error;
    const saved = circleFromRow(data, userId, circle.inviteCode!) ?? { ...circle, ownerId: userId };
    setState((current) => {
      const circles = [...current.circles.filter((item) => item.id !== saved.id), saved];
      return { ...current, circles, wallets: ensureWallets(circles, current.wallets) };
    });
    return saved;
  }, [userId, setState]);
  const joinByInviteCode = useCallback(async (code: string, memberName: string) => {
    if (!userId || !supabase) return null;
    const { data, error } = await supabase.rpc('join_private_circle', {
      p_invite_code: normalizePrivateInviteCode(code),
      p_member_name: memberName.trim(),
    });
    if (error) throw error;
    const remote = data as Circle;
    const circle = circleFromRow(remote, remote.ownerId ?? '', remote.inviteCode ?? '') ?? remote;
    const currentView = mapOwnMemberToUser(circle, memberName.trim());
    setState((current) => {
      const circles = [...current.circles.filter((item) => item.id !== currentView.id), currentView];
      return { ...current, circles, wallets: ensureWallets(circles, current.wallets) };
    });
    return currentView;
  }, [userId, setState]);
  const removeCircle = useCallback((id: string) => {
    // Do not allow deletion to silently discard held simulated funds.
    const circle = state.circles.find((item) => item.id === id);
    if (circle?.ownerId === userId && supabase) {
      void supabase.from('private_circles').delete().eq('id', id).eq('owner_id', userId);
    }
    setState((s) => ({ ...s, circles: s.circles.filter((c) =>
      c.id !== id || c.schedule.some((e) => !e.collected && !!e.funding?.payments.length)) }));
  }, [state.circles, userId, setState]);
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
    userId,
    loading: cloud.loading,
    synced: cloud.synced,
    storageError: Boolean(cloud.error || privateCircleError),
    storageMessage: cloud.error || privateCircleError,
    markPaid, undoPaid, markCollected, undoCollected,
    addCircle, addPrivateCircle, joinByInviteCode, removeCircle, toggleAutoDebit, simulateNextMonth, reset,
  };
}
export type CirclesApi = ReturnType<typeof useCircles>;
