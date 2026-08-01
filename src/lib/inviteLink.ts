const STORAGE_KEY = 'pastelly_pending_invite_code';

/** Canonical web origin for invite links (works in share text even from native). */
export const INVITE_WEB_ORIGIN = 'https://pastelly.no';

export function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '');
}

export function isPlausibleInviteCode(code: string): boolean {
  // AB12-CD34 style from create_household_invite (exactly 8 chars + hyphen)
  return /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code);
}

/**
 * Pull a short invite code out of share text / clipboard without matching
 * fragments inside UUIDs or auth tokens.
 */
export function extractInviteCodeFromText(raw: string): string | null {
  const text = raw.toUpperCase();

  const labeled = text.match(
    /(?:KODE|CODE)\s*[:：]?\s*([A-Z0-9]{4}-[A-Z0-9]{4})(?![A-Z0-9-])/,
  );
  if (labeled?.[1] && isPlausibleInviteCode(labeled[1])) return labeled[1];

  const fromUrl = text.match(/[?&](?:CODE|INVITE)=([A-Z0-9]{4}-[A-Z0-9]{4})(?![A-Z0-9-])/);
  if (fromUrl?.[1] && isPlausibleInviteCode(fromUrl[1])) return fromUrl[1];

  // Standalone XXXX-XXXX — not adjacent to more hex/hyphens (avoids UUID slices).
  // Avoid lookbehind for older iOS WebViews.
  const standalone = text.match(/(?:^|[^A-Z0-9-])([A-Z0-9]{4}-[A-Z0-9]{4})(?![A-Z0-9-])/);
  if (standalone?.[1] && isPlausibleInviteCode(standalone[1])) return standalone[1];

  const normalized = normalizeInviteCode(raw);
  return isPlausibleInviteCode(normalized) ? normalized : null;
}

export function setPendingInviteCode(code: string): void {
  const normalized = normalizeInviteCode(code);
  if (!isPlausibleInviteCode(normalized)) return;
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
    if (!isPlausibleInviteCode(normalized)) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return normalized;
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

function isAuthPath(pathname: string): boolean {
  return pathname === '/auth' || pathname.startsWith('/auth/');
}

function isJoinPath(pathname: string): boolean {
  return pathname === '/join' || pathname.startsWith('/join/');
}

/**
 * Read invite code from current URL (`/join?code=` or `/join/AB12-CD34`),
 * persist it only when it looks like a real invite code, and strip invite
 * params so refresh doesn't re-apply forever.
 *
 * Never treats auth PKCE `?code=` as an invite (skips `/auth/*`, requires
 * AB12-CD34 shape).
 */
export function captureInviteCodeFromLocation(
  loc: Pick<Location, 'pathname' | 'search' | 'hash'> = window.location,
): string | null {
  try {
    if (isAuthPath(loc.pathname)) return null;

    const params = new URLSearchParams(loc.search);
    const fromInviteParam = params.get('invite');
    const fromCodeParam = params.get('code');
    let code = '';

    if (fromInviteParam) {
      code = normalizeInviteCode(fromInviteParam);
    } else if (fromCodeParam && (isJoinPath(loc.pathname) || loc.pathname === '/')) {
      // ?code= on /join is an invite. On / only accept if plausible (auth
      // callbacks use /auth/callback; stray long codes are rejected below).
      code = normalizeInviteCode(fromCodeParam);
    }

    // Support /join/AB12-CD34
    if (!code && loc.pathname.startsWith('/join/')) {
      code = normalizeInviteCode(decodeURIComponent(loc.pathname.slice('/join/'.length)));
    }

    if (!isPlausibleInviteCode(code)) return null;

    setPendingInviteCode(code);

    // Clean URL without losing other routes (e.g. stay on /join → /)
    const path = isJoinPath(loc.pathname) ? '/' : loc.pathname;
    const next = `${path}${loc.hash || ''}`;
    window.history.replaceState({}, '', next || '/');

    return code;
  } catch {
    return null;
  }
}

/** Map Postgres / network join errors to user-facing copy keys. */
export function inviteJoinErrorKind(
  message: string | undefined | null,
): 'format' | 'invalid' | 'already' | 'generic' {
  if (!message) return 'generic';
  const m = message.toLowerCase();
  if (m.includes('allerede medlem') || m.includes('already')) return 'already';
  if (m.includes('invalid') || m.includes('expired') || m.includes('ugyldig') || m.includes('utløpt')) {
    return 'invalid';
  }
  return 'generic';
}
