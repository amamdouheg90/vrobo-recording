# Vrobo Recording - Voice Cloning App

A Next.js application that allows users to select a brand from a Supabase database, record their voice, process it with Elevenlabs voice cloning, and save the results to Google Cloud Storage.

## Features

- Fetch and display brands from a Supabase database
- Record voice using browser's MediaRecorder API
- Process recordings with Elevenlabs speech-to-speech API
- Store processed audio files in Google Cloud Storage
- Update Supabase records with public URLs

## Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Elevenlabs API key
- Google Cloud Storage bucket and credentials

## Setup

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Set up environment variables:

Create a `.env.local` file in the root directory with the following variables:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-supabase-service-key

# Elevenlabs
NEXT_PUBLIC_ELEVENLABS_API_KEY=your-elevenlabs-api-key

# Google Cloud Storage
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_BUCKET_NAME=your-bucket-name
```

3. Set up Google Cloud credentials:

Follow the [Google Cloud Authentication guide](https://cloud.google.com/docs/authentication/getting-started) to set up application credentials.

4. Create the Supabase table:

Create a table named `mylerzbrands` with the following structure:
- `id` (primary key, integer)
- `merchant_name` (text)
- `merchant_id` (text)
- `record_url` (text, nullable)

5. Run the development server:

```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser to use the application.

## Usage

1. Select a brand from the dropdown menu
2. Click "Start Recording" to begin recording your voice
3. Click "Stop Recording" when you're finished
4. Wait for the voice cloning process to complete
5. The processed audio will be saved to Google Cloud Storage, and the URL will be updated in Supabase
6. You can listen to the processed audio on the page

## Technologies Used

- Next.js 14
- TypeScript
- Tailwind CSS
- Supabase
- Elevenlabs API
- Google Cloud Storage
- MediaRecorder API

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
