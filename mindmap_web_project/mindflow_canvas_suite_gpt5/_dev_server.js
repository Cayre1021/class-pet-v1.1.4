const http = require("http");
const fs = require("fs");
const path = require("path");
const root = __dirname;
const port = process.env.PORT ? Number(process.env.PORT) : 8765;
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".md": "text/markdown; charset=utf-8"
};
const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  let file = path.join(root, urlPath === "/" ? "index.html" : urlPath);
  if (!file.startsWith(root)) { res.writeHead(403); res.end("forbidden"); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end("not found"); return; }
    res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
});
server.listen(port, "127.0.0.1", () => console.log("listening on http://127.0.0.1:" + port));
