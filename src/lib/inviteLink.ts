const STORAGE_KEY = 'pastelly_pending_invite_code';

/** Canonical web origin for invite links (works in share text even from native). */
export const INVITE_WEB_ORIGIN = 'https://pastelly.no';

export function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '');
}

export function isPlausibleInviteCode(code: string): boolean {
  // AB12-CD34 style from create_household_invite
  return /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code);
}

export function setPendingInviteCode(code: string): void {
  const normalized = normalizeInviteCode(code);
  if (!normalized) return;
  try {
    localStorage.setItem(STORAGE_KEY, normalized);
  } catch {
    /* ignore */
  }
}

export function peekPendingInviteCode(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const normalized = normalizeInviteCode(raw);
    return normalized || null;
  } catch {
    return null;
  }
}

export function consumePendingInviteCode(): string | null {
  const code = peekPendingInviteCode();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return code;
}

export function clearPendingInviteCode(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function buildInviteUrl(code: string): string {
  const normalized = normalizeInviteCode(code);
  return `${INVITE_WEB_ORIGIN}/join?code=${encodeURIComponent(normalized)}`;
}

export function buildInviteShareText(code: string, lines: {
  greeting: string;
  codeLabel: string;
  linkHint: string;
}): string {
  const normalized = normalizeInviteCode(code);
  const url = buildInviteUrl(normalized);
  return [
    lines.greeting,
    '',
    `${lines.codeLabel} ${normalized}`,
    url,
    '',
    lines.linkHint,
  ].join('\n');
}

/**
 * Read invite code from current URL (`/join?code=` or `/?code=`), persist it,
 * and strip query params so refresh doesn't re-apply forever.
 */
export function captureInviteCodeFromLocation(
  loc: Pick<Location, 'pathname' | 'search' | 'hash'> = window.location,
): string | null {
  try {
    const params = new URLSearchParams(loc.search);
    const fromQuery = params.get('code') || params.get('invite');
    let code = fromQuery ? normalizeInviteCode(fromQuery) : '';

    // Support /join/AB12-CD34
    if (!code && loc.pathname.startsWith('/join/')) {
      code = normalizeInviteCode(decodeURIComponent(loc.pathname.slice('/join/'.length)));
    }

    if (!code) return null;

    setPendingInviteCode(code);

    // Clean URL without losing other routes (e.g. stay on /join → /)
    const path = loc.pathname.startsWith('/join') ? '/' : loc.pathname;
    const next = `${path}${loc.hash || ''}`;
    window.history.replaceState({}, '', next || '/');

    return code;
  } catch {
    return null;
  }
}
