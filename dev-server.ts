/**
 * Unified dev server that mirrors production routing:
 *   /docs/      → Docusaurus dev server (port 3030)
 *
 * Handles HTTP proxying and WebSocket upgrades for HMR.
 *
 * Usage: bun run dev-server.ts
 */

const DOCS_ORIGIN = Bun.env.DOCS_ORIGIN ?? "http://localhost:3030";
const PORT = 3035;

interface RouteMatch {
  origin: string;
  /** The rewritten path to send to the upstream */
  upstreamPath: string;
}

/**
 * Route a request path to the correct upstream.
 *
 * - /docs/* is forwarded as-is (Docusaurus serves under baseUrl: '/docs/')
 * - /ws is Docusaurus webpack-dev-server HMR
 */
function route(path: string, referer?: string | null): RouteMatch | null {
  if (path.startsWith("/docs/") || path === "/docs") {
    return { origin: DOCS_ORIGIN, upstreamPath: path };
  }

  // Docusaurus webpack-dev-server HMR WebSocket
  if (path === "/ws") {
    return { origin: DOCS_ORIGIN, upstreamPath: path };
  }

  // Vite internal paths — use Referer to route to the correct upstream
  const isViteInternal = path.startsWith("/@vite/") ||
    path.startsWith("/@fs/") ||
    path.startsWith("/@id/") ||
    path.startsWith("/__vite_ping") ||
    path.startsWith("/node_modules/.vite/") ||
    path.startsWith("/@react-refresh");

  if (isViteInternal && referer) {
    if (referer.includes("/docs")) {
      return { origin: DOCS_ORIGIN, upstreamPath: path };
    }
  }

  return null;
}

// --- HTTP proxy ---

async function proxyHttp(request: Request, match: RouteMatch): Promise<Response> {
  const url = new URL(request.url);
  const target = new URL(match.upstreamPath + url.search, match.origin);
  const upstreamUrl = new URL(match.origin);

  const headers = new Headers(request.headers);
  // Set correct Host for the upstream server
  headers.set("host", upstreamUrl.host);
  // Strip Accept-Encoding so upstream sends uncompressed content
  headers.delete("accept-encoding");

  try {
    const res = await fetch(new Request(target, {
      method: request.method,
      headers,
      body: request.body,
      redirect: "manual",
    }));

    // Buffer the response to avoid streaming issues in Bun's proxy path
    const body = await res.arrayBuffer();

    const resHeaders = new Headers(res.headers);
    resHeaders.delete("content-encoding");
    // Set accurate content-length from the buffered body
    resHeaders.set("content-length", String(body.byteLength));

    return new Response(body, {
      status: res.status,
      statusText: res.statusText,
      headers: resHeaders,
    });
  } catch {
    return new Response("Upstream not ready yet. Start the dev servers first.", {
      status: 502,
      headers: { "Content-Type": "text/plain" },
    });
  }
}

// --- WebSocket proxy ---

interface WsData {
  upstream: WebSocket;
}

function proxyWebSocket(clientWs: ServerWebSocket<WsData>) {
  const upstream = clientWs.data.upstream;

  upstream.addEventListener("message", (event) => {
    try { clientWs.send(event.data); } catch { /* client gone */ }
  });
  upstream.addEventListener("close", (event) => {
    clientWs.close(event.code, event.reason);
  });
  upstream.addEventListener("error", () => {
    clientWs.close(1011, "upstream error");
  });
}

// --- Server ---

Bun.serve<WsData>({
  port: PORT,

  async fetch(request, server) {
    const url = new URL(request.url);
    const path = url.pathname;
    const referer = request.headers.get("referer");
    const match = route(path, referer);

    // WebSocket upgrade
    if (request.headers.get("upgrade")?.toLowerCase() === "websocket" && match) {
      const wsOrigin = match.origin.replace("http", "ws");
      const wsTarget = `${wsOrigin}${match.upstreamPath}${url.search}`;

      try {
        const upstreamWs = new WebSocket(wsTarget);
        await new Promise<void>((resolve, reject) => {
          upstreamWs.addEventListener("open", () => resolve());
          upstreamWs.addEventListener("error", () => reject(new Error("upstream ws failed")));
        });

        const ok = server.upgrade(request, { data: { upstream: upstreamWs } });
        if (!ok) {
          upstreamWs.close();
          return new Response("WebSocket upgrade failed", { status: 500 });
        }
        return undefined;
      } catch {
        return new Response("Upstream WebSocket not ready", { status: 502 });
      }
    }

    // HTTP proxy
    if (match) {
      return proxyHttp(request, match);
    }

    return new Response("Not Found", { status: 404 });
  },

  websocket: {
    open(ws) { proxyWebSocket(ws); },
    message(ws, message) {
      try { ws.data.upstream.send(message); } catch { /* upstream gone */ }
    },
    close(ws, code, reason) {
      try { ws.data.upstream.close(code, reason); } catch { /* already closed */ }
    },
  },
});

console.log(`
  Dev server running at http://localhost:${PORT}
    /docs/      → Docusaurus (port 3030)
`);
