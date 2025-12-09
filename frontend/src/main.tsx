import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { setupBackendHealthMonitor } from "./lib/backendHealthMonitor";

// Setup backend health monitoring before app renders
setupBackendHealthMonitor();

createRoot(document.getElementById("root")!).render(<App />);
