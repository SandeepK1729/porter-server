import { Agent } from "@/types";
import crypto from "node:crypto";
import http from "node:http";
import http2 from "node:http2";

const generateRandomId = (bytes = 4) => crypto.randomBytes(bytes).toString("hex");


const proxyToAgent = (
  agent: Agent,
  req: http.IncomingMessage,
  res: http.ServerResponse,
) => {
  const session = agent.session;
  console.log(`🔀 Proxying request ${req.method} ${req.url} to agent`);
  // const agentSession = server as unknown as http2.ClientHttp2Session;

  console.log("Agent session state:", session.closed, session.destroyed);
  console.log("agentSession:", session);

  const stream = session.request({
    ":method": req.method!,
    ":path": req.url!,
    ...req.headers,
  });

  // Pipe request body → agent
  req.pipe(stream);

  // Receive response headers
  stream.on("response", (headers) => {
    res.writeHead(Number(headers[":status"]), headers);
  });

  // Pipe response body → client
  stream.pipe(res);

  stream.on("close", () => {
    res.end();
  });

  stream.on("error", () => {
    res.writeHead(502);
    res.end("Bad Gateway");
  });
}


export { generateRandomId, proxyToAgent };
