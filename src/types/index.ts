export interface TunnelRequest {
  id: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  body: Buffer;
}

export interface TunnelResponse {
  id: string;
  status: number;
  headers: Record<string, string>;
  body: Buffer;
}
