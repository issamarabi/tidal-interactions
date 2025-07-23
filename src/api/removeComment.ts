import { supabase } from '../supabaseClient'
import {
  RemoveCommentPayload,
  DeletionSuccessResponse
} from '../types'

export async function removeComment(payload: RemoveCommentPayload): Promise<{
  data: DeletionSuccessResponse | null
  error: Error | null
}> {
  const { data, error } = await supabase.functions.invoke<DeletionSuccessResponse>(
    'remove-comment',
    {
      body: payload,
      headers: { 'Content-Type': 'application/json' }
    }
  )
  return { data, error }
}
