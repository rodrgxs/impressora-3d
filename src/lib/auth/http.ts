import { isIP } from "node:net";

// Only enable an IP header when the ingress overwrites it and direct origin access is blocked.
export function clientKey(headers: Headers) {
  const trustedHeader = process.env.AUTH_CLIENT_IP_HEADER;
  const value = trustedHeader ? headers.get(trustedHeader)?.trim() : undefined;
  // Accept one IP only, never an untrusted forwarding chain or arbitrary bucket key.
  if (!value || !isIP(value)) return "unknown";
  return isIP(value) === 6 ? new URL(`http://[${value}]/`).hostname : value;
}

export function sameOrigin(request: Request) {
  const expected = new URL(process.env.AUTH_URL || request.url).origin;
  return request.headers.get("origin") === expected;
}

export async function readSmallJson(
  request: Request,
  maxBytes = 4096,
): Promise<unknown> {
  if (
    request.headers
      .get("content-type")
      ?.split(";", 1)[0]
      .trim()
      .toLowerCase() !== "application/json"
  ) {
    throw new Error("Invalid content type");
  }
  if (Number(request.headers.get("content-length")) > maxBytes)
    throw new Error("Body too large");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new Error("Body too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
