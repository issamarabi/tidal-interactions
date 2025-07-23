# **tidal-interactions**
A dynamic social layer where users can post timestamped comments and reactions on any song.
Supports likes, threaded replies, emoji reactions, sorting by engagement, and real-time listening party mode.

# 🚀 Overview
tidal-interactions adds a real-time community conversation and reaction experience for music listeners.
Users can leave timestamped comments, react with emoji, and reply to each other on any song. Comments and threads can be sorted by engagement, recency, or reply count.
There is also an optional “live stream mode,” allowing comments to appear as the song progresses – for a shared listening party feel.

This project uses Supabase as the backend, including its powerful PostgreSQL database, Edge Functions, and Storage Buckets for user avatars.

# 🏗️ Tech Stack
Frontend: TypeScript (framework not specified)
Backend: Supabase (Postgres + Edge Functions)
Authentication: Supabase Auth (assumed, see Auth section)
Storage: Avatars managed using Supabase Storage buckets
📖 Database Schema
The core tables include:

# Table	Purpose
users	Stores each user's Tidal-style ID and avatar URL
comments	Timestamped comments per song, includes author and location in song
comment_replies	Threaded replies to comments
comment_reactions	Emoji reactions applied to comments
reply_reactions	Emoji reactions applied to replies
reactions	Song-global emoji reactions (not tied to any comment)
Precise SQL schema is included in /supabase/migrations, see the repo for details.

# ⚡️ Backend Functions
The backend is organized as Supabase Edge Functions, each providing a single-responsibility API endpoint. Most functions require an Authorization: Bearer header with a valid Supabase key (typically handled by Supabase Auth).

Key Endpoints
POST /comments-add-comment — Add a comment to a song at a timestamp
POST /comments-add-reply — Reply to a comment (threaded)
PATCH /edit-comment — Edit an existing comment
PATCH /edit-reply — Edit an existing reply
POST /comments-add-comment-reaction — Add a reaction (emoji) to a comment
POST /comments-add-reply-reaction — Add a reaction (emoji) to a reply
POST /comments-get-thread — Fetch all comments/replies/reactions for a song, with flexible sorting
POST /comments-remove-comment — Delete a comment
POST /comments-remove-reply — Delete a reply
POST /comments-remove-comment-reaction — Remove a comment reaction
POST /comments-get-song-reactions — Fetch song-global emoji reactions
POST /comments-add-song-reaction — Add a song-global emoji reaction
POST /comments-remove-song-reaction — Remove a song-global emoji reaction
See /supabase/functions for detailed endpoints, input/output contracts, and error codes.
Each function is accompanied by a Typescript wrapper for easy frontend calls.

# 🖼️ User Avatars
User avatars are public URLs stored in a Supabase Storage bucket.
Each users record contains a tidal_user_id and a corresponding avatar_url linking to their avatar image.

# 🔐 Authentication
Supabase Auth is assumed.
User sessions, login, and tokens are managed through Supabase.
Most API calls require a valid Supabase JWT (as an Authorization: Bearer header).
Details of email or external OAuth providers are TBD in this documentation.
User creation:
Users are included in the database (users table) with their avatar URL.
If your flow requires a registration or onboarding step, edit this README when finalized.
🎛️ Frontend Usage
Frontend is written in TypeScript.
Each edge function has a corresponding TypeScript wrapper for API calls.
Example usage will be provided in future updates (see /frontend and /supabase/functions folders).
Common client tasks:
Fetch thread/comments for a given song and timestamp
Post a comment or reply at a timestamp
React with emoji to a comment/reply/song
Remove or edit your comment/reaction
➕ Adding Data for Dev/Test
To populate test users with avatars:


# -- Example:
INSERT INTO public.users (tidal_user_id, avatar_url) VALUES
  ('tidal_ernie', 'https://your-bucket.supabase.co/.../ernie.png'),
  ('tidal_hs_elmo', 'https://your-bucket.supabase.co/.../elmo.png');
-- See README for more examples
📊 Sorting & "Live" Mode
All thread endpoints support sorting by:
Most engagement (reactions + replies)
Most reactions
Most replies
Latest
Earliest
(Set with "sort_by" in the request body.)
“Live” mode (planned/optional):
Fetch comments in real-time as a song is played, for synchronous group listening.
# 🧪 Testing
You can test endpoints with curl or Postman (Authorization: Bearer ... required).
Each function is self-documented for required input/output.
See migration and insert scripts for sample data.
# 📝 Contributing
Please open issues or pull requests if you encounter bugs, want to suggest an improvement, or add new features!
See CONTRIBUTING.md for details (if available).
All code should use Prettier formatting and TypeScript best practices.
# 📃 License
Choose a license: MIT, Apache, or similar. (Fill in before publishing.)

# 🙋 Frequently Asked Questions
How do I get started with development?

Clone this repository; set up a Supabase project; run all migrations in /supabase/migrations; deploy edge functions via the Supabase CLI.
How do users sign up/log in?

Currently, user onboarding is handled by Supabase Auth. Details on social logins or registration coming soon.
Do you support moderation/deletion?

Yes, delete endpoints exist for both comments, replies, and reactions. Add admin tools as required.
Does it work on mobile?

Depends on your frontend, which is not covered in this README.
# 📂 Directory Structure

tidal-interactions/
  supabase/
    migrations/             # DB schema and migrations (*.sql)
    functions/              # Edge functions (backend API)
      ...
    types/                  # TS types generated from DB
  frontend/                 # Your TypeScript frontend codebase
  README.md                 # This file
TODO / Next Steps
Public demo & screenshots
Usage examples for frontend
Finalize frontend API + authentication notes
Continually update as the codebase evolves!
