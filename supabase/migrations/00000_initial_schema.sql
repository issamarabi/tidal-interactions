-- 00000_initial_schema.sql
-- Migration: create all tables, keep comments & replies when their author is deleted,
-- and preserve replies when their parent comment is deleted

BEGIN;

-- 1) Users
CREATE TABLE IF NOT EXISTS public.users (
  tidal_user_id TEXT PRIMARY KEY,
  avatar_url    TEXT
);

-- 2) Top‐level comments; orphan on user delete
CREATE TABLE IF NOT EXISTS public.comments (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  tidal_user_id     TEXT    REFERENCES public.users(tidal_user_id) ON DELETE SET NULL,
  track_id          TEXT    NOT NULL,
  body              TEXT    NOT NULL,
  timestamp_seconds INTEGER NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- 3) Replies to comments; orphan on user delete, nullify parent on comment delete
CREATE TABLE IF NOT EXISTS public.comment_replies (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  tidal_user_id     TEXT    REFERENCES public.users(tidal_user_id) ON DELETE SET NULL,
  parent_comment_id UUID    REFERENCES public.comments(id)      ON DELETE SET NULL,
  body              TEXT    NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- 4) Song‐level reactions; orphan on user delete
CREATE TABLE IF NOT EXISTS public.reactions (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  tidal_user_id     TEXT    REFERENCES public.users(tidal_user_id) ON DELETE SET NULL,
  track_id          TEXT    NOT NULL,
  emoji             TEXT    NOT NULL,
  timestamp_seconds INTEGER NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- 5) Reactions on comments; cascade when comment deleted, orphan on user delete
CREATE TABLE IF NOT EXISTS public.comment_reactions (
  tidal_user_id TEXT NOT NULL REFERENCES public.users(tidal_user_id) ON DELETE SET NULL,
  comment_id    UUID    NOT NULL REFERENCES public.comments(id)    ON DELETE CASCADE,
  emoji         TEXT    NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (tidal_user_id, comment_id, emoji)
);

-- 6) Reactions on replies; cascade when reply deleted, orphan on user delete
CREATE TABLE IF NOT EXISTS public.reply_reactions (
  tidal_user_id TEXT NOT NULL REFERENCES public.users(tidal_user_id) ON DELETE SET NULL,
  comment_id    UUID    NOT NULL REFERENCES public.comment_replies(id) ON DELETE CASCADE,
  emoji         TEXT    NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (tidal_user_id, comment_id, emoji)
);

COMMIT;
