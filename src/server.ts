import http from "node:http";
import http2, { ServerHttp2Session, ServerHttp2Stream } from "node:http2";
import crypto from "node:crypto";

import { HTTP2_SERVER_OPTIONS, PORT } from "./config";
import { http1Handler } from "./routes";
import { PendingRequest } from "./types";
import { Socket } from "node:net";
import upgradeHandler from "./routes/upgradeHandler";

type Agent = {
  socket: Socket;
};

export const agentsMap = new Map<string, Agent>();
export const pendingMap = new Map<string, PendingRequest>();

const server = 
  http
    .createServer(http1Handler)
    .on("upgrade", upgradeHandler);

server.listen(PORT, () => {
  console.log(`🚀 Dual-stack server running on https://localhost:${PORT}`);
});

export default server;
