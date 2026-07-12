import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initNative } from "./lib/native/init";
import { installGlobalRecoveryListener } from "./lib/auth/globalRecoveryListener";

// Install the PASSWORD_RECOVERY listener BEFORE anything else touches
// Supabase auth — in particular before initDeepLinks() exchanges a
// recovery code from the launch URL. Otherwise the event can fire before
// RecoveryRouter mounts and be lost.
installGlobalRecoveryListener();

createRoot(document.getElementById("root")!).render(<App />);

// Kick off native init after React has mounted so SplashScreen.hide()
// fires exactly once, right when the app UI is ready to show.
// initNative() is a no-op on web (guarded by isNativePlatform()).
void initNative();
