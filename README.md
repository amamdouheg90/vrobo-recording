# Vrobo Recording

A Next.js application for recording and managing voice recordings with Eleven Labs integration.

## Features

- Voice recording with silence removal
- Integration with Eleven Labs for voice cloning
- Brand management and recording organization
- Mobile-optimized recording interface
- Automatic silence detection and removal
- Preview and playback functionality

## Tech Stack

- Next.js 13+ with App Router
- TypeScript
- Tailwind CSS
- Web Audio API
- MediaRecorder API
- Supabase for data storage

## Getting Started

1. Clone the repository:
```bash
git clone [repository-url]
cd vrobo-recording
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file with the following variables:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Development

- The application uses the Web Audio API for recording and processing audio
- Silence detection and removal is handled client-side
- Recordings are processed through Eleven Labs before being stored
- The UI is optimized for both desktop and mobile use

## License

MIT
