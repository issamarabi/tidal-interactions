import { supabase } from '../supabaseClient'
import {
  AddCommentReactionPayload,
  AddCommentReactionResponse
} from '../types'

export async function addCommentReaction(payload: AddCommentReactionPayload): Promise<{
  data: AddCommentReactionResponse | null
  error: Error | null
}> {
  const { data, error } = await supabase.functions.invoke<AddCommentReactionResponse>(
    'add-comment-reaction',
    {
      body: payload,
      headers: { 'Content-Type': 'application/json' }
    }
  )
  return { data, error }
}
