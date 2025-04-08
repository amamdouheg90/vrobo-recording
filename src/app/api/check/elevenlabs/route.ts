import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
    try {
        const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;

        if (!apiKey) {
            return NextResponse.json({
                success: false,
                message: 'Eleven Labs API key not configured'
            });
        }

        // Check if we can access the Eleven Labs API
        const response = await axios.get('https://api.elevenlabs.io/v1/voices', {
            headers: {
                'xi-api-key': apiKey
            }
        });

        if (response.status === 200) {
            return NextResponse.json({
                success: true,
                message: 'Eleven Labs connection successful'
            });
        } else {
            return NextResponse.json({
                success: false,
                message: `Unexpected status code: ${response.status}`
            });
        }
    } catch (error) {
        console.error('Eleven Labs check error:', error);
        let message = 'Unknown error connecting to Eleven Labs';

        if (axios.isAxiosError(error)) {
            message = error.response?.data?.message || error.message;
        } else if (error instanceof Error) {
            message = error.message;
        }

        return NextResponse.json({
            success: false,
            message
        });
    }
} 