import { createServer, type Server } from "node:http";
import pino from "pino";

const logger = pino({ name: "discord-grok-health" });

export function startHealthServer(port: number): Server {
  const server = createServer((request, response) => {
    if (
      request.method === "GET" &&
      (request.url === "/" ||
        request.url === "/healthz" ||
        request.url === "/api/healthz")
    ) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          ok: true,
          service: "discord-grok-bot",
          timestamp: new Date().toISOString(),
        }),
      );
      return;
    }

    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: false, error: "Not found" }));
  });

  server.listen(port, "0.0.0.0", () => {
    logger.info({ port }, "Health server is listening");
  });

  return server;
}