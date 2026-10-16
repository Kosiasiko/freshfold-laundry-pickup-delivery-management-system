import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import app from "../app.js";

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test("admin APIs reject unauthenticated report and management requests", async () => {
  const summary = await fetch(`${baseUrl}/api/admin/summary`);
  assert.equal(summary.status, 401);
  assert.deepEqual(await summary.json(), {
    success: false,
    message: "Authentication required.",
  });

  const statusChange = await fetch(`${baseUrl}/api/admin/businesses/123/status`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "approved" }),
  });
  assert.equal(statusChange.status, 401);
});

test("admin login rejects malformed requests before querying accounts", async () => {
  const response = await fetch(`${baseUrl}/api/admin/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "", password: "" }),
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    success: false,
    message: "A valid email and password are required.",
  });
});

test("admin API returns a client error for invalid JSON", async () => {
  const response = await fetch(`${baseUrl}/api/admin/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{",
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    success: false,
    message: "Request body must contain valid JSON.",
  });
});
