/**
 * POST /add-reply
 *
 * **Example cURL**
 * ```bash
 * curl -X POST https://your-project.supabase.co/functions/v1/add-reply \
 *   -H "Content-Type: application/json" \
 *   -H "Authorization: Bearer <ANON_OR_SERVICE_KEY>" \
 *   -d '{
 *     "tidal_user_id":"demo-user-1",
 *     "parent_comment_id":"550e8400-e29b-41d4-a716-446655440000",
 *     "body":"Thanks for this insight!"
 *   }'
 * ```
 *
 * **Request JSON**
 * {
 *   "tidal_user_id": string,        // e.g. "demo-user-1"
 *   "parent_comment_id": string,    // UUID of the comment being replied to
 *   "body": string                  // reply text
 * }
 *
 * **Success (201)** — returns 5 fields:
 * {
 *   "id": string,                   // UUID of the new reply
 *   "tidal_user_id": string,
 *   "parent_comment_id": string,
 *   "body": string,
 *   "created_at": string            // ISO-8601 timestamp
 * }
 *
 * **Errors**
 *   401 Unauthorized    { "error": "Unauthorized" }
 *   400 Bad Request     { "error": "Missing fields: ‹field1›, ‹field2›" }
 *   405 Method Not Allowed
 *   502 Bad Gateway     { "error": "Could not insert reply" }
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
   const { tidal_user_id, parent_comment_id, body } = payload;
   const missing = [];
   if (!tidal_user_id) missing.push("tidal_user_id");
   if (!parent_comment_id) missing.push("parent_comment_id");
   if (!body) missing.push("body");
   if (missing.length) {
     return new Response(JSON.stringify({
       error: `Missing fields: ${missing.join(", ")}`
     }), {
       status: 400
     });
   }
   const { data: reply, error } = await supabase.from("comment_replies").insert({
     tidal_user_id,
     parent_comment_id,
     body
   }).select("id, tidal_user_id, parent_comment_id, body, created_at").single();
   if (error || !reply) {
     console.error("Insert error:", error);
     return new Response(JSON.stringify({
       error: "Could not insert reply"
     }), {
       status: 502
     });
   }
   return new Response(JSON.stringify(reply), {
     status: 201,
     headers: {
       "Content-Type": "application/json"
     }
   });
 });
 