import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const N = 131072;
const KEY_LENGTH = 64;
function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, { N, r: 8, p: 1, maxmem: 256 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return `scrypt$v1$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string | null) {
  const match = stored?.match(/^scrypt\$v1\$([a-f0-9]{32})\$([a-f0-9]{128})$/);
  // Unknown users and accounts without a password perform the same expensive KDF.
  const salt = match ? Buffer.from(match[1], "hex") : Buffer.alloc(16);
  const expected = match ? Buffer.from(match[2], "hex") : Buffer.alloc(KEY_LENGTH);
  const actual = await derive(password, salt);
  return timingSafeEqual(actual, expected) && Boolean(match);
}
