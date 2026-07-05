import { describe, expect, it } from "vitest";

import { generateRandomId, sanitizeHeaders } from "../other";

describe("generateRandomId", () => {
  it("returns a hex string with the expected length", () => {
    const id = generateRandomId(8);
    expect(id).toMatch(/^[a-f0-9]{16}$/);
  });
});

describe("sanitizeHeaders", () => {
  it("drops internal/proxy headers and keeps normal headers", () => {
    const headers = {
      host: "localhost",
      "x-porter-id": "abc",
      "x-forwarded-for": "127.0.0.1",
      "fly-request-id": "123",
      authorization: "Bearer token",
    };

    const sanitized = sanitizeHeaders(headers);

    expect(sanitized).toEqual({
      host: "localhost",
      authorization: "Bearer token",
    });
  });
});
