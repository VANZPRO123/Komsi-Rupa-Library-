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
    new TextEncoder().encode(`${ip}|${userAgent.slice(0, 300)}`),
  ));
  const bytes = digest.slice(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  let profileUserId: string;
  try {
    const body = await req.json();
    profileUserId = String(body?.profile_user_id || "").trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(profileUserId)) {
      return jsonResponse({ error: "Invalid profile_user_id" }, 400);
    }
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const forwarded = req.headers.get("x-forwarded-for") || "";
  const ip = (req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") ||
    forwarded.split(",").map((value) => value.trim()).filter(Boolean).at(-1) || "").trim();
  if (!ip || ip.length > 128) return jsonResponse({ error: "Unable to identify visitor" }, 400);

  try {
    const secret = getSecretKey();
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      secret,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("member_profiles")
      .select("user_id")
      .eq("user_id", profileUserId)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile) return jsonResponse({ error: "Member profile not found" }, 404);

    const visitorId = await makeVisitorId(ip, req.headers.get("user-agent") || "", secret);
    const { error } = await supabaseAdmin
      .from("member_profile_visits")
      .insert({ profile_user_id: profileUserId, visitor_id: visitorId });

    if (error?.code === "23505") return jsonResponse({ counted: false, duplicate: true });
    if (error?.code === "23503") return jsonResponse({ error: "Member profile not found" }, 404);
    if (error) {
      console.error("Profile visit insert failed:", error.code);
      return jsonResponse({ error: "Could not record profile visit" }, 500);
    }
    return jsonResponse({ counted: true });
  } catch (error) {
    console.error("Profile visit recorder error:", error instanceof Error ? error.message : "unknown");
    return jsonResponse({ error: "Profile visit recorder unavailable" }, 500);
  }
});
