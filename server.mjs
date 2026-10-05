// Tiny local server for the dashboard:  node server.mjs   ->  http://localhost:4600
//  - serves site/
//  - GET/POST /api/state   keeps your Saved / Applied / Skipped jobs in data/state.json (survives browsers, reruns, expired ads)
//  - POST /api/refresh     runs collect.mjs again (the "تحديث الآن" button)
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync, copyFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const site = join(root, "site"), data = join(root, "data"), stateFile = join(data, "state.json");
const PORT = Number(process.env.PORT || 4600);
mkdirSync(data, { recursive: true });
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
let refreshing = false;

const readState = () => { try { return JSON.parse(readFileSync(stateFile, "utf8")); } catch { return { status: {}, snap: {} }; } };
function writeState(obj) {
  if (existsSync(stateFile)) { try { copyFileSync(stateFile, stateFile + ".bak"); } catch { /* ignore */ } } // always keep the previous version
  const tmp = stateFile + ".tmp";
  writeFileSync(tmp, JSON.stringify(obj, null, 1));
  renameSync(tmp, stateFile);
}
const body = (req) => new Promise((res) => { let s = ""; req.on("data", (d) => (s += d)); req.on("end", () => res(s)); });

createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/api/state") {
    if (req.method === "POST") {
      try {
        const incoming = JSON.parse(await body(req));
        if (!incoming || typeof incoming !== "object") throw new Error("bad");
        writeState({ status: incoming.status || {}, snap: incoming.snap || {} });
        res.writeHead(200, { "content-type": "application/json" }); return res.end('{"ok":true}');
      } catch { res.writeHead(400); return res.end("bad request"); }
    }
    res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }); return res.end(JSON.stringify(readState()));
  }
  if (url.pathname === "/api/refresh" && req.method === "POST") {
    if (refreshing) { res.writeHead(409); return res.end("already running"); }
    refreshing = true;
    const p = spawn(process.execPath, [join(root, "collect.mjs")], { cwd: root, stdio: "ignore" });
    p.on("close", (code) => { refreshing = false; res.writeHead(code === 0 ? 200 : 500, { "content-type": "application/json" }); res.end(JSON.stringify({ ok: code === 0 })); });
    return;
  }
  let f = join(site, normalize(decodeURIComponent(url.pathname)));
  if (!f.startsWith(site)) { res.writeHead(403); return res.end(); }
  if (url.pathname === "/") f = join(site, "index.html");
  if (!existsSync(f)) { res.writeHead(404); return res.end("not found"); }
  res.writeHead(200, { "content-type": types[extname(f)] || "application/octet-stream", "cache-control": "no-store" });
  res.end(readFileSync(f));
}).listen(PORT, "127.0.0.1", () => console.log(`Job Hunt dashboard: http://localhost:${PORT}   (state file: ${stateFile})`))
  .on("error", (e) => { if (e.code === "EADDRINUSE") console.log(`Already running on http://localhost:${PORT}`); else throw e; });
