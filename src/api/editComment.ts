import { supabase } from '../supabaseClient'
import { EditCommentPayload, EditCommentResponse } from '../types'

export async function editComment(payload: EditCommentPayload): Promise<{
  data: EditCommentResponse | null
  error: Error | null
}> {
  const { data, error } = await supabase.functions.invoke<EditCommentResponse>(
    'edit-comment',
    {
      body: payload,
      headers: { 'Content-Type': 'application/json' }
    }
  )
  return { data, error }
}
