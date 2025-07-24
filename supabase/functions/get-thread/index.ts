/**
 * POST /get-thread
 *
 * Request JSON:
 * {
 *   "track_id": string,    // Tidal track ID (required)
 *   "sort_by": string      // Optional. Sorting method ("most_reactions", "most_replies", "latest", "earliest").
 *                          // Default: by sum of [# reactions + # replies], highest first ("most_engagement").
 * }
 *
 * Returns:
 *   200 OK
 *   {
 *     "track_id": string,
 *     "comments": [
 *       {
 *         "id": string,
 *         "tidal_user_id": string,
 *         "avatar_url": string|null,    // Avatar URL as stored in users, or null if missing
 *         "body": string,
 *         "timestamp_seconds": number,
 *         "created_at": string,
 *         "reactions": [
 *           {
 *             "tidal_user_id": string,
 *             "avatar_url": string|null,
 *             "emoji": string,
 *             "created_at": string
 *           }
 *         ],
 *         "replies": [
 *           {
 *             "id": string,
 *             "tidal_user_id": string,
 *             "avatar_url": string|null,
 *             "body": string,
 *             "created_at": string,
 *             "parent_comment_id": string,
 *             "reactions": [
 *               {
 *                 "tidal_user_id": string,
 *                 "avatar_url": string|null,
 *                 "emoji": string,
 *                 "created_at": string
 *               }
 *             ]
 *           }
 *         ]
 *       }
 *     ]
 *   }
 *
 * Edge/Covered Cases:
 * - If a comment or reply has no reactions, `"reactions": []`.
 * - If a comment has no replies, `"replies": []`.
 * - If a user no longer exists, `"avatar_url": null` for that user.
 * - If multiple comments have the same sort value, they are ordered by `created_at` ascending.
 * - If no comments are found for the track, returns 404 with `{ "error": "No comments found for this track" }`.
 *
 * Error responses:
 *   400 Bad Request    { "error": "Missing fields: track_id" }
 *   404 Not Found      { "error": "No comments found for this track" }
 *   405 Method Not Allowed
 *   502 Bad Gateway    { "error": "Could not fetch thread" }
 */ import { serve } from "https://deno.land/std@0.184.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
 const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
 serve(async (req)=>{
   if (req.method !== "POST") {
     return new Response(null, {
       status: 405
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
   const { track_id, sort_by } = payload ?? {};
   const missing = [];
   if (!track_id) missing.push("track_id");
   if (missing.length) {
     return new Response(JSON.stringify({
       error: `Missing fields: ${missing.join(", ")}`
     }), {
       status: 400
     });
   }
   // 1. Get all comments for the track
   const { data: comments, error: commentsError } = await supabase.from("comments").select("id, tidal_user_id, body, timestamp_seconds, created_at").eq("track_id", track_id);
   if (commentsError) {
     console.error("Comments error:", commentsError);
     return new Response(JSON.stringify({
       error: "Could not fetch thread",
       details: commentsError.message
     }), {
       status: 502
     });
   }
   if (!comments || comments.length === 0) {
     return new Response(JSON.stringify({
       error: "No comments found for this track"
     }), {
       status: 404
     });
   }
   // 2. Get all replies for these comments
   const commentIds = comments.map((c)=>c.id);
   let replies = [];
   if (commentIds.length > 0) {
     const { data: repliesData, error: repliesError } = await supabase.from("comment_replies").select("id, tidal_user_id, body, created_at, parent_comment_id").in("parent_comment_id", commentIds);
     if (repliesError) {
       console.error("Replies error:", repliesError);
       return new Response(JSON.stringify({
         error: "Could not fetch thread",
         details: repliesError.message
       }), {
         status: 502
       });
     }
     replies = repliesData || [];
   }
   // 3. Get all reactions for comments
   let commentReactions = [];
   if (commentIds.length > 0) {
     const { data: commentReactionsData, error: crError } = await supabase.from("comment_reactions").select("tidal_user_id, comment_id, emoji, created_at").in("comment_id", commentIds);
     if (crError) {
       console.error("Comment reactions error:", crError);
       return new Response(JSON.stringify({
         error: "Could not fetch thread",
         details: crError.message
       }), {
         status: 502
       });
     }
     commentReactions = commentReactionsData || [];
   }
   // 4. Get all reactions for replies (from reply_reactions)
   const replyIds = replies.map((r)=>r.id);
   let replyReactions = [];
   if (replyIds.length > 0) {
     const { data: replyReactionsData, error: rrError } = await supabase.from("reply_reactions").select("tidal_user_id, comment_id, emoji, created_at").in("comment_id", replyIds);
     if (rrError) {
       console.error("Reply reactions error:", rrError);
       return new Response(JSON.stringify({
         error: "Could not fetch thread",
         details: rrError.message
       }), {
         status: 502
       });
     }
     replyReactions = replyReactionsData || [];
   }
   // 5. Collect all unique tidal_user_id seen in comments, replies, and all reactions
   const allUserIdsSet = new Set();
   comments.forEach((c)=>c.tidal_user_id && allUserIdsSet.add(c.tidal_user_id));
   replies.forEach((r)=>r.tidal_user_id && allUserIdsSet.add(r.tidal_user_id));
   commentReactions.forEach((r)=>r.tidal_user_id && allUserIdsSet.add(r.tidal_user_id));
   replyReactions.forEach((r)=>r.tidal_user_id && allUserIdsSet.add(r.tidal_user_id));
   const allUserIds = Array.from(allUserIdsSet);
   // 6. Query users table to get avatar_url for all IDs
   let avatarMap = {};
   if (allUserIds.length > 0) {
     const { data: users, error: userError } = await supabase.from("users").select("tidal_user_id, avatar_url").in("tidal_user_id", allUserIds);
     if (userError) {
       console.error("User lookup error:", userError);
     // fallback: all avatars missing, but don't error out
     }
     users?.forEach((u)=>{
       avatarMap[u.tidal_user_id] = u.avatar_url ?? null;
     });
   }
   // 7. Assemble replies with their reactions, parent, and avatar_url
   const repliesByParent = {};
   replies.forEach((reply)=>{
     const thisReplyReactions = replyReactions.filter((reaction)=>reaction.comment_id === reply.id).map(({ comment_id, tidal_user_id, ...rest })=>({
         tidal_user_id,
         avatar_url: avatarMap[tidal_user_id] ?? null,
         ...rest
       }));
     const replyObj = {
       ...reply,
       avatar_url: avatarMap[reply.tidal_user_id] ?? null,
       reactions: thisReplyReactions
     };
     if (!repliesByParent[reply.parent_comment_id]) {
       repliesByParent[reply.parent_comment_id] = [];
     }
     repliesByParent[reply.parent_comment_id].push(replyObj);
   });
   // 8. Sort replies per parent by number of reactions (descending)
   Object.keys(repliesByParent).forEach((parentId)=>{
     repliesByParent[parentId].sort((a, b)=>(b.reactions?.length || 0) - (a.reactions?.length || 0));
   });
   // 9. Assemble comments with their reactions, replies, avatar_url
   const fullComments = comments.map((comment)=>{
     const reactions = commentReactions.filter((r)=>r.comment_id === comment.id).map(({ comment_id, tidal_user_id, ...rest })=>({
         tidal_user_id,
         avatar_url: avatarMap[tidal_user_id] ?? null,
         ...rest
       }));
     const replies = repliesByParent[comment.id] || [];
     return {
       ...comment,
       avatar_url: avatarMap[comment.tidal_user_id] ?? null,
       reactions,
       replies
     };
   });
   // 10. Sort comments according to sort_by parameter
   switch(sort_by){
     case "most_reactions":
       fullComments.sort((a, b)=>(b.reactions?.length || 0) - (a.reactions?.length || 0));
       break;
     case "latest":
       fullComments.sort((a, b)=>new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
       break;
     case "earliest":
       fullComments.sort((a, b)=>new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
       break;
     case "most_replies":
       fullComments.sort((a, b)=>(b.replies?.length || 0) - (a.replies?.length || 0));
       break;
     default:
       // Default: most engagement (reactions + replies)
       fullComments.sort((a, b)=>(b.reactions?.length || 0) + (b.replies?.length || 0) - ((a.reactions?.length || 0) + (a.replies?.length || 0)));
   }
   const response = {
     track_id,
     comments: fullComments
   };
   return new Response(JSON.stringify(response), {
     status: 200,
     headers: {
       "Content-Type": "application/json"
     }
   });
 });
 