import http2, { ServerHttp2Session, ServerHttp2Stream } from "node:http2";
import crypto from "node:crypto";

import { HTTP2_SERVER_OPTIONS, PORT } from "./config";
import { http1Handler } from "./routes";
import { Agent, PendingRequest } from "./types";
import { decodeFrames, FrameType } from "./util/buffer";

export const agentsMap = new Map<string, Agent>();
export const pendingMap = new Map<string, PendingRequest>();

const server = http2.createSecureServer(
  HTTP2_SERVER_OPTIONS,
  /**
   * HTTP/1.1 HANDLER (public traffic)
   */
  http1Handler
);

/**
 * Handle all incoming HTTP/2 streams
 */
server.on("stream", (stream: ServerHttp2Stream, headers) => {
  const path = headers[":path"]!;

  if (path !== "/agent" && !path.startsWith("/_connect/")) {
    // Not an agent or callback connection
    stream.respond({ ":status": 404 });
    return stream.end();
  }
  
  // Handle Agent Registration
  if (path === "/agent") {
    /**
     * Agent registration
     */
    const tunnelId = crypto.randomBytes(4).toString("hex");
    agentsMap.set(tunnelId, { stream });

    stream.respond({ ":status": 200 });
    stream.write(tunnelId + "\n");

    let buffer = Buffer.alloc(0);

    stream.on("data", chunk => {
      buffer = Buffer.concat([buffer, chunk as Buffer]);
      const decoded = decodeFrames(buffer);
      buffer = decoded.remaining;

      decoded.frames.forEach(frame => {
        if (frame.type === FrameType.RESPONSE) {
          const pendingReq = pendingMap.get(frame.requestId);
          if (!pendingReq) return;

          pendingReq.res.writeHead(frame.payload.status, frame.payload.headers);
          pendingReq.res.end(frame.payload.body);
          pendingMap.delete(frame.requestId);
        }
      });
    });

    // prev
    stream.session?.on("close", () => {
      agentsMap.delete(tunnelId);
      console.log(`Agent disconnected → ${tunnelId}`);
    });

    console.log("Agent connected:", tunnelId);
    return;
  }

});

server.listen(PORT, () => {
  console.log(`🚀 Dual-stack server running on https://localhost:${PORT}`);
});

export default server;
