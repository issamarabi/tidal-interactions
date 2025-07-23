import { supabase } from '../supabaseClient'
import { GetSongReactionsPayload, SongReaction } from '../types'

export async function getSongReactions(payload: GetSongReactionsPayload): Promise<{
  data: SongReaction[] | null
  error: Error | null
}> {
  const { data, error } = await supabase.functions.invoke<SongReaction[]>(
    'get-song-reactions',
    {
      body: payload,
      headers: { 'Content-Type': 'application/json' }
    }
  )
  return { data, error }
}
