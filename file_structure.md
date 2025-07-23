tidal-comments-backend/
├── supabase/
│   ├── migrations/                    # Database structure and changes
│   │   ├── 00000_auth.sql            # User authentication tables
│   │   ├── 00001_comments.sql        # Comments and reactions tables
│   │   └── 00002_tidal_tracks.sql    # Tidal track info cache tables
│   │
│   ├── functions/                     # Supabase Edge Functions
│   │   ├── tidal-api/                # Tidal API Integration
│   │   │   ├── get-track-info.ts     # Get track metadata from Tidal
│   │   │   └── get-playback-url.ts   # Get streaming URL from Tidal
│   │   │
│   │   ├── comments/                 # Comment System Functions
            ├── get.ts  
                ├── get-best-comments-users.ts    # Get a list of some user id who made comments for a track
                ├── _get-best-comments.ts   # Sort the best comments for a track
                ├── get-thread.ts         # Get comment thread/replies and reaction, given a user id, 
            ├── add.ts  
                ├── add-comment.ts        # Add new comment, given a user id, track id, timestamp
                ├── add-reply.ts        # Add new reply, given a user id, track id, timestamp, parent comment
                ├── add-song-reaction.ts       # Add new reaction to a song, given a user id, track id, timestamp
                ├── add-comment-reaction.ts    # Add new reaction to a comment, given a user id, track id, timestamp 
            ├── remove.ts  
                ├── remove-reply
                ├── remove-song-reaction
                ├── remove-comment.ts 
                ├── remove-comment-reaction.ts 
                
            └──       
│   │   │
│   │   └── auth/                     # Authentication Functions
│   │       ├── tidal-oauth.ts        # Handle Tidal OAuth
│   │       └── user-profile.ts       # User profile management
│   │
│   ├── policies/                     # Database Access Control
│   │   ├── comments_policy.sql       # Who can read/write comments
│   │   └── users_policy.sql         # Who can access user data
│   │
│   └── types/                       # TypeScript Definitions
│       └── database.types.ts        # Generated database types
│
├── config/                          # Configuration Files
│   ├── supabase.ts                 # Supabase connection config, such as URL
│   └── tidal.ts                    # Tidal API config
│
└── scripts/                        # Deployment & Maintenance
    ├── deploy-migrations.sh        # Database migration script
    └── deploy-functions.sh         # Edge functions deployment
