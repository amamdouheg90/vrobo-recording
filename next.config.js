/** @type {import('next').NextConfig} */
const nextConfig = {
    /* config options here */
    output: 'standalone',
    serverExternalPackages: ['@google-cloud/storage'],
};

module.exports = nextConfig; 