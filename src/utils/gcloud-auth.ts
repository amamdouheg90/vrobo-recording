import { Storage } from '@google-cloud/storage';

// This function helps with Google Cloud authentication in different environments
export function getGoogleCloudStorage(): Storage {
    // If GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable is set (Vercel deployment)
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        try {
            // Clean the JSON string before parsing
            let credentialsStr = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

            // Remove any surrounding quotes that might have been added by Vercel
            if (credentialsStr.startsWith('"') && credentialsStr.endsWith('"')) {
                credentialsStr = credentialsStr.slice(1, -1);
            }

            // Replace escaped quotes with regular quotes
            credentialsStr = credentialsStr.replace(/\\"/g, '"');

            // Handle potential line breaks in the JSON
            credentialsStr = credentialsStr.replace(/\\n/g, '');

            const credentials = JSON.parse(credentialsStr);

            return new Storage({
                projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
                credentials
            });
        } catch (error) {
            console.error('Error parsing Google credentials JSON:', error);
            console.error('Credential string format issue, using default authentication');

            // During build time, return a dummy storage client to avoid build failures
            if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production') {
                return new Storage({
                    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'dummy-project'
                });
            }

            throw new Error('Invalid Google Cloud credentials configuration');
        }
    }

    // Default to Application Default Credentials (ADC) for local development
    return new Storage();
} 