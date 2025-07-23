/**
 * PATCH /edit-reply
 *
 * **Example cURL**
 * ```bash
 * curl -X PATCH https://your-project.supabase.co/functions/v1/edit-reply \
 *   -H "Content-Type: application/json" \
 *   -H "Authorization: Bearer <ANON_OR_SERVICE_KEY>" \
 *   -d '{
 *     "id":"550e8400-e29b-41d4-a716-446655440001",
 *     "body":"Updated reply text"
 *   }'
 * ```
 *
 * **Request JSON**
 * {
 *   "id": string,    // UUID of the reply to edit
 *   "body": string   // new reply text
 * }
 *
 * **Success (200)** — returns the updated reply:
 * {
 *   "id": string,
 *   "tidal_user_id": string,
 *   "parent_comment_id": string,
 *   "body": string,
 *   "created_at": string  // original creation timestamp
 * }
 *
 * **Errors**
 *   401 Unauthorized       { "error": "Unauthorized" }
 *   400 Bad Request        { "error": "Missing fields: ‹field›" }
 *   405 Method Not Allowed
 *   502 Bad Gateway        { "error": "Could not update reply" }
 */ import { serve } from "https://deno.land/std@0.184.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
 const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
 const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
 serve(async (req)=>{
   if (req.method !== "PATCH") {
     return new Response(null, {
       status: 405
     });
   }
   // Auth
   const auth = req.headers.get("Authorization")?.replace(/^Bearer\s*/, "");
   if (auth !== SUPABASE_ANON_KEY && auth !== SUPABASE_SERVICE_KEY) {
     return new Response(JSON.stringify({
       error: "Unauthorized"
     }), {
       status: 401
     });
   }
   // Parse body
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
   const { id, body } = payload;
   const missing = [];
   if (!id) missing.push("id");
   if (!body) missing.push("body");
   if (missing.length) {
     return new Response(JSON.stringify({
       error: `Missing fields: ${missing.join(", ")}`
     }), {
       status: 400
     });
   }
   // Update
   const { data: reply, error } = await supabase.from("comment_replies").update({
     body
   }).eq("id", id).select("id, tidal_user_id, parent_comment_id, body, created_at").single();
   if (error || !reply) {
     console.error("Update error:", error);
     return new Response(JSON.stringify({
       error: "Could not update reply"
     }), {
       status: 502
     });
   }
   return new Response(JSON.stringify(reply), {
     status: 200,
     headers: {
       "Content-Type": "application/json"
     }
   });
 });
 