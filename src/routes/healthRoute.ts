import { agentsMap, pendingMap } from "@/server";
import { Http2ServerRequest, Http2ServerResponse } from "http2";

const healthCheck = (req: Http2ServerRequest, res: Http2ServerResponse) => {
  res.writeHead(200);
  res.end(JSON.stringify({
    status: "ok",
    agents: agentsMap.size,
    pending_requests: pendingMap.size,
  }));
};

export default healthCheck;
