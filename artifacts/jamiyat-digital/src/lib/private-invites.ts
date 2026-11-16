export function normalizePrivateInviteCode(value: string): string {
  const input = value.trim();
  let candidate = input;

  try {
    candidate = new URL(input).searchParams.get('invite') ?? input;
  } catch {
    const queryCode = input.match(/[?&]invite=([^&#]+)/i)?.[1];
    if (queryCode) {
      try {
        candidate = decodeURIComponent(queryCode);
      } catch {
        candidate = queryCode;
      }
    }
  }

  const compact = candidate.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const suffix = compact.startsWith('CP') ? compact.slice(2) : compact;
  return /^[A-Z0-9]{6}$/.test(suffix) ? `CP-${suffix}` : candidate.trim().toUpperCase();
}
