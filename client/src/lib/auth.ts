import { useQuery } from "@tanstack/react-query";

const readErrorMessage = async (res: Response) => {
  // Prefer structured `{ message }` errors, but fall back to raw text.
  const contentType = (res.headers.get("content-type") || "").toLowerCase();
  const text = await res.text().catch(() => "");
  const maybeJson =
    contentType.includes("application/json") || text.trim().startsWith("{") || text.trim().startsWith("[");
  if (maybeJson) {
    try {
      const parsed = JSON.parse(text) as any;
      const msg =
        parsed && typeof parsed === "object"
          ? typeof parsed.message === "string"
            ? parsed.message
            : typeof parsed.error === "string"
              ? parsed.error
              : ""
          : "";
      if (msg) return msg;
    } catch {
      // ignore JSON parse errors
    }
  }
  return text || res.statusText || `Request failed (${res.status})`;
};

type MeResponse = {
  id: string;
  email?: string;
  name?: string;
  isAdmin?: boolean;
  user?: Record<string, unknown>;
};

type Session = {
  user: {
    id: string;
    email?: string;
    name?: string;
  };
  isAdmin?: boolean;
};

const toSession = (me: MeResponse | null | undefined): Session | null => {
  if (!me || typeof me !== "object") return null;
  if (!me.id) return null;
  return {
    user: { id: me.id, email: me.email, name: me.name },
    isAdmin: Boolean(me.isAdmin),
  };
};

export const authClient = {
  useSession: () => {
    const query = useQuery({
      queryKey: ["/api/me"],
      queryFn: async () => {
        const res = await fetch("/api/me", { credentials: "include" });
        if (res.status === 401) return null;
        if (!res.ok) throw new Error(await readErrorMessage(res));
        return (await res.json()) as MeResponse;
      },
      retry: false,
      refetchOnWindowFocus: false,
    });
    return {
      data: toSession(query.data as any),
      isPending: query.isLoading,
    };
  },

  signOut: async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => null);
    window.location.href = "/login";
  },
};

export const authApi = {
  login: async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error(await readErrorMessage(res));
    return await res.json();
  },
  register: async (name: string, email: string, password: string) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) throw new Error(await readErrorMessage(res));
    return await res.json();
  },
  getJWTToken: async () => null as string | null,
};

if (typeof window !== "undefined") {
  const globalAny = globalThis as { fetch: typeof fetch; __abateiqFetchPatched?: boolean };
  if (!globalAny.__abateiqFetchPatched) {
    const nativeFetch = globalAny.fetch.bind(globalThis);
    globalAny.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const isRelative = url.startsWith("/");
      const isSameOrigin =
        !isRelative && typeof window !== "undefined" && url.startsWith(window.location.origin);
      const shouldInclude = isRelative || isSameOrigin;
      if (shouldInclude) {
        return nativeFetch(input, { credentials: "include", ...(init || {}) });
      }
      return nativeFetch(input, init);
    };
    globalAny.__abateiqFetchPatched = true;
  }
}
