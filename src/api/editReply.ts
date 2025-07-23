import { supabase } from '../supabaseClient'
import { EditReplyPayload, EditReplyResponse } from '../types'

export async function editReply(payload: EditReplyPayload): Promise<{
  data: EditReplyResponse | null
  error: Error | null
}> {
  const { data, error } = await supabase.functions.invoke<EditReplyResponse>(
    'edit-reply',
    {
      body: payload,
      headers: { 'Content-Type': 'application/json' }
    }
  )
  return { data, error }
}
