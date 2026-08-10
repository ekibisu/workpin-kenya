import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { sweepStalePendingPhotos } from "./lib/requestDraft";
import "./index.css";

// Purge guest photos stashed in IndexedDB that are past the draft max age.
sweepStalePendingPhotos();

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

