import { getGoogleCloudStorage } from './gcloud-auth';

// Initialize Google Cloud Storage with proper authentication
const storage = getGoogleCloudStorage();

const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME || '';

interface MerchantInfo {
    merchantName: string;
    merchantId: string;
}

export async function uploadFileToGCS(file: Buffer, filename: string, merchantInfo: MerchantInfo): Promise<string> {
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
        throw error;
    }
} 