import { Hono } from "hono";
type Env = {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
};

const app = new Hono<{ Bindings: Env }>();

app.get("/api/health", (c) => c.json({ ok: true }));

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
