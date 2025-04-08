import { NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';

export async function GET() {
    try {
        const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
        const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME;

        if (!projectId || !bucketName) {
            return NextResponse.json({
                success: false,
                message: 'Google Cloud configuration missing (project ID or bucket name)'
            });
        }

        // Initialize Google Cloud Storage
        const storage = new Storage();

        // Check if the bucket exists
        const [exists] = await storage.bucket(bucketName).exists();

        if (exists) {
            return NextResponse.json({
                success: true,
                message: 'Google Cloud Storage connection successful'
            });
        } else {
            return NextResponse.json({
                success: false,
                message: `Bucket "${bucketName}" not found`
            });
        }
    } catch (error) {
        console.error('Google Cloud check error:', error);
        return NextResponse.json({
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error connecting to Google Cloud'
        });
    }
} 