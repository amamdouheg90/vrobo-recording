import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

export async function GET() {
    try {
        // Try a simple query to check if Supabase is connected
        const { data, error } = await supabase
            .from('mylerzbrands')
            .select('id')
            .limit(1);

        if (error) {
            return NextResponse.json({
                success: false,
                message: error.message,
                env: {
                    url_set: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
                    key_set: !!process.env.SUPABASE_SERVICE_KEY
                }
            });
        }

        return NextResponse.json({
            success: true,
            message: `Supabase connection successful. Found ${data?.length || 0} records.`,
            env: {
                url_set: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
                key_set: !!process.env.SUPABASE_SERVICE_KEY
            }
        });
    } catch (error) {
        console.error('Supabase check error:', error);
        return NextResponse.json({
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error connecting to Supabase',
            env: {
                url_set: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
                key_set: !!process.env.SUPABASE_SERVICE_KEY
            }
        });
    }
} 