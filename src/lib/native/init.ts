import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';
import { isNativePlatform, isIOS } from './platform';
import { initDeepLinks } from './deepLinks';
import { initPush } from './push';

export async function initNative(): Promise<void> {
  if (!isNativePlatform()) return;

  try {
    await StatusBar.setStyle({ style: Style.Light });
    // Draw under the status bar; CSS safe-area padding handles the inset once.
    await StatusBar.setOverlaysWebView({ overlay: true });
    if (!isIOS()) {
      await StatusBar.setBackgroundColor({ color: '#fbf9f6' });
    }
  } catch (err) {
    console.warn('StatusBar init failed', err);
  }

  try {
    await Keyboard.setAccessoryBarVisible({ isVisible: false });
  } catch {
    /* not supported on android */
  }

  try {
    // Prevent iOS from scrolling the WebView/calendar when focusing inputs —
    // popups handle their own inner scroll + sticky CTAs.
    await Keyboard.setScroll({ isDisabled: true });
  } catch {
    /* older plugin / android */
  }

  await initDeepLinks();
  await initPush();

  try {
    await SplashScreen.hide({ fadeOutDuration: 250 });
  } catch {
    /* ignore */
  }
}
