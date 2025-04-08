'use client';

import { createClient } from '@supabase/supabase-js';

// This client is safe to use in the browser
// It doesn't require the service key which should never be exposed client-side
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

// Initialize with an empty key for the browser 
// In a real app, you would use Auth.js or similar for authentication
export const supabaseClient = createClient(supabaseUrl, '');

// Alternatively, you can handle authentication and permissions through your API
// and only use the client for reading public data 