import type { IncomingMessage, ServerResponse } from "node:http";
import crypto from "node:crypto";
import { agentsMap, pendingMap } from "../server";
import { encodeFrame, FrameType } from "../util/buffer";
import { Http2ServerRequest, Http2ServerResponse } from "node:http2";

const http1Handler = (req: Http2ServerRequest, res: Http2ServerResponse) => {
  if (!req.url) {
    res.writeHead(400);
    return res.end("Bad request");
  }

  if (req.url === "/agent") return;

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

  const obj = { type: FrameType.REQUEST, requestId, payload };
  try {
    agent.stream.write(encodeFrame(obj));
  } catch (err) {
    res.writeHead(502);
    res.end("Agent unavailable");
    pendingMap.delete(requestId);
  }
};

export default http1Handler;
