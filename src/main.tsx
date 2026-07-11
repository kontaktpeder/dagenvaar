import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initNative } from "./lib/native/init";

initNative();

createRoot(document.getElementById("root")!).render(<App />);
