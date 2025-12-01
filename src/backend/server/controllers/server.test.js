// Polyfills für Node.js Timer APIs in Jest
if (typeof global.setImmediate === "undefined") {
  global.setImmediate = (fn, ...args) => setTimeout(() => fn(...args), 0);
}
if (typeof global.clearImmediate === "undefined") {
  global.clearImmediate = (id) => clearTimeout(id);
}

import { spawn } from "child_process";
import fs from "fs";
import net from "net";
import path from "path";
import request from "supertest";
import app from "./server.js";

const SERVER_PORT = 3000;
let serverProcess;

const SERVER_PATH = path.resolve(__dirname, "server.js");

function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection(port, "localhost");
    socket.on("connect", () => {
      socket.end();
      resolve(true);
    });
    socket.on("error", () => {
      resolve(false);
    });
  });
}
// TODO: Der automatische Server-Start in Tests funktioniert nicht zuverlässig in CI/CD Umgebungen.
describe("API Server (local, extern)", () => {
  beforeAll(async () => {
    const running = await isPortOpen(SERVER_PORT);
    if (!running) {
      serverProcess = spawn("node", [SERVER_PATH], {
        cwd: path.dirname(SERVER_PATH),
        shell: true,
        env: { ...process.env },
      });
      // Logging für stdout und stderr
      serverProcess.stdout &&
        serverProcess.stdout.on("data", (data) => {
          fs.appendFileSync("server-test.log", `[stdout] ${data}`);
          console.log(`[Server stdout] ${data}`);
        });
      serverProcess.stderr &&
        serverProcess.stderr.on("data", (data) => {
          fs.appendFileSync("server-test.log", `[stderr] ${data}`);
          console.error(`[Server stderr] ${data}`);
        });
      // Warte bis der Server wirklich läuft
      let tries = 0;
      while (!(await isPortOpen(SERVER_PORT)) && tries < 60) {
        await new Promise((r) => setTimeout(r, 500));
        tries++;
      }
    }
  });

  afterAll(() => {
    if (serverProcess) {
      serverProcess.kill();
    }
  });

  it("should have setImmediate available", () => {
    expect(typeof setImmediate).toBe("function");
    expect(typeof clearImmediate).toBe("function");
  });

  it("API Server should respond to /status with status ok (extern)", async () => {
    const res = await request("http://localhost:3000").get("/api/status");
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body).toHaveProperty("dbTime");
    expect(res.body).toHaveProperty("apiBaseUrl");
    expect(res.body).toHaveProperty("env");
    expect(res.body).toHaveProperty("server");
    expect(res.body.server).toHaveProperty("host");
    expect(res.body.server).toHaveProperty("port");
    expect(res.body.server).toHaveProperty("protocol");
    expect(res.body).toHaveProperty("database");
    expect(res.body.database).toHaveProperty("host");
    expect(res.body.database).toHaveProperty("port");
    expect(res.body.database).toHaveProperty("name");
    expect(res.body.database).toHaveProperty("user");
  });

  it("should return 404 for unknown route", async () => {
    const res = await request(app).get("/api/unknownroute");
    expect(res.statusCode).toBe(404);
  });

  it("should have the local server running and reachable", async () => {
    // Versuche eine Verbindung zum lokalen Server
    const res = await request(app).get("/");
    // Akzeptiere 200, 404 oder eine andere Antwort, Hauptsache kein Verbindungsfehler
    expect([200, 404, 401, 500]).toContain(res.statusCode);
  });

  // Optional: Test für erfolgreichen Login, falls Testuser existiert
  it("should fail login with wrong credentials", async () => {
    const res = await request("http://localhost:3000")
      .post("/api/login")
      .send({ email: "cloudforming@outlook.de", password: "test123" });
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  it("should login with correct credentials", async () => {
    const res = await request("http://localhost:3000").post("/api/login").send({
      email: "cloudforming@outlook.de",
      password: "test1234",
      //password: "$2b$10$JgIGR4lXR6T5EHX54/31cusOUv1sDovlC6EsyhhhZ5GUJJXbrZPYO",
    });
    // Debug-Ausgabe für Fehleranalyse
    if (res.status !== 200) {
      console.log("Fehler-Response:", res.status, res.body || res.text);
    }
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message");
    expect(res.body).toHaveProperty("token");
    expect(res.body.message).toBe("Login erfolgreich");
  });
});
