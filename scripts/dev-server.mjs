// Minimal static server for the Lovable preview.
// The real product is the Python app in ./rag-app.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";

const args = process.argv.slice(2);
const portFlag = args.indexOf("--port");
const port = Number(portFlag !== -1 ? args[portFlag + 1] : process.env.PORT || 8080);
const root = join(process.cwd(), "rag-app", "frontend");
const samplePath = join(process.cwd(), "rag-app", "sample_data", "security_policy.txt");

const json = (res, data) => {
  res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
};

const sampleDocument = {
  document_id: "preview-security-policy",
  name: "security_policy.txt",
  extension: ".txt",
  size_bytes: 5301,
  pages: 1,
  chunks: 8,
  tokens: 1184,
  is_sample: true,
  suggestions: [
    "Summarize the key requirements in the security policy.",
    "What does the policy say about authentication?",
    "Which incident response steps are required?",
    "Compare access control and data protection requirements."
  ],
  uploaded_at: 0
};

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
  if (path === "/api/health") return json(res, { default_system_prompt: "Answer only from the supplied context and cite sources.", models: ["openai/gpt-oss-20b", "openai/gpt-oss-120b"], groq_configured: false, neural_embeddings: true });
  if (path === "/api/documents") return json(res, [sampleDocument]);
  if (path === "/api/session/usage") return json(res, { queries: 0, total_tokens: 0, avg_tokens_per_query: 0, total_input_tokens: 0, total_output_tokens: 0, documents: 1 });
  if (path === `/api/documents/${sampleDocument.document_id}`) return json(res, { ...sampleDocument, sections: [{ title: "Authentication and Access Control", page: 1 }, { title: "Incident Response", page: 1 }, { title: "Data Protection", page: 1 }] });
  if (path === `/api/documents/${sampleDocument.document_id}/pages/1`) return json(res, { page: 1, text: await readFile(samplePath, "utf8") });
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
