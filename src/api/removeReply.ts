import { supabase } from '../supabaseClient'
import {
  RemoveReplyPayload,
  DeletionSuccessResponse
} from '../types'

export async function removeReply(payload: RemoveReplyPayload): Promise<{
  data: DeletionSuccessResponse | null
  error: Error | null
}> {
  const { data, error } = await supabase.functions.invoke<DeletionSuccessResponse>(
    'remove-reply',
    {
      body: payload,
      headers: { 'Content-Type': 'application/json' }
    }
  )
  return { data, error }
}
