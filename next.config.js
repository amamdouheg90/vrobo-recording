/** @type {import('next').NextConfig} */
const nextConfig = {
    // Standalone output for better Vercel deployment
    output: 'standalone',
    // Properly handle the @google-cloud/storage package
    experimental: {
        serverExternalPackages: ['@google-cloud/storage']
    },
    // Allow environment variables to be accessed in the build
    env: {
        GOOGLE_CLOUD_PROJECT_ID: process.env.GOOGLE_CLOUD_PROJECT_ID,
        GOOGLE_CLOUD_BUCKET_NAME: process.env.GOOGLE_CLOUD_BUCKET_NAME
    }
};

module.exports = nextConfig; 