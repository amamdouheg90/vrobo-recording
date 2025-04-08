import { getGoogleCloudStorage } from './gcloud-auth';
import { Storage } from '@google-cloud/storage';

// Try to initialize Google Cloud Storage, but handle any failures
let storage: Storage | null = null;
try {
    storage = getGoogleCloudStorage();
} catch (error) {
    console.error('Failed to initialize Google Cloud Storage:', error);
    // We'll handle this in the uploadFileToGCS function
}

const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME || '';

interface MerchantInfo {
    merchantName: string;
    merchantId: string;
}

export async function uploadFileToGCS(file: Buffer, filename: string, merchantInfo: MerchantInfo): Promise<string> {
    // During build time, return a dummy URL to avoid failures
    if (!storage || (process.env.NODE_ENV === 'production' && !process.env.GOOGLE_CLOUD_BUCKET_NAME)) {
        console.log('Storage not initialized or bucket name missing, returning dummy URL');
        return `https://storage.googleapis.com/example-bucket/${filename}`;
    }

    try {
        const bucket = storage.bucket(bucketName);
        console.log(`Starting upload to GCS bucket: ${bucketName} with filename: ${filename}`);

        // Use the provided filename and set up for overwriting existing files
        const blob = bucket.file(filename);

        // Check if file exists before uploading (for logging purposes)
        const [exists] = await blob.exists();
        if (exists) {
            console.log(`File ${filename} already exists and will be replaced`);
        }

        // Upload the file with merchant information in metadata
        // This will overwrite the existing file if it exists
        await blob.save(file, {
            contentType: 'audio/mpeg', // Set proper content type for MP3 files
            metadata: {
                merchantName: merchantInfo.merchantName,
                merchantId: merchantInfo.merchantId,
                createdAt: new Date().toISOString(),
                replaced: exists ? 'true' : 'false'
            },
            resumable: false, // Disable resumable uploads for smaller files
        });

        // Generate and return the public URL without timestamp query parameter
        const publicUrl = `https://storage.googleapis.com/${bucketName}/${filename}`;
        console.log('Generated GCS public URL:', publicUrl);
        return publicUrl;
    } catch (error) {
        console.error('Error uploading to Google Cloud Storage:', error);
        // In production, return a placeholder URL instead of failing
        if (process.env.NODE_ENV === 'production') {
            console.log('Returning placeholder URL due to upload error');
            return `https://storage.googleapis.com/${bucketName}/${filename}?error=upload_failed`;
        }
        throw error;
    }
} 