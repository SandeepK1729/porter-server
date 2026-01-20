import http from "http";
import { ClientHttp2Session } from "http2";

interface PendingRequest {
  req: http.IncomingMessage;
  res: http.ServerResponse;
}


type Agent = {
  // server: http2.Http2Server;
  session: ClientHttp2Session;
};


export { Agent, PendingRequest };
