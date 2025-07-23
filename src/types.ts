// src/api/addComment.ts
export interface AddCommentPayload {
  tidal_user_id: string
  track_id: string
  body: string
  timestamp_seconds: number
}

export interface AddCommentResponse {
  id: string
  tidal_user_id: string
  track_id: string
  body: string
  timestamp_seconds: number
  created_at: string
}

// src/api/addReplyReaction.ts 
export interface AddReplyReactionPayload {
    tidal_user_id: string,    // e.g. "demo-user-1"
    comment_id: string,        
    emoji: string,            // e.g. "🔥", "😍"
}

export interface AddReplyReactionResponse {
    tidal_user_id: string,
    comment_id: string,
    emoji: string,
    created_at: string 
}

// src/api/addCommentReaction.ts 
export interface AddCommentReactionPayload {
  tidal_user_id: string
  comment_id : string
  emoji : string // e.g. "👍", "😂"
}

export interface AddCommentReactionResponse {
  tidal_user_id: string
  comment_id : string
  emoji : string // e.g. "👍", "😂"
  created_at: string
}

// src/api/addSongReaction.ts 
export interface AddSongReactionPayload {
    tidal_user_id: string,    // e.g. "demo-user-1"
    track_id: string,        
    emoji: string,            // e.g. "🔥", "😍"
    timestamp_seconds?: number // optional: where reaction happened
}

export interface AddSongReactionResponse {
    id: string,               // UUID of the reaction record
    tidal_user_id: string,
    track_id: string,
    emoji: string,
    timestamp_seconds: number,
    created_at: string        // ISO-8601 timestamp
}


// ---------------- Remove ----------------
// Shared Success Response
export interface DeletionSuccessResponse {
  id: string
  deleted: boolean
}

// Shared Error Response (if you want to handle typed errors later)
export interface DeletionErrorResponse {
  error: string
}

// --- remove-reply ---
export interface RemoveReplyPayload {
  id: string
}

// --- remove-comment ---
export interface RemoveCommentPayload {
  id: string
}

// --- remove-comment-reaction ---
export interface RemoveCommentReactionPayload {
  tidal_user_id: string
  comment_id: string
  emoji: string
}

export interface RemoveCommentReactionResponse {
  tidal_user_id: string
  comment_id: string
  emoji: string
  deleted: boolean
}

// --- remove-reply-reaction ---
export interface RemoveReplyReactionPayload {
  tidal_user_id: string
  comment_id: string
  emoji: string
}

export interface RemoveReplyReactionResponse {
  tidal_user_id: string
  comment_id: string
  emoji: string
  deleted: boolean
}

// --- remove-song-reaction ---
export interface RemoveSongReactionPayload {
  id: string
}

// Get

// --- get-thread ---
export type SortMethod = 'most_reactions' | 'most_replies' | 'latest' | 'earliest' | 'most_engagement'

export interface GetThreadPayload {
  track_id: string
  sort_by?: SortMethod
}

export interface Reaction {
  tidal_user_id: string
  avatar_url: string | null
  emoji: string
  created_at: string
}

export interface Reply {
  id: string
  tidal_user_id: string
  avatar_url: string | null
  body: string
  created_at: string
  parent_comment_id: string
  reactions: Reaction[]
}

export interface Comment {
  id: string
  tidal_user_id: string
  avatar_url: string | null
  body: string
  timestamp_seconds: number
  created_at: string
  reactions: Reaction[]
  replies: Reply[]
}

export interface GetThreadResponse {
  track_id: string
  comments: Comment[]
}

// --- get-song-reactions ---
export interface GetSongReactionsPayload {
  track_id: string
}

export interface SongReaction {
  id: string
  tidal_user_id: string
  track_id: string
  emoji: string
  timestamp_seconds: number
  created_at: string
}

// --- edit-comment ---
export interface EditCommentPayload {
  id: string
  body: string
}

export interface EditCommentResponse {
  id: string
  tidal_user_id: string
  track_id: string
  body: string
  timestamp_seconds: number
  created_at: string
}

// --- edit-reply ---
export interface EditReplyPayload {
  id: string
  body: string
}

export interface EditReplyResponse {
  id: string
  tidal_user_id: string
  parent_comment_id: string
  body: string
  created_at: string
}
