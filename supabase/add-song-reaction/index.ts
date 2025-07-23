/**
 * POST /add-song-reaction
 *
 * **Example cURL**
 * ```bash
 * curl -X POST https://your-project.supabase.co/functions/v1/add-song-reaction \
 *   -H "Content-Type: application/json" \
 *   -H "Authorization: Bearer <ANON_OR_SERVICE_KEY>" \
 *   -d '{
 *     "tidal_user_id":"demo-user-2",
 *     "track_id":"track123",
 *     "emoji":"🔥",
 *     "timestamp_seconds":45
 *   }'
 * ```
 *
 * **Request JSON**
 * {
 *   "tidal_user_id": string,    // e.g. "demo-user-1"
 *   "track_id": string,         // Tidal track ID
 *   "emoji": string,            // e.g. "🔥", "😍"
 *   "timestamp_seconds": number // optional: where reaction happened
 * }
 *
 * **Success (201)** — returns 6 fields:
 * {
 *   "id": string,               // UUID of the reaction record
 *   "tidal_user_id": string,
 *   "track_id": string,
 *   "emoji": string,
 *   "timestamp_seconds": number,
 *   "created_at": string        // ISO-8601 timestamp
 * }
 *
 * **Errors**
 *   401 Unauthorized    { "error": "Unauthorized" }
 *   400 Bad Request     { "error": "Missing fields: ‹field1›, ‹field2›" }
 *   405 Method Not Allowed
 *   502 Bad Gateway     { "error": "Could not add song reaction" }
 */ import { serve } from "https://deno.land/std@0.184.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
 const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
 const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
 serve(async (req)=>{
   if (req.method !== "POST") {
     return new Response(null, {
       status: 405
     });
   }
   // Auth: allow anon or service key
   const auth = req.headers.get("Authorization")?.replace(/^Bearer\s*/, "");
   if (auth !== SUPABASE_ANON_KEY && auth !== SUPABASE_SERVICE_KEY) {
     return new Response(JSON.stringify({
       error: "Unauthorized"
     }), {
       status: 401
     });
   }
   let payload;
   try {
     payload = await req.json();
   } catch  {
     return new Response(JSON.stringify({
       error: "Invalid JSON"
     }), {
       status: 400
     });
   }
   const { tidal_user_id, track_id, emoji, timestamp_seconds } = payload;
   const missing = [];
   if (!tidal_user_id) missing.push("tidal_user_id");
   if (!track_id) missing.push("track_id");
   if (!emoji) missing.push("emoji");
   if (timestamp_seconds == null) missing.push("timestamp_seconds");
   if (missing.length) {
     return new Response(JSON.stringify({
       error: `Missing fields: ${missing.join(", ")}`
     }), {
       status: 400
     });
   }
   const { data: reaction, error } = await supabase.from("reactions").insert({
     tidal_user_id,
     track_id,
     emoji,
     timestamp_seconds
   }).select("id, tidal_user_id, track_id, emoji, timestamp_seconds, created_at").single();
   if (error || !reaction) {
     console.error("Insert error:", error);
     return new Response(JSON.stringify({
       error: "Could not add song reaction"
     }), {
       status: 502
     });
   }
   return new Response(JSON.stringify(reaction), {
     status: 201,
     headers: {
       "Content-Type": "application/json"
     }
   });
 });
 