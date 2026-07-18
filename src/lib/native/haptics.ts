import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { isNativePlatform } from './platform';

/** Light tap — e.g. long-press recognized. No-op on web. */
export async function hapticLight(): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    /* simulator / unsupported */
  }
}

/** Medium tap — slightly stronger confirmation. */
export async function hapticMedium(): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch {
    /* ignore */
  }
}
