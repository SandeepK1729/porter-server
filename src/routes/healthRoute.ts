import { agentsMap, pendingMap } from "@/server";
import http from "node:http";

const healthCheck = (req: http.IncomingMessage, res: http.ServerResponse) => {
  const payload = {
    status: "ok",
    agents: agentsMap.size,
    pending_requests: pendingMap.size,
  };
  res.writeHead(200);
  res.end(JSON.stringify(payload));
};

export default healthCheck;
