import { createInternalNeonAuth } from "@neondatabase/neon-js/auth";
import { BetterAuthReactAdapter } from "@neondatabase/neon-js/auth/react/adapters";

const authBaseUrl = import.meta.env.VITE_NEON_AUTH_URL || "/api/auth";
const neonAuth = createInternalNeonAuth(authBaseUrl, {
  adapter: BetterAuthReactAdapter(),
});

export const authClient = neonAuth.adapter;
export const authApi = neonAuth;
