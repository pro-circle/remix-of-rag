// Copies the framework-free RAG workspace into dist/ for deployment previews.
import { cp, rm, mkdir } from "node:fs/promises";

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
await cp("rag-app/frontend", "dist", { recursive: true });
console.log("built dist/");
