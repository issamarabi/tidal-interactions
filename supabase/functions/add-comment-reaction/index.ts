/**
 * POST /add-comment-reaction
 *
 * **Example cURL**
 * ```bash
 * curl -X POST https://your-project.supabase.co/functions/v1/add-comment-reaction \
 *   -H "Content-Type: application/json" \
 *   -H "Authorization: Bearer <ANON_OR_SERVICE_KEY>" \
 *   -d '{
 *     "tidal_user_id":"demo-user-1",
 *     "comment_id":"ef46ccec-4ce5-48b4-80f3-6b0d4d2fd2ca",
 *     "emoji":"👍"
 *   }'
 * ```
 *
 * **Request JSON**
 * {
 *   "tidal_user_id": string,   // user reacting
 *   "comment_id": string,      // UUID of the comment
 *   "emoji": string            // e.g. "👍", "😂"
 * }
 *
 * **Success (201)** — returns 4 fields:
 * {
 *   "tidal_user_id": string,
 *   "comment_id": string,
 *   "emoji": string,
 *   "created_at": string       // ISO-8601 timestamp
 * }
 *
 * **Errors**
 *   401 Unauthorized    { "error": "Unauthorized" }
 *   400 Bad Request     { "error": "Missing fields: ‹field1›, ‹field2›" }
 *   409 Conflict       { "error": "Reaction already exists" }
 *   405 Method Not Allowed
 *   502 Bad Gateway     { "error": "Could not add comment reaction" }
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
   const { tidal_user_id, comment_id, emoji } = payload;
   const missing = [];
   if (!tidal_user_id) missing.push("tidal_user_id");
   if (!comment_id) missing.push("comment_id");
   if (!emoji) missing.push("emoji");
   if (missing.length) {
     return new Response(JSON.stringify({
       error: `Missing fields: ${missing.join(", ")}`
     }), {
       status: 400
     });
   }
   const { data: react, error } = await supabase.from("comment_reactions").insert({
     tidal_user_id,
     comment_id,
     emoji
   }).select("tidal_user_id, comment_id, emoji, created_at").single();
   if (error) {
     if (error.code === "23505") {
       // unique_violation
       return new Response(JSON.stringify({
         error: "Reaction already exists"
       }), {
         status: 409
       });
     }
     console.error("Insert error:", error);
     return new Response(JSON.stringify({
       error: "Could not add comment reaction"
     }), {
       status: 502
     });
   }
   return new Response(JSON.stringify(react), {
     status: 201,
     headers: {
       "Content-Type": "application/json"
     }
   });
 });
 