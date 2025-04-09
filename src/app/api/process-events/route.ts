import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Store connected clients with their last event time
const processEventClients = new Map<string, { writer: WritableStreamDefaultWriter<Uint8Array>, lastEventTime: number }>();

// Cleanup interval (5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;
// Connection timeout (2 minutes)
const CONNECTION_TIMEOUT = 2 * 60 * 1000;

// Cleanup old connections
setInterval(() => {
    const now = Date.now();
    for (const [clientId, client] of processEventClients.entries()) {
        if (now - client.lastEventTime > CONNECTION_TIMEOUT) {
            console.log(`Cleaning up stale connection: ${clientId}`);
            client.writer.close().catch(console.error);
            processEventClients.delete(clientId);
        }
    }
}, CLEANUP_INTERVAL);

// Helper function to send events to specific clients or all clients
// Not exported since Next.js only allows specific exports for route handlers
async function sendProcessEvent(clientId: string | null, step: string, error?: string) {
    if (!processEventClients.size) return;

    const encoder = new TextEncoder();
    const message = JSON.stringify({ step, error, timestamp: Date.now() });

    try {
        if (clientId && processEventClients.has(clientId)) {
            // Send to a specific client
            const client = processEventClients.get(clientId)!;
            await client.writer.write(encoder.encode(`data: ${message}\n\n`));
            client.lastEventTime = Date.now();
        } else {
            // Send to all clients
            const sendPromises = Array.from(processEventClients.entries()).map(async ([id, client]) => {
                try {
                    await client.writer.write(encoder.encode(`data: ${message}\n\n`));
                    client.lastEventTime = Date.now();
                } catch (err) {
                    console.error(`Error sending to client ${id}:`, err);
                    // Clean up failed connection
                    client.writer.close().catch(console.error);
                    processEventClients.delete(id);
                }
            });
            await Promise.all(sendPromises);
        }
    } catch (err) {
        console.error('Error sending process event:', err);
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
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no', // Disable buffering for nginx
        },
    });

    // Store the client's connection
    const clientId = crypto.randomUUID();
    processEventClients.set(clientId, {
        writer,
        lastEventTime: Date.now()
    });

    console.log(`New client connected: ${clientId}`);

    // Remove the client when they disconnect
    request.signal.addEventListener('abort', () => {
        console.log(`Client disconnected: ${clientId}`);
        const client = processEventClients.get(clientId);
        if (client) {
            client.writer.close().catch(console.error);
            processEventClients.delete(clientId);
        }
    });

    // Send initial connection event and heartbeat
    await writer.write(encoder.encode(`data: ${JSON.stringify({ connected: true, clientId, timestamp: Date.now() })}\n\n`));

    // Send heartbeat every 30 seconds
    const heartbeatInterval = setInterval(async () => {
        try {
            const client = processEventClients.get(clientId);
            if (client) {
                await client.writer.write(encoder.encode(`data: ${JSON.stringify({ heartbeat: true, timestamp: Date.now() })}\n\n`));
                client.lastEventTime = Date.now();
            }
        } catch (err) {
            console.error(`Heartbeat failed for client ${clientId}:`, err);
            clearInterval(heartbeatInterval);
        }
    }, 30000);

    // Clean up heartbeat on disconnect
    request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
    });

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