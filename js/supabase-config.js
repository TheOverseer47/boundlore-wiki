const SUPABASE_URL = "https://ohkoojpzmptdfyowdgog.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJub24iLCJpYXQiOjE3ODMwNzE2NjgsImV4cCI6MjA5ODY0NzY2OH0.8vw7xj85Xy_nazYWW6zAE5uA2LPneWCPnxmfOY0kdKw";

window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
