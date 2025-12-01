import crypto from "crypto";

export default function generarTokenReset(): string {
  return crypto.randomBytes(32).toString("hex");
}
