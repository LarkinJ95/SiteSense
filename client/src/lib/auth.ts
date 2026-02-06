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

if (typeof window !== "undefined") {
  const globalAny = globalThis as { fetch: typeof fetch; __abateiqFetchPatched?: boolean };
  if (!globalAny.__abateiqFetchPatched) {
    const nativeFetch = globalAny.fetch.bind(globalThis);
    globalAny.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const isRelative = url.startsWith("/");
      const isSameOrigin = !isRelative && typeof window !== "undefined" && url.startsWith(window.location.origin);
      const shouldInclude = isRelative || isSameOrigin;
      if (shouldInclude) {
        return nativeFetch(input, { credentials: "include", ...(init || {}) });
      }
      return nativeFetch(input, init);
    };
    globalAny.__abateiqFetchPatched = true;
  }
}

const authBaseUrl = getAuthBaseUrl();
const neonAuth = createInternalNeonAuth(authBaseUrl, {
  adapter: BetterAuthReactAdapter(),
});

export const authClient = neonAuth.adapter;
export const authApi = neonAuth;
