import http from "node:http";
import crypto from "node:crypto";
import { Socket } from "node:net";

import { agentsMap, pendingMap } from "@/server";
import { decodeFrames, encodeFrame, FrameType } from "@/util/buffer";

const SOCKET_UPGRADE_RESPONSE = `
HTTP/1.1 101 Switching Protocols\r
Connection: Upgrade\r
Upgrade: tunnel\r
\r
`;

const upgradeHandler = (req: http.IncomingMessage, socket: Socket) => {
  // Only handle /agent upgrades
  if (req.url !== "/agent") {
    socket.destroy();
    return;
  }

  console.log("🔼 Upgrade request received from agent", req.url);

  const tunnelId = crypto.randomBytes(4).toString("hex");
  socket.write(SOCKET_UPGRADE_RESPONSE);

  agentsMap.set(tunnelId, { socket });
  console.log("🚀 Agent connected:", tunnelId);

  // Send tunnel ID to agent
  socket.write(encodeFrame({ type: FrameType.REGISTERED, tunnelId }));

  let buffer = Buffer.alloc(0);

  socket.on("data", (chunk) => {
    const { frames, remaining } = decodeFrames(Buffer.concat([buffer, chunk]));
    buffer = remaining;

    frames.forEach((frame) => {
      if (frame.type === FrameType.RESPONSE) {
        const pending = pendingMap.get(frame.requestId);
        if (!pending) return;

        pending.res.writeHead(frame.payload.status, frame.payload.headers);
        pending.res.end(frame.payload.body);
        pendingMap.delete(frame.requestId);
      }
    });
  });

  socket.on("error", (err) => {
    console.error("Socket error:", err);
  });

  socket.on("close", () => {
    agentsMap.delete(tunnelId);
    console.log("🛑 Agent disconnected:", tunnelId);
  });
};

export default upgradeHandler;
