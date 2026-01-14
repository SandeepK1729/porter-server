import http2, {
  Http2ServerRequest,
  Http2ServerResponse,
  ServerHttp2Session
} from "http2";
import crypto from "crypto";
import { TunnelRequest, TunnelResponse } from "./types";

const agents = new Map<string, ServerHttp2Session>();
const pending = new Map<string, Http2ServerResponse>();

const server = http2.createServer();

console.log("hello")
/**
 * Handle all incoming HTTP/2 streams
 */
server.on("stream", (stream, headers) => {
  console.log("headers", headers);
  const path = headers[":path"]!;

  /**
   * AGENT CONNECTION
   */
  if (path === "/agent") {
    const tunnelId = crypto.randomBytes(4).toString("hex");
    agents.set(tunnelId, stream.session);

    stream.respond({
      ":status": 200,
      "content-type": "text/plain"
    });

    stream.end(`TUNNEL_ID=${tunnelId}`);

    stream.session.on("close", () => {
      agents.delete(tunnelId);
    });

    console.log(`Agent connected: ${tunnelId}`);
    return;
  }

  /**
   * PUBLIC REQUEST
   */
  const [, tunnelId, ...rest] = path.split("/");
  const agentSession = agents.get(tunnelId);

  if (!agentSession) {
    stream.respond({ ":status": 404 });
    stream.end("Tunnel not found");
    return;
  }

  const requestId = crypto.randomUUID();
  let body = Buffer.alloc(0);

  stream.on("data", chunk => {
    body = Buffer.concat([body, chunk]);
  });

  stream.on("end", () => {
    pending.set(requestId, stream as unknown as Http2ServerResponse);

    const agentStream = agentSession.request({
      ":method": headers[":method"],
      ":path": "/" + rest.join("/"),
      "x-request-id": requestId
    });

    agentStream.write(body);
    agentStream.end();

    agentStream.on("response", headers => {
      agentStream.on("data", chunk => {
        stream.write(chunk);
      });

      agentStream.on("end", () => {
        stream.respond({
          ":status": headers[":status"] as number
        });
        stream.end();
        pending.delete(requestId);
      });
    });
  });
});

server.listen(8080, () => {
  console.log("HTTP/2 tunnel server running on :8080");
});
