/**
 * POST /remove-reply
 *
 * Request JSON:
 * {
 *   "id": string    // reply ID to delete
 * }
 *
 * Success (200):
 * {
 *   "id": string,          // deleted reply ID
 *   "deleted": boolean     // always true if deletion succeeded
 * }
 *
 * Errors:
 *   400 Bad Request    { "error": "Missing fields: id" }
 *   404 Not Found      { "error": "Reply not found" }
 *   405 Method Not Allowed
 *   502 Bad Gateway    { "error": "Could not delete reply" }
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
   //Auth Check
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
   const { id } = payload ?? {};
   const missing = [];
   if (!id) missing.push("id");
   if (missing.length) {
     return new Response(JSON.stringify({
       error: `Missing fields: ${missing.join(", ")}`
     }), {
       status: 400
     });
   }
   // Check if reply exists
   const { data: existing, error: selectError } = await supabase.from("comment_replies").select("id").eq("id", id).single();
   if (selectError) {
     if (selectError.code === "PGRST116") {
       return new Response(JSON.stringify({
         error: "Reply not found"
       }), {
         status: 404
       });
     }
     console.error("Select error:", selectError);
     return new Response(JSON.stringify({
       error: "Could not delete reply"
     }), {
       status: 502
     });
   }
   if (!existing) {
     return new Response(JSON.stringify({
       error: "Reply not found"
     }), {
       status: 404
     });
   }
   const { error } = await supabase.from("comment_replies").delete().eq("id", id);
   if (error) {
     console.error("Delete error:", error);
     return new Response(JSON.stringify({
       error: "Could not delete reply"
     }), {
       status: 502
     });
   }
   return new Response(JSON.stringify({
     id,
     deleted: true
   }), {
     status: 200,
     headers: {
       "Content-Type": "application/json"
     }
   });
 });
 