import { supabase } from '../supabaseClient'
import {
  RemoveCommentReactionPayload,
  RemoveCommentReactionResponse
} from '../types'

export async function removeCommentReaction(payload: RemoveCommentReactionPayload): Promise<{
  data: RemoveCommentReactionResponse | null
  error: Error | null
}> {
  const { data, error } = await supabase.functions.invoke<RemoveCommentReactionResponse>(
    'remove-comment-reaction',
    {
      body: payload,
      headers: { 'Content-Type': 'application/json' }
    }
  )
  return { data, error }
}
