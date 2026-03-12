import crypto from "node:crypto";
import http from "node:http";

import { EXCLUDE_HEADER_MATCHERS } from "@/config";

const sanitizeHeaders = (headers: http.IncomingHttpHeaders) => {
  const sanitized: http.IncomingHttpHeaders = {};

  for (const [key, value] of Object.entries(headers)) {
    // Exclude headers that match any of the exclude patterns
    if (EXCLUDE_HEADER_MATCHERS.some((regex) => regex.test(key))) continue;
    sanitized[key] = value;
  }

  return sanitized;
}

const generateRandomId = (bytes = 4) => crypto.randomBytes(bytes).toString("hex");

export { generateRandomId, sanitizeHeaders };
