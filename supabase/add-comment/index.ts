/**
 * POST /add-comment
 *
 * Request JSON:
 * {
 *   "tidal_user_id": string,      // e.g. "demo-user-1"
 *   "track_id": string,           // Tidal track ID
 *   "body": string,               // comment text
 *   "timestamp_seconds": number   // where in the song the comment lands
 * }
 *
 * Success (201) — returns 6 fields:
 * {
 *   "id": string,                 // UUID of the new comment
 *   "tidal_user_id": string,
 *   "track_id": string,
 *   "body": string,
 *   "timestamp_seconds": number,
 *   "created_at": string          // ISO-8601 timestamp
 * }
 *
 * Errors:
 *   401 Unauthorized   { "error": "Unauthorized" }
 *   400 Bad Request    { "error": "Missing fields: ‹field1›, ‹field2›" }
 *   405 Method Not Allowed
 *   502 Bad Gateway    { "error": "Could not insert comment" }
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
   // 2. Auth check: allow either anon key or service key
   const authHeader = req.headers.get("Authorization") || "";
   const token = authHeader.replace(/^Bearer\s*/, "");
   if (token !== SUPABASE_ANON_KEY && token !== SUPABASE_SERVICE_KEY) {
     return new Response(JSON.stringify({
       error: "Unauthorized"
     }), {
       status: 401
     });
   }
   // 3. Payload parse
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
   // 4. Field validation
   const { tidal_user_id, track_id, body, timestamp_seconds } = payload;
   const missing = [];
   if (!tidal_user_id) missing.push("tidal_user_id");
   if (!track_id) missing.push("track_id");
   if (!body) missing.push("body");
   if (timestamp_seconds == null) missing.push("timestamp_seconds");
   if (missing.length) {
     return new Response(JSON.stringify({
       error: `Missing fields: ${missing.join(", ")}`
     }), {
       status: 400
     });
   }
   // 5. Insert into DB
   const { data: comment, error } = await supabase.from("comments").insert({
     tidal_user_id,
     track_id,
     body,
     timestamp_seconds
   }).select("id, tidal_user_id, track_id, body, timestamp_seconds, created_at").single();
   if (error || !comment) {
     console.error("Insert error:", error);
     return new Response(JSON.stringify({
       error: "Could not insert comment"
     }), {
       status: 502
     });
   }
   // 6. Success
   return new Response(JSON.stringify(comment), {
     status: 201,
     headers: {
       "Content-Type": "application/json"
     }
   });
 });
 