import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text().catch(() => "")) || res.statusText;
    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    let message = text;
    const maybeJson =
      contentType.includes("application/json") || text.trim().startsWith("{") || text.trim().startsWith("[");
    if (maybeJson) {
      try {
        const parsed = JSON.parse(text) as any;
        if (parsed && typeof parsed === "object") {
          if (typeof parsed.message === "string" && parsed.message.trim()) message = parsed.message;
          else if (typeof parsed.error === "string" && parsed.error.trim()) message = parsed.error;
        }
      } catch {
        // ignore JSON parse errors
      }
    }
    throw new Error(`${res.status}: ${message || res.statusText}`);
  }
}

export async function apiRequest(
  method: string,
  url?: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Backward compatibility: allow apiRequest(url, method, data)
  if (typeof url === "string" && (method.startsWith("/") || method.startsWith("http"))) {
    const swappedMethod = url;
    const swappedUrl = method;
    method = swappedMethod;
    url = swappedUrl;
  }
  if (!url) {
    throw new Error("apiRequest requires a URL");
  }
  const isFormData = typeof FormData !== "undefined" && data instanceof FormData;
  const headers: Record<string, string> = {};
  if (data && !isFormData) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(url, {
    method,
    headers,
    body: isFormData ? (data as FormData) : data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
