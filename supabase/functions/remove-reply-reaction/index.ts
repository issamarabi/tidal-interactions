/**
 * POST /remove-reply-reaction
 *
 * Request JSON:
 * {
 *   "tidal_user_id": string, // user's ID
 *   "comment_id": string,    // ID of the reply (NOT top-level comment!)
 *   "emoji": string          // emoji of reaction to remove
 * }
 *
 * Success (200):
 * {
 *   "tidal_user_id": string,
 *   "comment_id": string,
 *   "emoji": string,
 *   "deleted": boolean
 * }
 *
 * Errors:
 *   400 Bad Request    { "error": "Missing fields: ‹field›" }
 *   404 Not Found      { "error": "Reaction not found" }
 *   405 Method Not Allowed
 *   502 Bad Gateway    { "error": "Could not delete reaction" }
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
   // Auth Check
   const authHeader = req.headers.get("Authorization") || "";
   const token = authHeader.replace(/^Bearer\s*/, "");
   if (token !== SUPABASE_ANON_KEY && token !== SUPABASE_SERVICE_KEY) {
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
   const { tidal_user_id, comment_id, emoji } = payload ?? {};
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
   // Check if reaction exists
   const { data: existing, error: selectError } = await supabase.from("reply_reactions").select("tidal_user_id,comment_id,emoji").eq("tidal_user_id", tidal_user_id).eq("comment_id", comment_id).eq("emoji", emoji).single();
   if (selectError) {
     if (selectError.code === "PGRST116") {
       return new Response(JSON.stringify({
         error: "Reaction not found"
       }), {
         status: 404
       });
     }
     console.error("Select error:", selectError);
     return new Response(JSON.stringify({
       error: "Could not delete reaction"
     }), {
       status: 502
     });
   }
   if (!existing) {
     return new Response(JSON.stringify({
       error: "Reaction not found"
     }), {
       status: 404
     });
   }
   // Delete reaction
   const { error } = await supabase.from("reply_reactions").delete().eq("tidal_user_id", tidal_user_id).eq("comment_id", comment_id).eq("emoji", emoji);
   if (error) {
     console.error("Delete error:", error);
     return new Response(JSON.stringify({
       error: "Could not delete reaction"
     }), {
       status: 502
     });
   }
   return new Response(JSON.stringify({
     tidal_user_id,
     comment_id,
     emoji,
     deleted: true
   }), {
     status: 200,
     headers: {
       "Content-Type": "application/json"
     }
   });
 });
 