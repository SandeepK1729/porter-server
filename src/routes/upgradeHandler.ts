import http from "node:http";
import { Socket } from "node:net";

import { agentsMap, pendingMap } from "@/server";
import { decodeFrames, encodeFrame, FrameType } from "@/util/buffer";
import { generateRandomId } from "@/util";

const SOCKET_UPGRADE_RESPONSE = `
HTTP/1.1 101 Switching Protocols\r
Connection: Upgrade\r
Upgrade: tunnel\r
\r
`;

const cleanupAgent = (tunnelId: string) => {
  const agent = agentsMap.get(tunnelId);
  if (agent) {
    agent.socket.destroy();
    agentsMap.delete(tunnelId);
    console.log("❌ Agent disconnected and cleaned up:", tunnelId);
  }

  for (const [requestId, pending] of pendingMap.entries()) {
    if (pending.tunnelId !== tunnelId) continue;

    if (!pending.res.writableEnded) {
      pending.res.writeHead(502);
      pending.res.end("Agent disconnected");
    }
    pendingMap.delete(requestId);
  }
};

const upgradeHandler = (req: http.IncomingMessage, socket: Socket) => {
  // Only handle /agent upgrades
  if (req.url !== "/agent") {
    socket.destroy();
    return;
  }

  console.log("🔼 Upgrade request received from agent", req.url);

  const tunnelId = generateRandomId();
  socket.write(SOCKET_UPGRADE_RESPONSE);

  agentsMap.set(tunnelId, { socket });
  console.log("🚀 Agent connected:", tunnelId);

  // Send tunnel ID to agent
  socket.write(
    encodeFrame({ type: FrameType.TUNNEL_INIT, requestId: "00000000", payload: { tunnelId } }
    ));

  let buffer = Buffer.alloc(0);

  socket.on("data", (chunk) => {
    const { frames, remaining } = decodeFrames(Buffer.concat([buffer, chunk]));
    buffer = remaining;

    frames.forEach((frame) => {
      if (frame.type < FrameType.RESPONSE_START || frame.type > FrameType.RESPONSE_END) return;
      if (!frame.requestId || !pendingMap.has(frame.requestId)) return;

      const { res } = pendingMap.get(frame.requestId) || {};
      if (!res) return;

      switch (frame.type) {
        case FrameType.RESPONSE_START: {
          res.writeHead(frame.payload?.status ?? 200, frame.payload?.headers);
          break;
        }
        case FrameType.RESPONSE_DATA: {
          res.write(frame.payload);
          break;
        }
        case FrameType.RESPONSE_END: {
          res.end();
          pendingMap.delete(frame.requestId);
          break;
        }
      }
    });
  });

  socket.on("end", () => {
    console.log("🧹 Agent sent FIN:", tunnelId);
    cleanupAgent(tunnelId);
  });

  socket.on("close", (hadError) => {
    console.log("🛑 Socket closed:", tunnelId, "error?", hadError);
    cleanupAgent(tunnelId);
  });

  socket.on("error", (err) => {
    console.log("⚠️ Socket error:", tunnelId, err.message);
    cleanupAgent(tunnelId);
  });
};

export default upgradeHandler;
