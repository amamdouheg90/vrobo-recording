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

            // First unescape any escaped quotes within the JSON content
            credentialsStr = credentialsStr.replace(/\\"/g, '"');

            // Handle escaped newlines properly - keep them as actual newlines
            credentialsStr = credentialsStr.replace(/\\n/g, '\n');

            // Handle any double-escaped characters that might have been introduced by environment variable handling
            credentialsStr = credentialsStr.replace(/\\\\/g, '\\');

            // Parse the cleaned JSON string
            const credentials = JSON.parse(credentialsStr);

            return new Storage({
                projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
                credentials
            });
        } catch (error) {
            if (error instanceof Error) {
                console.error('Error parsing Google credentials JSON:', error);
                console.error('Raw credentials string:', process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
                console.error('Credential string format issue, using default authentication');

                // During build time, return a dummy storage client to avoid build failures
                if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production') {
                    return new Storage({
                        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'dummy-project'
                    });
                }

                throw new Error(`Invalid Google Cloud credentials configuration: ${error.message}`);
            }
            throw error; // Re-throw if it's not an Error instance
        }
    }

    // Default to Application Default Credentials (ADC) for local development
    return new Storage();
} 