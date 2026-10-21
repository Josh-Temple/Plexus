import { createServer } from "node:http";
const userId = process.env.MOCK_SUPABASE_USER_ID ?? "22222222-2222-4222-8222-222222222222";
const server = createServer((req, res) => {
  if (req.method !== "GET" || req.url?.split("?")[0] !== "/auth/v1/user") {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ msg: "not found" }));
    return;
  }
  const token = req.headers.authorization;
  if (token !== "Bearer fake-authorized-test-token") {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ msg: "invalid token", code: "bad_jwt" }));
    return;
  }
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({
    id: userId, aud: "authenticated", role: "authenticated",
    app_metadata: {}, user_metadata: {}, email: "local-test@example.invalid",
    created_at: "2026-01-01T00:00:00.000Z"
  }));
});
server.listen(3101, "127.0.0.1", () => console.log("Mock Supabase Auth ready on 3101"));
