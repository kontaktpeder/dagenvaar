/**
 * Soft aura backgrounds that shift with local time of day —
 * glass calendar sits on top (Pastelly × glassmorphism refs).
 */

export type DayAtmosphereId = 'dawn' | 'morning' | 'day' | 'evening' | 'night';

export type AtmosphereBlob = {
  color: string;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  size: string;
  opacity: number;
};

export type DayAtmosphere = {
  id: DayAtmosphereId;
  /** Full-bleed page wash behind the glass calendar */
  wash: string;
  blobs: AtmosphereBlob[];
  /** Glass panel fill */
  glassBg: string;
  /** Weekday / chrome text on glass */
  mutedText: string;
  weekendText: string;
  /** True for dark night glass */
  isNight: boolean;
};

const ATMOSPHERES: Record<DayAtmosphereId, Omit<DayAtmosphere, 'id'>> = {
  dawn: {
    wash: 'linear-gradient(165deg, #FFF5F0 0%, #FFE8F0 40%, #E8F0FF 100%)',
    glassBg: 'rgba(255,255,255,0.48)',
    mutedText: 'rgba(60,40,50,0.4)',
    weekendText: 'rgba(200,90,120,0.55)',
    isNight: false,
    blobs: [
      { color: '#FFD4C8', top: '-8%', left: '-10%', size: '55%', opacity: 0.7 },
      { color: '#F5C0D8', top: '20%', right: '-15%', size: '50%', opacity: 0.55 },
      { color: '#C8E0F8', bottom: '-5%', left: '20%', size: '45%', opacity: 0.5 },
    ],
  },
  morning: {
    wash: 'linear-gradient(160deg, #F0FFF8 0%, #E8F4FF 45%, #FFF0F5 100%)',
    glassBg: 'rgba(255,255,255,0.5)',
    mutedText: 'rgba(40,50,60,0.38)',
    weekendText: 'rgba(80,140,160,0.55)',
    isNight: false,
    blobs: [
      { color: '#B8E8D0', top: '-10%', right: '-5%', size: '52%', opacity: 0.65 },
      { color: '#B8D8F5', top: '30%', left: '-18%', size: '48%', opacity: 0.55 },
      { color: '#F5D0E0', bottom: '5%', right: '10%', size: '40%', opacity: 0.5 },
    ],
  },
  day: {
    wash: 'linear-gradient(155deg, #FFF9F0 0%, #F5F0FF 50%, #E8F8FF 100%)',
    glassBg: 'rgba(255,255,255,0.52)',
    mutedText: 'rgba(50,45,60,0.38)',
    weekendText: 'rgba(180,90,130,0.5)',
    isNight: false,
    blobs: [
      { color: '#F5C8A8', top: '-5%', left: '15%', size: '42%', opacity: 0.55 },
      { color: '#D0B8F0', top: '25%', right: '-12%', size: '55%', opacity: 0.6 },
      { color: '#A8D8F0', bottom: '-8%', left: '-5%', size: '50%', opacity: 0.55 },
      { color: '#F0C0D0', bottom: '20%', right: '25%', size: '35%', opacity: 0.45 },
    ],
  },
  evening: {
    wash: 'linear-gradient(150deg, #FFF0E8 0%, #F8E0F0 40%, #E0D0F8 100%)',
    glassBg: 'rgba(255,252,255,0.42)',
    mutedText: 'rgba(70,40,70,0.42)',
    weekendText: 'rgba(190,80,140,0.55)',
    isNight: false,
    blobs: [
      { color: '#F0A070', top: '-8%', right: '-8%', size: '58%', opacity: 0.65 },
      { color: '#E070B0', top: '35%', left: '-15%', size: '50%', opacity: 0.55 },
      { color: '#9070D0', bottom: '-10%', right: '5%', size: '48%', opacity: 0.5 },
      { color: '#F5C090', bottom: '30%', left: '30%', size: '36%', opacity: 0.4 },
    ],
  },
  night: {
    wash: 'linear-gradient(165deg, #2A2438 0%, #3A3050 45%, #1E2838 100%)',
    glassBg: 'rgba(48,42,68,0.48)',
    mutedText: 'rgba(220,210,240,0.45)',
    weekendText: 'rgba(240,160,200,0.65)',
    isNight: true,
    blobs: [
      { color: '#6A5090', top: '-5%', left: '-10%', size: '55%', opacity: 0.55 },
      { color: '#4050A0', top: '40%', right: '-15%', size: '50%', opacity: 0.45 },
      { color: '#805070', bottom: '-5%', left: '20%', size: '45%', opacity: 0.4 },
    ],
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

/** Glass panel chrome (silver edge + frost). */
export function glassPanelShadow(isNight: boolean): string {
  if (isNight) {
    return [
      'inset 0 0 0 1px rgba(200,210,230,0.28)',
      'inset 0 1px 0 rgba(255,255,255,0.12)',
      '0 12px 40px rgba(0,0,0,0.35)',
    ].join(', ');
  }
  return [
    'inset 0 0 0 1px rgba(168,176,188,0.55)',
    'inset 0 1px 0 rgba(255,255,255,0.75)',
    '0 10px 36px rgba(90,70,100,0.12)',
  ].join(', ');
}
