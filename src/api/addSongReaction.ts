import { supabase } from '../supabaseClient'
import {
  AddSongReactionPayload,
  AddSongReactionResponse
} from '../types'

export async function addSongReaction(payload: AddSongReactionPayload): Promise<{
  data: AddSongReactionResponse | null
  error: Error | null
}> {
  const { data, error } = await supabase.functions.invoke<AddSongReactionResponse>(
    'add-song-reaction',
    {
      body: payload,
      headers: { 'Content-Type': 'application/json' }
    }
  )
  return { data, error }
}
