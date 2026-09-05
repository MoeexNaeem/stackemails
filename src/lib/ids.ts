import { randomBytes } from "node:crypto";

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

/** URL-safe base36 random string of `len` chars. */
export function randomId(len = 24): string {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/** Prefixed public identifier, e.g. `msg_9f8e7d6c...`. */
export function prefixedId(prefix: string, len = 20): string {
  return `${prefix}_${randomId(len)}`;
}
