import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Store connected clients
const processEventClients = new Map();

// Helper function to send events to specific clients or all clients
// Not exported since Next.js only allows specific exports for route handlers
async function sendProcessEvent(clientId: string | null, step: string, error?: string) {
    if (!processEventClients.size) return;

    const encoder = new TextEncoder();
    const message = JSON.stringify({ step, error });

    if (clientId && processEventClients.has(clientId)) {
        // Send to a specific client
        const writer = processEventClients.get(clientId);
        await writer.write(encoder.encode(`data: ${message}\n\n`));
    } else {
        // Send to all clients
        for (const writer of processEventClients.values()) {
            await writer.write(encoder.encode(`data: ${message}\n\n`));
        }
    }
}

export async function GET(request: NextRequest) {
    const responseStream = new TransformStream();
    const writer = responseStream.writable.getWriter();
    const encoder = new TextEncoder();

    // Set up headers for Server-Sent Events
    const response = new NextResponse(responseStream.readable, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });

    // Store the client's connection
    const clientId = crypto.randomUUID();
    processEventClients.set(clientId, writer);

    // Remove the client when they disconnect
    request.signal.addEventListener('abort', () => {
        processEventClients.delete(clientId);
    });

    // Send an initial event
    await writer.write(encoder.encode(`data: ${JSON.stringify({ connected: true, clientId })}\n\n`));

    return response;
}

// This POST handler allows other routes to send events to clients
export async function POST(request: NextRequest) {
    try {
        const data = await request.json();
        const { step, error, clientId = null } = data;

        if (!step) {
            return NextResponse.json({ error: 'Missing required field: step' }, { status: 400 });
        }

        await sendProcessEvent(clientId, step, error);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error processing event:', error);
        return NextResponse.json({ error: 'Failed to process event' }, { status: 500 });
    }
} 