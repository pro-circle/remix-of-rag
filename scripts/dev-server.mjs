// Minimal static server for the Lovable preview.
// The real product is the Python app in ./rag-app.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";

const args = process.argv.slice(2);
const portFlag = args.indexOf("--port");
const port = Number(portFlag !== -1 ? args[portFlag + 1] : process.env.PORT || 8080);
const root = join(process.cwd(), "rag-app", "frontend");

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  let path = decodeURIComponent(url.pathname);
  if (path.startsWith("/static/")) path = path.slice(7);
  if (path.endsWith("/")) path += "index.html";
  try {
    const file = await readFile(join(root, path));
    res.writeHead(200, { "content-type": types[extname(path)] ?? "application/octet-stream" });
    res.end(file);
  } catch {
    const fallback = await readFile(join(root, "index.html")).catch(() => null);
    if (fallback) {
      res.writeHead(200, { "content-type": types[".html"] });
      res.end(fallback);
    } else {
      res.writeHead(404);
      res.end("Not found");
    }
  }
}).listen(port, "0.0.0.0");
