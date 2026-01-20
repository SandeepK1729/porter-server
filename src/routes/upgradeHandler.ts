import http from "node:http";
import http2 from "node:http2";
import { Socket } from "node:net";

import { agentsMap } from "@/server";
import { decodeFrames, encodeFrame, FrameType } from "@/util/buffer";
import { generateRandomId } from "@/util";

const formSocketUpgradeResponse = (upgrade: 'h2c' | 'tunnel', tunnelId: string) => `
HTTP/1.1 101 Switching Protocols\r
Connection: Upgrade\r
Upgrade: h2c\r
X-Tunnel-Id: ${tunnelId}\r
\r
`;

const upgradeHandler = (req: http.IncomingMessage, socket: Socket, head: Buffer) => {
  // Only handle /agent upgrades
  if (req.url !== "/agent") {
    socket.destroy();
    return;
  }

  console.log("🔼 Upgrade request received from agent", req.url);

  const tunnelId = generateRandomId();
  socket.write(formSocketUpgradeResponse('h2c', tunnelId));

  const session = http2.connect("http://localhost", { createConnection: () => socket });

  // Create an H2 server specifically for this socket
  // const h2Server = http2.createServer();
  // const session = h2Server as unknown as http2.ClientHttp2Session;

  //  // Handle streams from this agent
  // h2Server.on("stream", (stream, headers) => {
  //   console.log(`📡 New stream from agent tunnelId=${tunnelId}, path=${headers[":path"]}`);

  //   // Example: respond immediately
  //   stream.respond({ ":status": 200 });
  //   stream.end(`📡 Hello from server! Tunnel: ${tunnelId}`);
  // });

  // // Attach this socket to H2 server
  // h2Server.emit("connection", socket);

  // const session = http2.connect("http://localhost", {
  //   createConnection: () => socket,
  // });

  agentsMap.set(tunnelId, { session });
  console.log("🚀 Agent connected:", tunnelId);

  session.on("close", () => cleanupAgent(tunnelId));
  session.on("error", (err) => {
    console.error("Agent session error:", err);
    cleanupAgent(tunnelId);
  });

  // // Send tunnel ID to agent
  // socket.write(
  //   encodeFrame({
  //     type: FrameType.TUNNEL_INIT,
  //     requestId: "00000000",
  //     payload: { tunnelId }
  //   })
  // );

  // let buffer = Buffer.alloc(0);

  // socket.on("data", (chunk) => {
  //   const { frames, remaining } = decodeFrames(Buffer.concat([buffer, chunk]));
  //   buffer = remaining;

  //   frames.forEach((frame) => {
  //     if (frame.type < 4 || !frame.requestId || !pendingMap.has(frame.requestId)) return; // Ignore request frames
  //     const { res } = pendingMap.get(frame.requestId) || {};
  //     if (!res) return;

  //     switch (frame.type) {
  //       case FrameType.RESPONSE_START: {
  //         res.writeHead(frame.payload.status, frame.payload.headers);
  //         break;
  //       }
  //       case FrameType.RESPONSE_DATA: {
  //         res.write(frame.payload);
  //         break;
  //       }
  //       case FrameType.RESPONSE_END: {
  //         res.end();
  //         pendingMap.delete(frame.requestId);
  //         break;
  //       }
  //     }
  //   });
  // });

  socket.on("end", () => {
    console.log("🧹 Agent sent FIN:", tunnelId);
    cleanupAgent(tunnelId);
  });

  socket.on("close", (hadError) => {
    console.log("🛑 Socket closed:", tunnelId, "error?", hadError);
    cleanupAgent(tunnelId);
  });

  socket.on("error", (err) => {
    console.log("⚠️ Socket error:", tunnelId, err);
    cleanupAgent(tunnelId);
  });

  const cleanupAgent = (tunnelId: string) => {
    const agent = agentsMap.get(tunnelId);

    if (agent) {
      // agent.server?.close();
      agent.session.destroy();
      agentsMap.delete(tunnelId);
      console.log("❌ Agent disconnected and cleaned up:", tunnelId);
    }
  };
};

export default upgradeHandler;
