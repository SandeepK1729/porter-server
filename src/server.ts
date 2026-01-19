import http from "node:http";
import { Socket } from "node:net";

import { PORT } from "./config";
import { http1Handler } from "./routes";
import { PendingRequest } from "./types";
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
