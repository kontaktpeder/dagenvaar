import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initNative } from "./lib/native/init";

createRoot(document.getElementById("root")!).render(<App />);

// Kick off native init after React has mounted so SplashScreen.hide()
// fires exactly once, right when the app UI is ready to show.
// initNative() is a no-op on web (guarded by isNativePlatform()).
void initNative();
