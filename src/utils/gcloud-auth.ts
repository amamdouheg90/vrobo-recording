import { Storage } from '@google-cloud/storage';

// This function helps with Google Cloud authentication in different environments
export function getGoogleCloudStorage(): Storage {
    // If GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable is set (Vercel deployment)
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        try {
            const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
            return new Storage({
                projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
                credentials
            });
        } catch (error) {
            console.error('Error parsing Google credentials JSON:', error);
            throw new Error('Invalid Google Cloud credentials configuration');
        }
    }

    // Default to Application Default Credentials (ADC) for local development
    return new Storage();
} 