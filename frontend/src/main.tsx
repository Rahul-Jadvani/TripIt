import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { setupBackendHealthMonitor } from "./lib/backendHealthMonitor";

// Setup backend health monitoring before app renders
setupBackendHealthMonitor();

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  // Use the virtual module from vite-plugin-pwa
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({
      immediate: true,
      onRegistered(registration) {
        console.log('PWA Service Worker registered:', registration);
      },
      onRegisterError(error) {
        console.error('PWA Service Worker registration failed:', error);
      },
    });
  }).catch(() => {
    // Fallback if virtual module not available
    console.log('PWA not available in this environment');
  });
}

createRoot(document.getElementById("root")!).render(<App />);
