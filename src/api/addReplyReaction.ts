import { supabase } from '../supabaseClient'
import {
  AddReplyReactionPayload,
  AddReplyReactionResponse
} from '../types'

export async function addReplyReaction(payload: AddReplyReactionPayload): Promise<{
  data: AddReplyReactionResponse | null
  error: Error | null
}> {
  const { data, error } = await supabase.functions.invoke<AddReplyReactionResponse>(
    'add-reply-reaction',
    {
      body: payload,
      headers: { 'Content-Type': 'application/json' }
    }
  )
  return { data, error }
}
