/**
 * Custom Next.js Production Server
 *
 * Usage:
 *   NODE_ENV=production node server.js
 *
 * Environment variables:
 *   PORT          – HTTP port (default 3000)
 *   HOSTNAME      – Bind address (default 0.0.0.0)
 */

const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const path = require("path");

// ── Load .env.local (mirrors Next.js behaviour) ───────────────────────
require("dotenv").config({ path: path.resolve(__dirname, ".env.local") });
require("dotenv").config({ path: path.resolve(__dirname, ".env.production") }); // fallback

// ── Configuration ─────────────────────────────────────────────────────
const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// ── Boot ──────────────────────────────────────────────────────────────
app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error handling request:", err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  server.listen(port, hostname, () => {
    console.log(
      `> Server listening on http://${hostname}:${port} (${dev ? "development" : "production"})`
    );
  });

  // ── Graceful shutdown ───────────────────────────────────────────────
  const shutdown = (signal) => {
    console.log(`\n> Received ${signal}. Shutting down gracefully…`);
    server.close(() => {
      console.log("> HTTP server closed.");
      process.exit(0);
    });

    // Force-exit after 10 s if connections hang
    setTimeout(() => {
      console.error("> Forcefully shutting down after timeout.");
      process.exit(1);
    }, 10_000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
});
