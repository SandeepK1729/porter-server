import { readFileSync } from "node:fs";
import process from "node:process";

function readPem(envVar: string): Buffer {
  const value = process.env[envVar];
  if (!value) throw new Error(`${envVar} is not set`);

  return Buffer.from(value.replace(/\\n/g, "\n"));
}

const HTTP2_SERVER_OPTIONS = {
  key: readPem("KEY_PEM"),
  cert: readPem("CERT_PEM"),
  allowHTTP1: true,
};

const EXCLUDE_HEADER_MATCHERS = [
  /^x-porter-/, // Internal headers used for communication between agent and server
  /^x-forwarded-/, // Common proxy headers that can be noisy
  /^fly-/, // proxy headers added by fly.io that can be noisy
];

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 9000;

export { HTTP2_SERVER_OPTIONS, PORT, EXCLUDE_HEADER_MATCHERS };
