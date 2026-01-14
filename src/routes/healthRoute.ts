import { agentsMap, pendingMap } from "@/server";
import { Http2ServerRequest, Http2ServerResponse } from "http2";

const healthCheck = (req: Http2ServerRequest, res: Http2ServerResponse) => {
  const payload = {
    status: "ok",
    agents: agentsMap.size,
    pending_requests: pendingMap.size,
  };
  console.log({
    message: "Health check requested",
    ...payload,
  });
  res.writeHead(200);
  res.end(JSON.stringify(payload));
};

export default healthCheck;
