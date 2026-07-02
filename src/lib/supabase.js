import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL     = 'https://llzltyvpzjboynpinmqo.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxsemx0eXZwempib3lucGlubXFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5MTgwOTEsImV4cCI6MjA5NzQ5NDA5MX0.9IkzqrI9wVETSqZKt2cZsnhBJfIQA8qb5WsaMqyTdXc'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
