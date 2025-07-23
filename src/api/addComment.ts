import { supabase } from '../supabaseClient'
import { AddCommentPayload, AddCommentResponse } from '../types'

export async function addComment(payload: AddCommentPayload): Promise<{
  data: AddCommentResponse | null
  error: Error | null
}> {
  const { data, error } = await supabase.functions.invoke<AddCommentResponse>(
    'add-comment',
    {
      body: payload,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  )

  return { data, error }
}
