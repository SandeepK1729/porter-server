import crypto from "node:crypto";

const generateRandomId = (bytes = 4) => crypto.randomBytes(bytes).toString("hex");

export { generateRandomId };
