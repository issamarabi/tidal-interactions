/**
 * POST /get-song-reactions
 *
 * **Example cURL**
 * ```bash
 * curl -X POST https://your-project.supabase.co/functions/v1/get-song-reactions \
 *   -H "Content-Type: application/json" \
 *   -H "Authorization: Bearer <ANON_OR_SERVICE_KEY>" \
 *   -d '{
 *     "track_id":"track123"
 *   }'
 * ```
 *
 * **Request JSON**
 * {
 *   "track_id": string   // Tidal track ID to fetch reactions for
 * }
 *
 * **Success (200)** — returns an array of reaction objects:
 * [
 *   {
 *     "id": string,               // UUID of the reaction record
 *     "tidal_user_id": string,
 *     "track_id": string,
 *     "emoji": string,
 *     "timestamp_seconds": number,
 *     "created_at": string        // ISO-8601 timestamp
 *   },
 *   // …more reactions
 * ]
 *
 * **Errors**
 *   400 Bad Request     { "error": "Missing track_id" }
 *   401 Unauthorized    { "error": "Unauthorized" }
 *   405 Method Not Allowed
 *   502 Bad Gateway     { "error": "Could not fetch reactions" }
 */ import { serve } from "https://deno.land/std@0.184.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
 const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
 const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
 serve(async (req)=>{
   // 1. Method check
   if (req.method !== "POST") {
     return new Response(null, {
       status: 405
     });
   }
   // 2. Auth check: allow anon or service key
   const auth = req.headers.get("Authorization")?.replace(/^Bearer\s*/, "");
   if (auth !== SUPABASE_ANON_KEY && auth !== SUPABASE_SERVICE_KEY) {
     return new Response(JSON.stringify({
       error: "Unauthorized"
     }), {
       status: 401
     });
   }
   // 3. Parse JSON body
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
   const { track_id } = payload;
   if (!track_id) {
     return new Response(JSON.stringify({
       error: "Missing track_id"
     }), {
       status: 400
     });
   }
   // 4. Fetch reactions
   const { data: reactions, error } = await supabase.from("reactions").select("id, tidal_user_id, track_id, emoji, timestamp_seconds, created_at").eq("track_id", track_id).order("created_at", {
     ascending: true
   });
   if (error) {
     console.error("Fetch error:", error);
     return new Response(JSON.stringify({
       error: "Could not fetch reactions"
     }), {
       status: 502
     });
   }
   // 5. Return reactions (empty array if none)
   return new Response(JSON.stringify(reactions), {
     status: 200,
     headers: {
       "Content-Type": "application/json"
     }
   });
 });
 