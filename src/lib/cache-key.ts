import { createHash } from "node:crypto";

export function analysisCacheKey(
  text: string,
  provider: string,
  accent: string,
): string {
  return createHash("sha1")
    .update(`${provider} ${accent} ${text.trim()}`)
    .digest("hex")
    .slice(0, 20);
}
