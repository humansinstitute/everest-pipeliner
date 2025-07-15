import { randomBytes } from "crypto";

export function generateJobId() {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(4).toString("hex");
  return `job_${timestamp}_${random}`;
}

export function generateRequestId() {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(6).toString("hex");
  return `req_${timestamp}_${random}`;
}
