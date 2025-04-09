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
        console.log('Saving URL to Supabase:', record_url);

        // First, verify the merchant exists and log all matching records
        const { data: allRecords, error: listError } = await supabase
            .from('mylerzbrands')
            .select('*');

        if (listError) {
            console.error('Error fetching all records:', listError);
            return false;
        }

        console.log('All records in database:', allRecords);

        // Find matching record
        const matchingRecord = allRecords?.find(record => record.merchant_id === merchant_id);

        if (!matchingRecord) {
            console.error('No merchant found with ID:', merchant_id);
            console.log('Available merchant_ids:', allRecords?.map(r => r.merchant_id));
            return false;
        }

        console.log('Found matching record:', matchingRecord);

        // Try direct update first
        console.log('Attempting direct update...');
        const { data: directUpdate, error: directError } = await supabase
            .from('mylerzbrands')
            .update({ record_url })
            .eq('id', matchingRecord.id)
            .select();

        if (!directError && directUpdate && directUpdate.length > 0) {
            console.log('Direct update successful:', directUpdate);
            return true;
        }

        console.log('Direct update failed, trying RPC...');

        // If direct update fails, try RPC
        const { data: rpcData, error: rpcError } = await supabase
            .rpc('update_merchant_record_url', {
                p_merchant_id: merchant_id,
                p_record_url: record_url
            });

        if (rpcError) {
            console.error('RPC update error:', rpcError);
            return false;
        }

        console.log('RPC update response:', rpcData);

        // Verify the update
        const { data: verifyData, error: verifyError } = await supabase
            .from('mylerzbrands')
            .select('*')
            .eq('merchant_id', merchant_id)
            .single();

        if (verifyError) {
            console.error('Error verifying update:', verifyError);
            return false;
        }

        if (!verifyData) {
            console.error('Verification failed - record not found');
            return false;
        }

        const successful = verifyData.record_url === record_url;
        console.log('Update verification:', {
            expected: record_url,
            actual: verifyData.record_url,
            successful
        });

        return successful;
    } catch (error) {
        console.error('Error in updateRecordUrl:', error);
        return false;
    }
}

export async function testSupabaseConnection(): Promise<void> {
    try {
        console.log('=== Starting Supabase Connection Test ===');

        // 1. Check credentials
        const { url, key } = getSupabaseCredentials();
        console.log('Supabase URL available:', !!url);
        console.log('Supabase key available:', !!key);
        console.log('URL starts with:', url.substring(0, 10));
        console.log('Key starts with:', key.substring(0, 10));

        // 2. Test read operation
        console.log('\n=== Testing Read Operation ===');
        const { data: readData, error: readError } = await supabase
            .from('mylerzbrands')
            .select('*')
            .limit(1);

        if (readError) {
            console.error('Read operation failed:', readError);
        } else {
            console.log('Read operation successful. Found records:', readData?.length ?? 0);
            if (readData && readData.length > 0) {
                console.log('Sample record:', readData[0]);
            }
        }

        // 3. Test write operation
        if (readData && readData.length > 0) {
            console.log('\n=== Testing Write Operation ===');
            const testRecord = readData[0];
            const testUrl = `test_url_${Date.now()}`;

            console.log('Attempting to update record:', testRecord.id);
            console.log('Current record_url:', testRecord.record_url);
            console.log('Test URL to set:', testUrl);

            const { data: updateData, error: updateError } = await supabase
                .from('mylerzbrands')
                .update({ record_url: testUrl })
                .eq('id', testRecord.id)
                .select()
                .single();

            if (updateError) {
                console.error('Write operation failed:', updateError);
            } else {
                console.log('Write operation response:', updateData);
            }

            // 4. Verify the update
            console.log('\n=== Verifying Update ===');
            const { data: verifyData, error: verifyError } = await supabase
                .from('mylerzbrands')
                .select('record_url')
                .eq('id', testRecord.id)
                .single();

            if (verifyError) {
                console.error('Verification failed:', verifyError);
            } else {
                console.log('Verification result:', verifyData);
                console.log('Update successful:', verifyData.record_url === testUrl);
            }

            // 5. Restore original value
            console.log('\n=== Restoring Original Value ===');
            const { error: restoreError } = await supabase
                .from('mylerzbrands')
                .update({ record_url: testRecord.record_url })
                .eq('id', testRecord.id);

            if (restoreError) {
                console.error('Restore operation failed:', restoreError);
            } else {
                console.log('Original value restored successfully');
            }
        }

        console.log('\n=== Test Complete ===');
    } catch (error) {
        console.error('Test failed with error:', error);
    }
}

// Run the test in development
if (process.env.NODE_ENV === 'development') {
    console.log('Running Supabase connection test...');
    testSupabaseConnection().catch(console.error);
} 