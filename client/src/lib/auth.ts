import { createInternalNeonAuth } from "@neondatabase/neon-js/auth";
import { BetterAuthReactAdapter } from "@neondatabase/neon-js/auth/react/adapters";

const getAuthBaseUrl = () => {
  if (import.meta.env.VITE_NEON_AUTH_URL) {
    return import.meta.env.VITE_NEON_AUTH_URL;
  }
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/auth`;
  }
  return "/api/auth";
};

const authBaseUrl = getAuthBaseUrl();
const neonAuth = createInternalNeonAuth(authBaseUrl, {
  adapter: BetterAuthReactAdapter(),
});

export const authClient = neonAuth.adapter;
export const authApi = neonAuth;
