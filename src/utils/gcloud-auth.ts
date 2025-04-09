import { Storage } from '@google-cloud/storage';

// This function helps with Google Cloud authentication in different environments
export function getGoogleCloudStorage(): Storage {
    console.log('Initializing Google Cloud Storage...');
    console.log('Project ID:', process.env.GOOGLE_CLOUD_PROJECT_ID);
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Vercel Environment:', process.env.VERCEL_ENV);
    console.log('Has Credentials JSON:', !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);

    // If GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable is set (Vercel deployment)
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        try {
            // Clean the JSON string before parsing
            let credentialsStr = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
            console.log('Raw credentials length:', credentialsStr.length);

            // Remove any surrounding quotes that might have been added by Vercel
            if (credentialsStr.startsWith('"') && credentialsStr.endsWith('"')) {
                credentialsStr = credentialsStr.slice(1, -1);
                console.log('Removed surrounding quotes');
            }

            // Parse the JSON string directly
            const credentials = JSON.parse(credentialsStr);
            console.log('Successfully parsed credentials JSON');
            console.log('Credentials type:', credentials.type);
            console.log('Project ID from credentials:', credentials.project_id);

            // Create storage with explicit credentials
            return new Storage({
                projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
                credentials: {
                    client_email: credentials.client_email,
                    private_key: credentials.private_key,
                    project_id: credentials.project_id,
                }
            });
        } catch (error) {
            console.error('Error initializing Google Cloud Storage:', error);
            if (error instanceof Error) {
                console.error('Error details:', error.message);
                console.error('Error stack:', error.stack);
            }

            // During build time or if credentials fail, return a dummy client
            if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production') {
                console.warn('Using default configuration in production due to credential error');
                return new Storage({
                    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
                });
            }

            throw new Error(`Failed to initialize Google Cloud Storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // If no credentials in env var, try default credentials
    console.log('No credentials in environment variable, using default authentication');
    return new Storage({
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    });
} 