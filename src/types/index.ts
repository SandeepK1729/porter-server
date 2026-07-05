import http from "http";

interface PendingRequest {
  req: http.IncomingMessage;
  res: http.ServerResponse;
  tunnelId: string;
}

interface Agent {
  stream: http.ServerResponse;
}

export { Agent, PendingRequest };
