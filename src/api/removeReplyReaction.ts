import { supabase } from '../supabaseClient'
import {
  RemoveReplyReactionPayload,
  RemoveReplyReactionResponse
} from '../types'

export async function removeReplyReaction(payload: RemoveReplyReactionPayload): Promise<{
  data: RemoveReplyReactionResponse | null
  error: Error | null
}> {
  const { data, error } = await supabase.functions.invoke<RemoveReplyReactionResponse>(
    'remove-reply-reaction',
    {
      body: payload,
      headers: { 'Content-Type': 'application/json' }
    }
  )
  return { data, error }
}
