import http from "node:http";
import http2 from "node:http2";

import { PORT } from "./config";
import { http1Handler } from "./routes";
import upgradeHandler from "./routes/upgradeHandler";
import { ClientHttp2Session } from "node:http2";
import { Agent } from "./types";

export const agentsMap = new Map<string, Agent>();

// Normal HTTP/1.1 server
const server = http.createServer(http1Handler);

// Handle upgrade requests, switch to H2 for /agent
server.on("upgrade", upgradeHandler);

server.listen(PORT, () => {
  console.log(`🚀 Dual-stack server running on https://localhost:${PORT}`);
});

export default server;
