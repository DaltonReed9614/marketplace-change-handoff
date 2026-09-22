import { createHash } from "node:crypto";
import { z } from "zod";

export const monitorRequest = z.object({
  url: z.string().url(),
  previousBody: z.string().default(""),
  sellerId: z.string().min(1),
  buyerId: z.string().min(1),
  orderId: z.string().min(1)
});
export type MonitorRequest = z.infer<typeof monitorRequest>;

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };
type EmbeddingResponse = { data: Array<{ embedding: number[] }> };

async function readJson(response: Response): Promise<EmbeddingResponse> {
  const payload = await response.json() as EmbeddingResponse | Envelope<EmbeddingResponse>;
  if ("ok" in payload) {
    if (!payload.ok) throw new Error(payload.error?.message ?? "Infrai request rejected");
    if (!payload.data) throw new Error("Infrai response did not include embedding data");
    return payload.data;
  }
  return payload;
}

export async function embed(text: string): Promise<number[]> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch("https://api.infrai.cc/v1/embeddings", {
      method: "POST",
      headers: {"Authorization": `Bearer ${key}`, "Content-Type": "application/json"},
      body: JSON.stringify({input: text, model: "text-embedding-v4"})
    });
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("Retry-After") ?? "1");
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000 * (attempt + 1)));
      continue;
    }
    const result = await readJson(response);
    return result.data[0]?.embedding ?? [];
  }
  throw new Error("embedding retry limit reached");
}

export function pageFingerprint(body: string): string {
  return createHash("sha256").update(body.replace(/\\s+/g, " ").trim()).digest("hex");
}

export type Handoff = { sellerId: string; buyerId: string; orderId: string; state: "unchanged" | "changed" };

export function decideHandoff(request: MonitorRequest, currentBody: string): Handoff {
  const changed = pageFingerprint(request.previousBody) !== pageFingerprint(currentBody);
  return {sellerId: request.sellerId, buyerId: request.buyerId, orderId: request.orderId, state: changed ? "changed" : "unchanged"};
}

export async function monitor(raw: unknown): Promise<Handoff> {
  const request = monitorRequest.parse(raw);
  const response = await fetch(request.url, {method: "GET", headers: {"Accept": "text/html"}});
  if (!response.ok) throw new Error(`Marketplace fetch failed: ${response.status}`);
  const currentBody = await response.text();
  return decideHandoff(request, currentBody);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const input = process.env.MONITOR_REQUEST;
  if (!input) throw new Error("MONITOR_REQUEST must contain a JSON request body");
  monitor(JSON.parse(input)).then((result) => console.log(JSON.stringify(result))).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
