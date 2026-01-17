import crypto from "node:crypto";
import { agentsMap, pendingMap } from "../server";
import { encodeFrame, FrameType } from "../util/buffer";
import http from "node:http";
import healthCheck from "./healthRoute";

const http1Handler = (req: http.IncomingMessage, res: http.ServerResponse) => {
  if (!req.url) {
    res.writeHead(400);
    return res.end("Bad request");
  }
  console.log(`➡️  Incoming request: ${req.method} ${req.url}`);

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

  const requestId = crypto.randomBytes(4).toString("hex");
  pendingMap.set(requestId, { req, res });

  const payload = {
    method: req.method,
    path: "/" + rest.join("/"),
    headers: req.headers,
  };

  try {
    agent.socket.write(encodeFrame({ type: FrameType.REQUEST, requestId, payload }));
  } catch (err) {
    res.writeHead(502);
    res.end("Agent unavailable");
    pendingMap.delete(requestId);
  }
};

export default http1Handler;
