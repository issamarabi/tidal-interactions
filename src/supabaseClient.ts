import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hqfqeqrptwrnxqoifemu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZnFlcXJwdHdybnhxb2lmZW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMTE3NjcsImV4cCI6MjA2ODc4Nzc2N30.8g-z-cpdB90LYii6gvdE7Sb28xOnhEuuAd4A1dnkpg4' // Replace this!

export const supabase = createClient(supabaseUrl, supabaseKey)