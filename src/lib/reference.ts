import { randomInt } from "node:crypto";

// Unambiguous characters (no 0/O, 1/I/L) so references are easy to read over the phone.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** e.g. "PM-261126-7KQ4X" — date prefix (IST) + 5 random characters. */
export function generateReference(prefix = "PM", now = new Date()): string {
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const yy = String(ist.getUTCFullYear()).slice(2);
  const mm = String(ist.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(ist.getUTCDate()).padStart(2, "0");
  let rand = "";
  for (let i = 0; i < 5; i++) rand += ALPHABET[randomInt(ALPHABET.length)];
  return `${prefix}-${yy}${mm}${dd}-${rand}`;
}

export const REFERENCE_PATTERN = /^[A-Z]{2}-\d{6}-[2-9A-HJKMNP-Z]{5}$/;
