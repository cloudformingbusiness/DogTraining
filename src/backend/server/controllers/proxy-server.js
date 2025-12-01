const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();

// CORS-Header für alle Anfragen und Preflight (OPTIONS)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:8081");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(
  "/api",
  createProxyMiddleware({
    target: "https://api.cloudforming.de",
    changeOrigin: true,
    pathRewrite: { "^/api": "/api" },
  })
);

app.listen(4000, () => {
  console.log("Proxy läuft auf http://localhost:4000");
});
