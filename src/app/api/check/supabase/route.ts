import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

export async function GET() {
    try {
        // Collect environment variable information
        const envInfo = {
            supabase_url: {
                exists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
                length: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
                preview: process.env.NEXT_PUBLIC_SUPABASE_URL ?
                    process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 10) + '...' : 'not set'
            },
            supabase_key: {
                exists: !!process.env.SUPABASE_SERVICE_KEY,
                length: process.env.SUPABASE_SERVICE_KEY?.length || 0,
                preview: process.env.SUPABASE_SERVICE_KEY ?
                    process.env.SUPABASE_SERVICE_KEY.substring(0, 12) + '...' : 'not set'
            },
            node_env: process.env.NODE_ENV,
            vercel_env: process.env.VERCEL_ENV
        };

        console.log('Supabase check: Environment information', JSON.stringify(envInfo, null, 2));

        // Try a simple query to check if Supabase is connected
        const { data, error } = await supabase
            .from('mylerzbrands')
            .select('id')
            .limit(1);

        if (error) {
            console.error('Supabase query error:', error);
            return NextResponse.json({
                success: false,
                message: error.message,
                env: envInfo,
                error_details: {
                    code: error.code,
                    hint: error.hint,
                    details: error.details
                }
            });
        }

        // Check write permissions by attempting a no-op update
        console.log('Testing write permissions...');
        let writePermissions = false;
        let writeError = null;

        if (data && data.length > 0) {
            const testId = data[0].id;
            // Get current record
            const { data: currentRecord, error: fetchError } = await supabase
                .from('mylerzbrands')
                .select('record_url')
                .eq('id', testId)
                .single();

            if (fetchError) {
                console.error('Error fetching test record:', fetchError);
                writeError = fetchError;
            } else {
                // Try to update with same value (no-op)
                const currentUrl = currentRecord.record_url || null;
                const { error: updateError } = await supabase
                    .from('mylerzbrands')
                    .update({ record_url: currentUrl })
                    .eq('id', testId);

                if (updateError) {
                    console.error('Write permission test failed:', updateError);
                    writeError = updateError;
                } else {
                    writePermissions = true;
                    console.log('Write permissions test passed');
                }
            }
        } else {
            console.log('No records found to test write permissions');
        }

        return NextResponse.json({
            success: true,
            message: `Supabase connection successful. Found ${data?.length || 0} records. View your data at https://kpcusodyeijpmyikthzs.supabase.co/project/default/editor`,
            env: envInfo,
            write_permissions: {
                success: writePermissions,
                error: writeError ? {
                    message: writeError.message,
                    code: writeError.code,
                    details: writeError.details
                } : null
            }
        });
    } catch (error) {
        console.error('Supabase check error:', error);
        return NextResponse.json({
            success: false,
            message: `Connection error. Please check your database at https://kpcusodyeijpmyikthzs.supabase.co/project/default/editor. Error: ${error instanceof Error ? error.message : 'Unknown error connecting to Supabase'}`,
            env: {
                url_set: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
                key_set: !!process.env.SUPABASE_SERVICE_KEY
            },
            error_obj: error instanceof Error ? { name: error.name, stack: error.stack } : null
        });
    }
} 