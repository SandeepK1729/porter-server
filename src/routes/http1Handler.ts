import { agentsMap } from "../server";
import http from "node:http";
import healthCheck from "./healthRoute";
import { proxyToAgent } from "@/util";

const http1Handler = (req: http.IncomingMessage, res: http.ServerResponse) => {
  if (!req.url) {
    res.writeHead(400);
    return res.end("Bad request");
  }

  // ---- Internal routes ----
  if (req.url === "/healthz") return healthCheck(req, res);

  if (req.url === "/agent") return;

  // ---- Public traffic ----
  const [, tunnelId, ...rest] = req.url.split("/");
  const agent = agentsMap.get(tunnelId!);

  if (!agent) {
    res.writeHead(404);
    return res.end("Tunnel not found");
  }

  proxyToAgent(agent, req, res);
};

export default http1Handler;
