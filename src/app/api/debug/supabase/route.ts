import { NextResponse } from 'next/server';
import { testSupabaseConnection } from '@/utils/supabase';

export async function GET() {
    try {
        // Log environment variables (without exposing full values)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

        console.log('Environment Check:');
        console.log('NEXT_PUBLIC_SUPABASE_URL available:', !!supabaseUrl);
        console.log('SUPABASE_SERVICE_KEY available:', !!supabaseKey);

        if (supabaseUrl) {
            console.log('URL starts with:', supabaseUrl.substring(0, 10));
        }
        if (supabaseKey) {
            console.log('Key length:', supabaseKey.length);
            console.log('Key starts with:', supabaseKey.substring(0, 10));
        }

        // Test the connection
        await testSupabaseConnection();

        return NextResponse.json({
            success: true,
            message: 'Check server logs for detailed connection information',
            env: {
                hasUrl: !!supabaseUrl,
                hasKey: !!supabaseKey,
                urlPrefix: supabaseUrl ? supabaseUrl.substring(0, 10) : null,
                keyLength: supabaseKey ? supabaseKey.length : 0
            }
        });
    } catch (error) {
        console.error('Debug endpoint error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
} 