import { resolve, relative, sep } from "node:path";

const links = new Map();
const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const port = Number.parseInt(process.env.PORT || "3000", 10);
const publicDir = process.env.PUBLIC_DIR ? resolve(process.env.PUBLIC_DIR) : null;
const configuredBaseUrl = process.env.BASE_URL
  || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null);

function headers(contentType) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    ...(contentType ? { "Content-Type": contentType } : {}),
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: headers("application/json"),
  });
}

function createCode() {
  let code;
  do {
    const values = new Uint32Array(6);
    crypto.getRandomValues(values);
    code = Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
  } while (links.has(code));
  return code;
}

async function serveStatic(pathname) {
  if (!publicDir) return null;

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  const requestedPath = decodedPath === "/" ? "/index.html" : decodedPath;
  const filePath = resolve(publicDir, `.${requestedPath}`);
  const pathFromRoot = relative(publicDir, filePath);
  if (pathFromRoot.startsWith("..") || pathFromRoot.includes(`..${sep}`)) {
    return null;
  }

  const file = Bun.file(filePath);
  if (!(await file.exists())) return null;
  return new Response(file, { headers: headers(file.type || "application/octet-stream") });
}

const server = Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: headers() });
    }

    if (request.method === "POST" && url.pathname === "/api/links") {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Request body must be valid JSON." }, 400);
      }

      if (!body || typeof body.url !== "string") {
        return json({ error: "url must be an http(s) URL." }, 400);
      }

      let originalUrl;
      try {
        originalUrl = new URL(body.url);
      } catch {
        return json({ error: "url must be an http(s) URL." }, 400);
      }
      if (originalUrl.protocol !== "http:" && originalUrl.protocol !== "https:") {
        return json({ error: "url must be an http(s) URL." }, 400);
      }

      const link = {
        code: createCode(),
        url: originalUrl.toString(),
        shortUrl: "",
        hits: 0,
        createdAt: new Date().toISOString(),
      };
      const requestBaseUrl = configuredBaseUrl || new URL(request.url).origin;
      link.shortUrl = `${requestBaseUrl.replace(/\/+$/, "")}/${link.code}`;
      links.set(link.code, link);
      return json(link, 201);
    }

    if (request.method === "GET" && url.pathname === "/api/links") {
      return json(Array.from(links.values()));
    }

    if (request.method === "GET") {
      const staticResponse = await serveStatic(url.pathname);
      if (staticResponse) return staticResponse;

      const code = url.pathname.slice(1);
      if (code && !code.includes("/")) {
        const link = links.get(code);
        if (link) {
          link.hits += 1;
          return new Response(null, {
            status: 302,
            headers: { ...headers(), Location: link.url },
          });
        }
      }
    }

    return json({ error: "Not found." }, 404);
  },
});

console.log(`Snip listening on ${server.url}`);
