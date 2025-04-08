import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { uploadFileToGCS } from '@/utils/googleStorage';
import { updateRecordUrl } from '@/utils/supabase';

// Helper function to send process events via POST to the process-events endpoint
async function notifyProcessEvent(step: string, error?: string) {
    try {
        await fetch('/api/process-events', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ step, error }),
        });
    } catch (err) {
        console.error('Failed to send process event:', err);
    }
}

export async function POST(request: NextRequest) {
    try {
        // Parse form data
        const formData = await request.formData();
        const audioFile = formData.get('audio') as File;
        const brandId = formData.get('brandId') as string;

        if (!audioFile || !brandId) {
            return NextResponse.json({ error: 'Missing audio file or brandId' }, { status: 400 });
        }

        console.log('Received audio file:', {
            name: audioFile.name,
            type: audioFile.type,
            size: audioFile.size
        });

        // Fetch brand data
        try {
            // Process the audio file (convert to arrayBuffer)
            console.log('Processing audio file...');
            await notifyProcessEvent('processing');

            const audioBuffer = await audioFile.arrayBuffer();

            // Send the audio to Eleven Labs
            console.log('Sending to Eleven Labs API...');
            await notifyProcessEvent('elevenlabs');

            const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
            if (!apiKey) {
                const errorMsg = 'Eleven Labs API key not found';
                console.error(errorMsg);
                await notifyProcessEvent('error', errorMsg);
                return NextResponse.json({ error: errorMsg }, { status: 500 });
            }

            // Create a proper File object with WAV type
            const audioBlob = new Blob([audioBuffer], { type: audioFile.type });

            // Prepare form data for the API call
            const elevenlabsData = new FormData();
            elevenlabsData.append('audio', audioBlob);
            elevenlabsData.append('output_format', 'mp3_44100_128');

            // Call the Eleven Labs API
            const response = await axios.post(
                'https://api.elevenlabs.io/v1/speech-to-speech/ThT5KcBeYPX3keUQqHPh',
                elevenlabsData,
                {
                    headers: {
                        'xi-api-key': apiKey,
                    },
                    responseType: 'arraybuffer',
                }
            ).catch(error => {
                let errorMessage = 'Unknown error';

                if (axios.isAxiosError(error) && error.response) {
                    // Try to extract detailed error from response
                    if (error.response.data) {
                        try {
                            // Convert arraybuffer to string if needed
                            if (error.response.data instanceof ArrayBuffer) {
                                const decoder = new TextDecoder();
                                const dataString = decoder.decode(error.response.data);
                                const parsedError = JSON.parse(dataString);
                                errorMessage = parsedError.detail?.message || parsedError.message || String(parsedError);
                            } else {
                                errorMessage = error.response.data.detail?.message || error.response.data.message || String(error.response.data);
                            }
                        } catch {
                            errorMessage = `Status ${error.response.status}: ${error.response.statusText}`;
                        }
                    } else {
                        errorMessage = `Status ${error.response.status}: ${error.response.statusText}`;
                    }
                } else if (error instanceof Error) {
                    errorMessage = error.message;
                }

                console.error('Eleven Labs API Error:', errorMessage);
                notifyProcessEvent('error', `Eleven Labs error: ${errorMessage}`);
                throw new Error(`Failed to process with Eleven Labs: ${errorMessage}`);
            });

            console.log('Eleven Labs API response received:', {
                status: response.status,
                statusText: response.statusText,
                dataType: response.data ? typeof response.data : 'undefined'
            });

            // Convert the response to a Buffer
            const responseBuffer = Buffer.from(response.data);

            // Get the brand data from the database
            console.log('Getting brand data...');
            const response2 = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/mylerzbrands?id=eq.${brandId}`, {
                headers: {
                    'apikey': process.env.SUPABASE_SERVICE_KEY || '',
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                }
            });

            if (!response2.ok) {
                const errorMsg = `Failed to fetch brand data: ${response2.statusText}`;
                console.error(errorMsg);
                await notifyProcessEvent('error', errorMsg);
                return NextResponse.json({ error: errorMsg }, { status: 500 });
            }

            const brandData = (await response2.json())[0];

            if (!brandData) {
                const errorMsg = `Brand with ID ${brandId} not found`;
                console.error(errorMsg);
                await notifyProcessEvent('error', errorMsg);
                return NextResponse.json({ error: errorMsg }, { status: 404 });
            }

            // Save response to Google Cloud Storage
            console.log('Uploading to Google Cloud Storage...');
            await notifyProcessEvent('uploading');

            const filename = `mylerzbrand/${brandData.merchant_name} _${brandData.merchant_id}.mp3`;
            console.log('Uploading to Google Cloud Storage with filename:', filename);
            console.log('Merchant name:', brandData.merchant_name);
            console.log('Merchant ID:', brandData.merchant_id);

            const uploadResponse = await uploadFileToGCS(responseBuffer, filename, {
                merchantName: brandData.merchant_name,
                merchantId: brandData.merchant_id
            });
            console.log('Storage upload response:', uploadResponse);

            // Update the record URL in Supabase using merchant_id
            const publicUrl = `https://storage.googleapis.com/${process.env.GOOGLE_CLOUD_BUCKET_NAME}/${filename}`;
            console.log('Generated public URL:', publicUrl);

            console.log('Updating database record...');
            await notifyProcessEvent('updating_db');

            let updateSuccess = false;
            try {
                updateSuccess = await updateRecordUrl(brandData.merchant_id, publicUrl);
                console.log('Successfully updated record URL in database:', updateSuccess);
            } catch (error) {
                console.error('Error updating record URL:', error);
                await notifyProcessEvent('error', 'Database update failed, but file was uploaded successfully');
            }

            // Send completion event
            await notifyProcessEvent('completed');

            // Return success even if database update failed
            return NextResponse.json({
                success: true,
                url: publicUrl,
                dbUpdateSuccess: updateSuccess
            });
        } catch (error) {
            console.error('Error in voice clone process:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            await notifyProcessEvent('error', errorMessage);
            return NextResponse.json({ error: `Failed to process voice cloning: ${errorMessage}` }, { status: 500 });
        }
    } catch (error) {
        console.error('Error processing request:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        await notifyProcessEvent('error', errorMessage);
        return NextResponse.json({ error: `Failed to process request: ${errorMessage}` }, { status: 500 });
    }
} 