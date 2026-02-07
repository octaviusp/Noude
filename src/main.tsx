import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { hydrateFlowStore, initAutoPersistence } from "./lib/persistence";
import "./index.css";

// Restore previous session from localStorage before render
hydrateFlowStore();
// Start debounced auto-save subscription
initAutoPersistence();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
