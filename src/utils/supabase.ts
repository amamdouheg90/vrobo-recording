import { createClient } from '@supabase/supabase-js';

// Create a minimal Supabase client for build-time usage
export const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co',
    process.env.SUPABASE_SERVICE_KEY || 'dummy-key-for-build-time'
);

// Log info only in development
if (process.env.NODE_ENV === 'development') {
    console.log('Supabase URL available:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Supabase key available:', !!process.env.SUPABASE_SERVICE_KEY);

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        console.error('Missing Supabase URL. Make sure NEXT_PUBLIC_SUPABASE_URL is set in .env.local');
    }

    if (!process.env.SUPABASE_SERVICE_KEY) {
        console.error('Missing Supabase service key. Make sure SUPABASE_SERVICE_KEY is set in .env.local');
    }
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