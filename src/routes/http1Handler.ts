import crypto from "node:crypto";
import { agentsMap, pendingMap } from "../server";
import { encodeFrame, FrameType } from "../util/buffer";
import http from "node:http";
import healthCheck from "./healthRoute";
import { generateRandomId } from "@/util";

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

  const requestId = generateRandomId(8);
  pendingMap.set(requestId, { req, res });
  const commonPayload = { requestId };

  console.log(
    `➡️  Incoming request - ${requestId} : ${req.method} ${req.url} `,
  );

  try {
    // Notify agent about new request
    agent.socket.write(
      encodeFrame({
        ...commonPayload,
        type: FrameType.REQUEST_START,
        payload: {
          method: req.method,
          path: "/" + rest.join("/"),
          headers: req.headers,
        },
      }),
    );

    // Stream request body to agent
    req.on("data", (chunk) => {
      agent.socket.write(
        encodeFrame({
          ...commonPayload,
          type: FrameType.REQUEST_DATA,
          payload: chunk,
        }),
      );
    });

    // Notify agent about end of request
    req.on("end", () => {
      agent.socket.write(
        encodeFrame({
          ...commonPayload,
          type: FrameType.REQUEST_END,
        }),
      );
    });

    // TODO: In case of small request bodies, 'end' might fire before 'data'

  } catch (err) {
    console.log("⚠️ Error sending request to agent:", tunnelId, err);
    res.writeHead(502);
    res.end("Agent unavailable");
    pendingMap.delete(requestId);
  }
};

export default http1Handler;
