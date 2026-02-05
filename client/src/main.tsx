import { NeonAuthUIProvider } from "@neondatabase/neon-js/auth/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { authClient } from "./lib/auth";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <NeonAuthUIProvider emailOTP authClient={authClient}>
      <App />
    </NeonAuthUIProvider>
  </StrictMode>
);
