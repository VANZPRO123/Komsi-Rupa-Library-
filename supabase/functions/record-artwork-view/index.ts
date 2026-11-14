import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function getSecretKey(): string {
  const secretKeysRaw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (secretKeysRaw) {
    const secretKeys = JSON.parse(secretKeysRaw);
    if (secretKeys.default) return secretKeys.default;
  }
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  throw new Error("Supabase server secret is not configured");
}

async function makeVisitorId(ip: string, userAgent: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = new Uint8Array(await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${ip}| ${userAgent.slice(0, 300)}`),
  ));
  const bytes = digest.slice(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  let artworkId: number;
  try {
    const body = await req.json();
    artworkId = Number(body?.artwork_id);
    if (!Number.isSafeInteger(artworkId) || artworkId <= 0) {
      return jsonResponse({ error: "Invalid artwork_id" }, 400);
    }
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  // Prefer the client IP added by the edge proxy. The final X-Forwarded-For
  // entry is used as a fallback because proxies append the connecting address.
  const forwarded = req.headers.get("x-forwarded-for") || "";
  const ip = (req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") ||
    forwarded.split(",").map((value) => value.trim()).filter(Boolean).at(-1) || "").trim();
  if (!ip || ip.length > 128) return jsonResponse({ error: "Unable to identify visitor" }, 400);

  try {
    const secret = getSecretKey();
    const visitorId = await makeVisitorId(ip, req.headers.get("user-agent") || "", secret);
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      secret,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { error } = await supabaseAdmin
      .from("artwork_views")
      .insert({ artwork_id: artworkId, visitor_id: visitorId });

    if (error?.code === "23505") return jsonResponse({ counted: false, duplicate: true });
    if (error?.code === "23503") return jsonResponse({ error: "Artwork not found" }, 404);
    if (error) {
      console.error("View event insert failed:", error.code);
      return jsonResponse({ error: "Could not record view" }, 500);
    }
    return jsonResponse({ counted: true });
  } catch (error) {
    console.error("View recorder configuration/runtime error:", error instanceof Error ? error.message : "unknown");
    return jsonResponse({ error: "View recorder unavailable" }, 500);
  }
});
