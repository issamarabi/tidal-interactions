import { supabase } from '../supabaseClient'
import { GetThreadPayload, GetThreadResponse } from '../types'

export async function getThread(payload: GetThreadPayload): Promise<{
  data: GetThreadResponse | null
  error: Error | null
}> {
  const { data, error } = await supabase.functions.invoke<GetThreadResponse>(
    'get-thread',
    {
      body: payload,
      headers: { 'Content-Type': 'application/json' }
    }
  )
  return { data, error }
}
