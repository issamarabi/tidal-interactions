/**
 * POST /add-user
 *
 * Request JSON:
 * {
 *   "tidal_user_id": string,    // e.g. "demo-user-123"
 *   "avatar_url": string|null    // optional
 * }
 *
 * Success:
 *   201 Created — inserted a new user, returns { tidal_user_id, avatar_url }
 *   200 OK      — user already existed, returns the existing record
 *
 * Errors:
 *   400 Bad Request       { error: "Missing fields: tidal_user_id" }
 *   401 Unauthorized      { error: "Unauthorized" }
 *   405 Method Not Allowed
 *   502 Bad Gateway       { error: "Could not insert user" }
 */ import { serve } from "https://deno.land/std@0.184.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
 const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
 const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
 serve(async (req)=>{
   // 1) only POST
   if (req.method !== "POST") {
     return new Response(null, {
       status: 405
     });
   }
   // 2) require a valid Bearer token
   const authHeader = req.headers.get("Authorization") || "";
   const token = authHeader.replace(/^Bearer\s+/, "");
   if (token !== SUPABASE_ANON_KEY && token !== SERVICE_ROLE_KEY) {
     return new Response(JSON.stringify({
       error: "Unauthorized"
     }), {
       status: 401
     });
   }
   // 3) parse JSON
   let body;
   try {
     body = await req.json();
   } catch  {
     return new Response(JSON.stringify({
       error: "Invalid JSON"
     }), {
       status: 400
     });
   }
   const { tidal_user_id, avatar_url = null } = body;
   if (!tidal_user_id) {
     return new Response(JSON.stringify({
       error: "Missing fields: tidal_user_id"
     }), {
       status: 400
     });
   }
   // 4) check for existing user
   const { data: existing, error: fetchError } = await supabase.from("users").select("tidal_user_id, avatar_url").eq("tidal_user_id", tidal_user_id).single();
   if (fetchError && fetchError.code !== "PGRST116") {
     console.error("User lookup error:", fetchError);
     return new Response(JSON.stringify({
       error: "Could not verify user existence"
     }), {
       status: 502
     });
   }
   if (existing) {
     // already exists → return 200 OK
     return new Response(JSON.stringify(existing), {
       status: 200,
       headers: {
         "Content-Type": "application/json"
       }
     });
   }
   // 5) insert new user
   const { data: user, error: insertError } = await supabase.from("users").insert({
     tidal_user_id,
     avatar_url
   }).select("tidal_user_id, avatar_url").single();
   if (insertError || !user) {
     console.error("Insert user error:", insertError);
     return new Response(JSON.stringify({
       error: "Could not insert user"
     }), {
       status: 502
     });
   }
   return new Response(JSON.stringify(user), {
     status: 201,
     headers: {
       "Content-Type": "application/json"
     }
   });
 });
 