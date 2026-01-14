import type {
  Http2ServerRequest,
  Http2ServerResponse,
  ServerHttp2Stream,
} from "http2";

interface PendingRequest {
  req: Http2ServerRequest;
  res: Http2ServerResponse;
}

interface Agent {
  stream: ServerHttp2Stream;
}

export { Agent, PendingRequest };
