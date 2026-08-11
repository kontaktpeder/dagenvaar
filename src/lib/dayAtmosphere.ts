/**
 * Soft aura + frosted glass calendar (Yooga-style).
 * One wash, one glass plate with thin white frame — content sits inside.
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
  wash: string;
  blobs: AtmosphereBlob[];
  glassBg: string;
  /** Primary ink (month title, day numbers) */
  ink: string;
  mutedText: string;
  weekendText: string;
  isNight: boolean;
};

const ATMOSPHERES: Record<DayAtmosphereId, Omit<DayAtmosphere, 'id'>> = {
  dawn: {
    wash: 'linear-gradient(160deg, #FDE7F1 0%, #F6DCF6 45%, #E4DDFB 100%)',
    glassBg: 'rgba(255,255,255,0.4)',
    ink: 'rgba(55,40,55,0.9)',
    mutedText: 'rgba(72,48,80,0.42)',
    weekendText: 'rgba(214,92,144,0.58)',
    isNight: false,
    blobs: [
      { color: '#FFB6D5', top: '-10%', left: '-12%', size: '62%', opacity: 0.85 },
      { color: '#C9A7F5', top: '18%', right: '-18%', size: '58%', opacity: 0.75 },
      { color: '#9FC6FA', bottom: '-8%', left: '15%', size: '55%', opacity: 0.65 },
      { color: '#FFD3B0', bottom: '25%', right: '18%', size: '38%', opacity: 0.55 },
    ],
  },
  morning: {
    wash: 'linear-gradient(155deg, #E6FBF2 0%, #E3EEFE 45%, #FBE3F4 100%)',
    glassBg: 'rgba(255,255,255,0.42)',
    ink: 'rgba(40,48,58,0.9)',
    mutedText: 'rgba(48,60,80,0.4)',
    weekendText: 'rgba(86,150,178,0.58)',
    isNight: false,
    blobs: [
      { color: '#9AE7C8', top: '-12%', right: '-8%', size: '60%', opacity: 0.8 },
      { color: '#9EC7FA', top: '26%', left: '-20%', size: '58%', opacity: 0.75 },
      { color: '#F7B8DC', bottom: '-6%', right: '5%', size: '50%', opacity: 0.7 },
      { color: '#D7BCF7', bottom: '30%', left: '25%', size: '36%', opacity: 0.5 },
    ],
  },
  day: {
    wash: 'linear-gradient(150deg, #FFF3E6 0%, #F2E6FE 48%, #DFF3FE 100%)',
    glassBg: 'rgba(255,255,255,0.44)',
    ink: 'rgba(48,42,58,0.9)',
    mutedText: 'rgba(58,50,74,0.4)',
    weekendText: 'rgba(206,92,148,0.55)',
    isNight: false,
    blobs: [
      { color: '#FFC49A', top: '-8%', left: '10%', size: '50%', opacity: 0.75 },
      { color: '#C6A5F7', top: '22%', right: '-16%', size: '62%', opacity: 0.8 },
      { color: '#93D2FA', bottom: '-10%', left: '-8%', size: '58%', opacity: 0.72 },
      { color: '#FFA8CE', bottom: '18%', right: '20%', size: '40%', opacity: 0.6 },
    ],
  },
  evening: {
    wash: 'linear-gradient(148deg, #FFE7DA 0%, #FBD8EF 42%, #DCCDFB 100%)',
    glassBg: 'rgba(255,252,255,0.38)',
    ink: 'rgba(60,40,65,0.92)',
    mutedText: 'rgba(80,44,80,0.42)',
    weekendText: 'rgba(214,74,146,0.58)',
    isNight: false,
    blobs: [
      { color: '#FF9E6B', top: '-10%', right: '-10%', size: '64%', opacity: 0.8 },
      { color: '#F06BB6', top: '32%', left: '-18%', size: '56%', opacity: 0.72 },
      { color: '#9A6FE0', bottom: '-12%', right: '2%', size: '55%', opacity: 0.68 },
      { color: '#FFC98F', bottom: '28%', left: '28%', size: '38%', opacity: 0.55 },
    ],
  },
  night: {
    wash: 'linear-gradient(160deg, #2A2440 0%, #3B3160 45%, #22283E 100%)',
    glassBg: 'rgba(255,255,255,0.11)',
    ink: 'rgba(245,240,255,0.92)',
    mutedText: 'rgba(224,214,246,0.48)',
    weekendText: 'rgba(246,164,206,0.65)',
    isNight: true,
    blobs: [
      { color: '#7B5CB8', top: '-6%', left: '-10%', size: '60%', opacity: 0.6 },
      { color: '#4560C4', top: '38%', right: '-16%', size: '55%', opacity: 0.5 },
      { color: '#A05A96', bottom: '-6%', left: '18%', size: '50%', opacity: 0.48 },
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

/** Soft float + crisp white frame. */
export function glassPanelChrome(isNight: boolean): { boxShadow: string; border: string } {
  if (isNight) {
    return {
      border: '1px solid rgba(255,255,255,0.32)',
      boxShadow: [
        '0 22px 56px rgba(0,0,0,0.32)',
        'inset 0 1px 0 rgba(255,255,255,0.2)',
      ].join(', '),
    };
  }
  return {
    border: '1.5px solid rgba(255,255,255,0.85)',
    boxShadow: [
      '0 20px 50px rgba(90,70,110,0.14)',
      '0 4px 14px rgba(90,70,110,0.06)',
      'inset 0 1px 0 rgba(255,255,255,0.95)',
    ].join(', '),
  };
}

/** Small chrome pills (avatar, today chip). */
export function glassChipChrome(isNight: boolean): { background: string; border: string; boxShadow: string } {
  if (isNight) {
    return {
      background: 'rgba(255,255,255,0.12)',
      border: '1px solid rgba(255,255,255,0.28)',
      boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
    };
  }
  return {
    background: 'rgba(255,255,255,0.45)',
    border: '1.5px solid rgba(255,255,255,0.8)',
    boxShadow: '0 4px 16px rgba(90,70,110,0.1)',
  };
}
