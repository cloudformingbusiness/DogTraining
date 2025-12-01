// Integrationstest für externen Server unter api.cloudforming.de

import request from "supertest";

const apiUrl = "https://api.cloudforming.de";

describe("Externer API Server (cloudforming.de)", () => {
  it("API Server should respond to /status with status ok", async () => {
    const res = await request(apiUrl).get("/api/status");
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
    const res = await request(apiUrl).get("/api/unknownroute");
    expect(res.statusCode).toBe(404);
  });

  it("should fail login with wrong credentials", async () => {
    const res = await request(apiUrl)
      .post("/api/login")
      .send({ email: "cloudforming@outlook.de", password: "test123" });
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  it("should login with correct credentials", async () => {
    const res = await request(apiUrl).post("/api/login").send({
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
  // Optional: Test für erfolgreichen Login, falls Testuser existiert
  // it("should login with correct credentials", async () => {
  //   const res = await request(apiUrl)
  //     .post("/api/login")
  //     .send({ email: "test@example.com", password: "testpass" });
  //   expect(res.statusCode).toBe(200);
  //   expect(res.body).toHaveProperty("token");
  //   expect(res.body).toHaveProperty("user");
  // });
});
