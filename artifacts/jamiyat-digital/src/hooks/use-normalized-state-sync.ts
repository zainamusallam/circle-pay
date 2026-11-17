import { useEffect, useRef, useState } from 'react';
import type { FundingState } from '@/lib/funding';
import type { PublicCircle } from '@/lib/public-circles';
import { supabase } from '@/lib/supabase';

export function useNormalizedStateSync(
  userId: string | null,
  funding: FundingState,
  publicCircles: PublicCircle[],
  joinRequests: string[],
  enabled: boolean,
) {
  const [error, setError] = useState<string | null>(null);
  const [synced, setSynced] = useState(false);
  const writes = useRef(Promise.resolve());

  useEffect(() => {
    if (!userId || !supabase || !enabled) {
      setSynced(false);
      return;
    }

    const client = supabase;
    let active = true;
    setSynced(false);
    setError(null);
    const timer = window.setTimeout(() => {
      writes.current = writes.current.catch(() => {}).then(async () => {
        const { error: syncError } = await client.rpc('sync_circle_pay_normalized_state', {
          p_funding: funding,
          p_public_circles: publicCircles,
          p_join_requests: joinRequests,
        });
        if (!active) return;
        setError(syncError?.message ?? null);
        setSynced(!syncError);
      });
    }, 500);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [userId, funding, publicCircles, joinRequests, enabled]);

  return { error, synced };
}
