/**
 * Soft aura backgrounds that shift with local time of day —
 * glass calendar sits on top (Pastelly × glassmorphism refs).
 */

export type DayAtmosphereId = 'dawn' | 'morning' | 'day' | 'evening' | 'night';

export type DayAtmosphere = {
  id: DayAtmosphereId;
  /** Full-bleed page wash behind the glass calendar */
  wash: string;
  /** Soft color blobs (layered absolute divs) */
  blobs: { color: string; style: React.CSSProperties }[];
  /** Glass panel fill */
  glassBg: string;
  /** Text for dark night glass */
  isNight: boolean;
};

type BlobDef = { color: string; top?: string; left?: string; right?: string; bottom?: string; size: string; opacity: number };

function blobs(defs: BlobDef[]): DayAtmosphere['blobs'] {
  return defs.map((d) => ({
    color: d.color,
    style: {
      position: 'absolute' as const,
      width: d.size,
      height: d.size,
      borderRadius: '50%',
      background: d.color,
      opacity: d.opacity,
      filter: 'blur(48px)',
      top: d.top,
      left: d.left,
      right: d.right,
      bottom: d.bottom,
      pointerEvents: 'none' as const,
    },
  }));
}

const ATMOSPHERES: Record<DayAtmosphereId, Omit<DayAtmosphere, 'id'>> = {
  dawn: {
    wash: 'linear-gradient(165deg, #FFF5F0 0%, #FFE8F0 40%, #E8F0FF 100%)',
    glassBg: 'rgba(255,255,255,0.48)',
    isNight: false,
    blobs: blobs([
      { color: '#FFD4C8', top: '-8%', left: '-10%', size: '55%', opacity: 0.7 },
      { color: '#F5C0D8', top: '20%', right: '-15%', size: '50%', opacity: 0.55 },
      { color: '#C8E0F8', bottom: '-5%', left: '20%', size: '45%', opacity: 0.5 },
    ]),
  },
  morning: {
    wash: 'linear-gradient(160deg, #F0FFF8 0%, #E8F4FF 45%, #FFF0F5 100%)',
    glassBg: 'rgba(255,255,255,0.5)',
    isNight: false,
    blobs: blobs([
      { color: '#B8E8D0', top: '-10%', right: '-5%', size: '52%', opacity: 0.65 },
      { color: '#B8D8F5', top: '30%', left: '-18%', size: '48%', opacity: 0.55 },
      { color: '#F5D0E0', bottom: '5%', right: '10%', size: '40%', opacity: 0.5 },
    ]),
  },
  day: {
    wash: 'linear-gradient(155deg, #FFF9F0 0%, #F5F0FF 50%, #E8F8FF 100%)',
    glassBg: 'rgba(255,255,255,0.52)',
    isNight: false,
    blobs: blobs([
      { color: '#F5C8A8', top: '-5%', left: '15%', size: '42%', opacity: 0.55 },
      { color: '#D0B8F0', top: '25%', right: '-12%', size: '55%', opacity: 0.6 },
      { color: '#A8D8F0', bottom: '-8%', left: '-5%', size: '50%', opacity: 0.55 },
      { color: '#F0C0D0', bottom: '20%', right: '25%', size: '35%', opacity: 0.45 },
    ]),
  },
  evening: {
    wash: 'linear-gradient(150deg, #FFF0E8 0%, #F8E0F0 40%, #E0D0F8 100%)',
    glassBg: 'rgba(255,252,255,0.42)',
    isNight: false,
    blobs: blobs([
      { color: '#F0A070', top: '-8%', right: '-8%', size: '58%', opacity: 0.65 },
      { color: '#E070B0', top: '35%', left: '-15%', size: '50%', opacity: 0.55 },
      { color: '#9070D0', bottom: '-10%', right: '5%', size: '48%', opacity: 0.5 },
      { color: '#F5C090', bottom: '30%', left: '30%', size: '36%', opacity: 0.4 },
    ]),
  },
  night: {
    wash: 'linear-gradient(165deg, #2A2438 0%, #3A3050 45%, #1E2838 100%)',
    glassBg: 'rgba(40,36,56,0.45)',
    isNight: true,
    blobs: blobs([
      { color: '#6A5090', top: '-5%', left: '-10%', size: '55%', opacity: 0.55 },
      { color: '#4050A0', top: '40%', right: '-15%', size: '50%', opacity: 0.45 },
      { color: '#805070', bottom: '-5%', left: '20%', size: '45%', opacity: 0.4 },
    ]),
  },
};

export function resolveDayAtmosphereId(hour = new Date().getHours()): DayAtmosphereId {
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'day';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

export function getDayAtmosphere(date = new Date()): DayAtmosphere {
  const id = resolveDayAtmosphereId(date.getHours());
  return { id, ...ATMOSPHERES[id] };
}

/** Subtle grain overlay for aura depth (CSS data-uri noise is overkill — soft radial is enough). */
export const ATMOSPHERE_GRAIN =
  'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(0,0,0,0.04) 0%, transparent 45%)';
