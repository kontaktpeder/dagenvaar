import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';
import { isNativePlatform, isIOS } from './platform';
import { initDeepLinks } from './deepLinks';

export async function initNative(): Promise<void> {
  if (!isNativePlatform()) return;

  try {
    await StatusBar.setStyle({ style: Style.Light });
    if (!isIOS()) {
      await StatusBar.setBackgroundColor({ color: '#fbf9f6' });
    }
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch (err) {
    console.warn('StatusBar init failed', err);
  }

  try {
    await Keyboard.setAccessoryBarVisible({ isVisible: false });
  } catch {
    /* not supported on android */
  }

  await initDeepLinks();

  try {
    await SplashScreen.hide({ fadeOutDuration: 250 });
  } catch {
    /* ignore */
  }
}
