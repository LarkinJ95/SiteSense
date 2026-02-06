import { Hono } from "hono";
type Env = {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  NEON_AUTH_URL?: string;
};

const app = new Hono<{ Bindings: Env }>();

app.get("/api/health", (c) => c.json({ ok: true }));

app.all("/api/auth/*", async (c) => {
  const base = c.env.NEON_AUTH_URL;
  if (!base) {
    return c.json({ message: "NEON_AUTH_URL is not configured" }, 500);
  }

  const incomingUrl = new URL(c.req.url);
  const targetPath = incomingUrl.pathname.replace(/^\/api\/auth/, "");
  const targetUrl = new URL(base.replace(/\/$/, "") + targetPath + incomingUrl.search);

  const headers = new Headers(c.req.raw.headers);
  headers.set("host", targetUrl.host);

  const requestInit: RequestInit = {
    method: c.req.method,
    headers,
    body: c.req.method === "GET" || c.req.method === "HEAD" ? undefined : await c.req.arrayBuffer(),
    redirect: "manual",
  };

  const response = await fetch(targetUrl, requestInit);
  return response;
});

app.get("*", async (c) => {
  if (c.req.path.startsWith("/api")) {
    return c.notFound();
  }

  const assetResponse = await c.env.ASSETS.fetch(c.req.raw);
  if (assetResponse.status !== 404) {
    return assetResponse;
  }

  const url = new URL(c.req.url);
  const indexRequest = new Request(new URL("/", url), c.req.raw);
  return c.env.ASSETS.fetch(indexRequest);
});

export default { fetch: app.fetch };
