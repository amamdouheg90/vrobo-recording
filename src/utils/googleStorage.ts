import { getGoogleCloudStorage } from './gcloud-auth';
import { Storage } from '@google-cloud/storage';

// Try to initialize Google Cloud Storage, but handle any failures
let storage: Storage | null = null;
try {
    storage = getGoogleCloudStorage();
    console.log('Successfully initialized Google Cloud Storage');
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
    console.log('Starting uploadFileToGCS...');
    console.log('Bucket name:', bucketName);
    console.log('Filename:', filename);
    console.log('Storage initialized:', !!storage);

    // During build time or if storage is not initialized, return a dummy URL
    if (!storage || !bucketName || (process.env.NODE_ENV === 'production' && !process.env.GOOGLE_CLOUD_BUCKET_NAME)) {
        console.log('Storage not initialized or bucket name missing, returning dummy URL');
        return `https://storage.googleapis.com/example-bucket/${filename}`;
    }

    try {
        // Try to get the bucket
        const bucket = storage.bucket(bucketName);
        console.log('Got bucket reference');

        // Use the provided filename and set up for overwriting existing files
        const blob = bucket.file(filename);
        console.log('Created blob reference');

        // Check if file exists before uploading (for logging purposes)
        const [exists] = await blob.exists();
        console.log('File exists check:', exists);

        // Upload the file with merchant information in metadata
        await blob.save(file, {
            contentType: 'audio/mpeg',
            metadata: {
                merchantName: merchantInfo.merchantName,
                merchantId: merchantInfo.merchantId,
                createdAt: new Date().toISOString(),
                replaced: exists ? 'true' : 'false'
            },
            resumable: false, // Disable resumable uploads for smaller files
        });
        console.log('File uploaded successfully');

        // Generate and return the public URL
        const publicUrl = `https://storage.googleapis.com/${bucketName}/${filename}`;
        console.log('Generated public URL for upload:', publicUrl);
        console.log('URL will be saved to Supabase for merchant ID:', merchantInfo.merchantId);
        return publicUrl;
    } catch (error) {
        console.error('Error uploading to Google Cloud Storage:', error);
        if (error instanceof Error) {
            console.error('Error details:', error.message);
            console.error('Error stack:', error.stack);
        }

        // In production, return a placeholder URL instead of failing
        if (process.env.NODE_ENV === 'production') {
            console.log('Returning placeholder URL due to upload error');
            return `https://storage.googleapis.com/${bucketName}/${filename}?error=upload_failed`;
        }
        throw error;
    }
} 