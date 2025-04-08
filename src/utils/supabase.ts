import { createClient } from '@supabase/supabase-js';

// Function to get environment variables at runtime
const getSupabaseCredentials = () => {
    // For server-side code, these will be available at runtime
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    // Log missing credentials in non-production
    if (process.env.NODE_ENV !== 'production') {
        if (!supabaseUrl) console.error('Missing NEXT_PUBLIC_SUPABASE_URL');
        if (!supabaseKey) console.error('Missing SUPABASE_SERVICE_KEY');
    }

    return {
        url: supabaseUrl || '',
        key: supabaseKey || '',
    };
};

// Create a wrapper function for the Supabase client
const createSupabaseClient = () => {
    const { url, key } = getSupabaseCredentials();

    // In runtime, this will use the actual credentials
    return createClient(url, key);
};

// Initialize the client (it will be reinitialized at runtime with actual credentials)
export const supabase = createSupabaseClient();

// Debug info that will only be logged in development
if (process.env.NODE_ENV === 'development') {
    console.log('Supabase initialization in development mode');
    const { url, key } = getSupabaseCredentials();
    console.log('URL available:', !!url);
    console.log('Key available:', !!key);
    console.log('URL starts with:', url.substring(0, 8));
    console.log('Key length:', key.length);
}

export interface MylerzBrand {
    id: number;
    created_at: string;
    merchant_name: string;
    merchant_id: string;
    record_url: string | null;
}

// Try alternative approaches to fetch data
export async function fetchMylerzBrands(): Promise<MylerzBrand[]> {
    try {
        console.log('Fetching from table: mylerzbrands');

        // Try lowercase table name first
        const { data: lowerData, error: lowerError } = await supabase
            .from('mylerzbrands')
            .select('*');

        if (lowerError) {
            console.error('Error with lowercase table name:', lowerError);
            return [];
        }

        console.log(`Found ${lowerData?.length || 0} brands`);
        return lowerData || [];
    } catch (error) {
        console.error('Error fetching brands:', error);
        return [];
    }
}

// Check if the table exists
export async function checkTableExists(): Promise<boolean> {
    try {
        // Try to list tables to see what's available
        const { error } = await supabase
            .from('mylerzbrands')
            .select('id')
            .limit(1);

        if (error) {
            console.error('Error checking table:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error checking table:', error);
        return false;
    }
}

export async function updateRecordUrl(merchant_id: string, record_url: string): Promise<boolean> {
    try {
        console.log('Starting record URL update for merchant:', merchant_id);

        // First, verify the merchant exists
        const { data: existingData, error: fetchError } = await supabase
            .from('mylerzbrands')
            .select('*')
            .eq('merchant_id', merchant_id)
            .maybeSingle();

        if (fetchError) {
            console.error('Error fetching merchant:', fetchError);
            return false;
        }

        if (!existingData) {
            console.error('No merchant found with ID:', merchant_id);
            return false;
        }

        // Perform the update
        const { error: updateError } = await supabase
            .from('mylerzbrands')
            .update({ record_url })
            .eq('merchant_id', merchant_id);

        if (updateError) {
            console.error('Error updating record:', updateError);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error updating record URL:', error);
        return false;
    }
} 