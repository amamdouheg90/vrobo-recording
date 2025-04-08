import { NextResponse } from 'next/server';
import { fetchMylerzBrands } from '@/utils/supabase';

export async function GET() {
    try {
        // Fetch brands from Supabase (this uses the server-side client)
        const brands = await fetchMylerzBrands();

        return NextResponse.json({
            success: true,
            brands
        });
    } catch (error) {
        console.error('Error fetching brands:', error);
        return NextResponse.json({
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error fetching brands'
        }, { status: 500 });
    }
} 