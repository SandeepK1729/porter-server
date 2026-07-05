import { agentsMap, pendingMap } from "../server";
import { encodeFrame, FrameType } from "../util/buffer";
import http from "node:http";
import healthCheck from "./healthRoute";
import { generateRandomId, sanitizeHeaders } from "@/util";

const http1Handler = (req: http.IncomingMessage, res: http.ServerResponse) => {
  if (!req.url) {
    res.writeHead(400);
    return res.end("Bad request");
  }

  const parsedUrl = new URL(req.url, "http://localhost");

  // ---- Internal routes ----
  if (req.url === "/healthz") return healthCheck(req, res);

  if (parsedUrl.pathname === "/agent") {
    res.writeHead(426);
    return res.end("Upgrade Required");
  }

  // ---- Public traffic ----
  const [tunnelId, ...rest] = parsedUrl.pathname.split("/").filter(Boolean);

  if (!tunnelId) {
    res.writeHead(404);
    return res.end("Tunnel not found");
  }

  const agent = agentsMap.get(tunnelId);

  if (!agent) {
    res.writeHead(404);
    return res.end("Tunnel not found");
  }

  const requestId = generateRandomId(8);
  pendingMap.set(requestId, { req, res, tunnelId });
  const commonPayload = { requestId };

  const cleanupPending = () => {
    pendingMap.delete(requestId);
  };

  res.once("close", cleanupPending);
  req.once("aborted", cleanupPending);
  req.once("error", cleanupPending);

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
          headers: sanitizeHeaders(req.headers),
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

  } catch (err) {
    console.log("⚠️ Error sending request to agent:", tunnelId, err);
    res.writeHead(502);
    res.end("Agent unavailable");
    cleanupPending();
  }
};

export default http1Handler;
