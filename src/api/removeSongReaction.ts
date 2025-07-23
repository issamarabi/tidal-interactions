import { supabase } from '../supabaseClient'
import {
  RemoveSongReactionPayload,
  DeletionSuccessResponse
} from '../types'

export async function removeSongReaction(payload: RemoveSongReactionPayload): Promise<{
  data: DeletionSuccessResponse | null
  error: Error | null
}> {
  const { data, error } = await supabase.functions.invoke<DeletionSuccessResponse>(
    'remove-song-reaction',
    {
      body: payload,
      headers: { 'Content-Type': 'application/json' }
    }
  )
  return { data, error }
}
