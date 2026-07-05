import process from "node:process";

function readPem(envVar: string): Buffer {
  const value = process.env[envVar];
  if (!value) {
    return Buffer.alloc(0);
  }

  return Buffer.from(value.replace(/\\n/g, "\n"));
}

const key = readPem("KEY_PEM");
const cert = readPem("CERT_PEM");
const HTTP2_SERVER_OPTIONS =
  key.length > 0 && cert.length > 0
    ? {
        key,
        cert,
        allowHTTP1: true,
      }
    : undefined;

const EXCLUDE_HEADER_MATCHERS = [
  /^x-porter-/,     // Internal headers used for communication between agent and server
  /^x-forwarded-/,  // Common proxy headers that can be noisy
  /^fly-/,          // proxy headers added by fly.io that can be noisy
];

const parsePort = (value: string | undefined, fallback = 9000): number => {
  if (!value) return fallback;

  const port = Number.parseInt(value, 10);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid PORT value: ${value}`);
  }

  return port;
};

const PORT = parsePort(process.env.PORT);

export { HTTP2_SERVER_OPTIONS, PORT, EXCLUDE_HEADER_MATCHERS };
