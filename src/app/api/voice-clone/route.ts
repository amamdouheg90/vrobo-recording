import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { uploadFileToGCS } from '@/utils/googleStorage';
import { updateRecordUrl } from '@/utils/supabase';
import { supabase } from '@/utils/supabase';

// Helper function to send process events via POST to the process-events endpoint
async function notifyProcessEvent(step: string, error?: string) {
    try {
        const baseUrl = process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : 'http://localhost:3000';

        await fetch(`${baseUrl}/api/process-events`, {
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
            elevenlabsData.append('model_id', 'eleven_multilingual_sts_v2');

            console.log('Sending to ElevenLabs with data:', {
                audioSize: audioBlob.size,
                audioType: audioBlob.type,
                model: 'eleven_multilingual_sts_v2'
            });

            // Call the Eleven Labs API
            const response = await axios.post(
                'https://api.elevenlabs.io/v1/speech-to-speech/ThT5KcBeYPX3keUQqHPh',
                elevenlabsData,
                {
                    headers: {
                        'xi-api-key': apiKey,
                        'Accept': 'audio/mpeg',
                        'Content-Type': 'multipart/form-data'
                    },
                    responseType: 'arraybuffer',
                    maxBodyLength: Infinity,
                }
            ).catch(error => {
                let errorMessage = 'Unknown error';
                console.error('Full error object:', error);

                if (axios.isAxiosError(error) && error.response) {
                    // Try to extract detailed error from response
                    if (error.response.data) {
                        try {
                            // Convert arraybuffer to string if needed
                            if (error.response.data instanceof ArrayBuffer) {
                                const decoder = new TextDecoder();
                                const dataString = decoder.decode(error.response.data);
                                console.error('Error response data:', dataString);
                                try {
                                    const parsedError = JSON.parse(dataString);
                                    errorMessage = parsedError.detail?.message || parsedError.message || String(parsedError);
                                } catch {
                                    // If JSON parsing fails, use the raw string
                                    errorMessage = dataString;
                                    console.error('Failed to parse error response as JSON:', dataString);
                                }
                            } else {
                                errorMessage = error.response.data.detail?.message || error.response.data.message || String(error.response.data);
                            }
                        } catch (parseError) {
                            console.error('Error parsing error response:', parseError);
                            errorMessage = `Status ${error.response.status}: ${error.response.statusText}`;
                        }
                    } else {
                        errorMessage = `Status ${error.response.status}: ${error.response.statusText}`;
                    }

                    console.error('ElevenLabs API Error Details:', {
                        status: error.response.status,
                        statusText: error.response.statusText,
                        headers: error.response.headers,
                        errorMessage
                    });
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
                headers: response.headers,
                dataType: response.data ? typeof response.data : 'undefined',
                dataLength: response.data ? response.data.byteLength : 0
            });

            if (!response.data || response.data.byteLength === 0) {
                throw new Error('Received empty response from ElevenLabs API');
            }

            // Verify the response is audio data
            const contentType = response.headers['content-type'];
            if (!contentType || !contentType.includes('audio')) {
                console.error('Unexpected content type:', contentType);
                const decoder = new TextDecoder();
                const responseText = decoder.decode(response.data);
                console.error('Response content:', responseText);
                throw new Error(`Unexpected response type: ${contentType}`);
            }

            // Convert the response to a Buffer
            const responseBuffer = Buffer.from(response.data);

            // Get the brand data from the database
            console.log('Getting brand data...');

            // Log the Supabase connection details for debugging
            console.log('Supabase URL availability:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
            console.log('Supabase key availability:', !!process.env.SUPABASE_SERVICE_KEY);
            if (process.env.SUPABASE_SERVICE_KEY) {
                console.log('Supabase key length:', process.env.SUPABASE_SERVICE_KEY.length);
                console.log('Supabase key starts with:', process.env.SUPABASE_SERVICE_KEY.substring(0, 10));
            }

            // Use the API from supabase.ts instead of direct fetch
            console.log('Fetching brand data from database...');
            const { data: brandData, error: brandError } = await supabase
                .from('mylerzbrands')
                .select('*')
                .eq('id', brandId)
                .single();

            if (brandError) {
                const errorMsg = `Failed to fetch brand data: ${brandError.message}`;
                console.error(errorMsg);
                await notifyProcessEvent('error', errorMsg);
                return NextResponse.json({ error: errorMsg }, { status: 500 });
            }

            if (!brandData) {
                const errorMsg = `Brand with ID ${brandId} not found`;
                console.error(errorMsg);
                await notifyProcessEvent('error', errorMsg);
                return NextResponse.json({ error: errorMsg }, { status: 404 });
            }

            // Save response to Google Cloud Storage
            console.log('Uploading to Google Cloud Storage...');
            await notifyProcessEvent('uploading');

            const filename = `mylerzbrand/${brandData.merchant_name}_${brandData.merchant_id}.mp3`;
            console.log('Uploading to Google Cloud Storage with filename:', filename);
            console.log('Merchant name:', brandData.merchant_name);
            console.log('Merchant ID:', brandData.merchant_id);

            const uploadResponse = await uploadFileToGCS(responseBuffer, filename, {
                merchantName: brandData.merchant_name,
                merchantId: brandData.merchant_id
            });

            console.log('File uploaded successfully');
            console.log('Upload response URL:', uploadResponse);

            // Update the record URL in Supabase using merchant_id
            const publicUrl = uploadResponse;
            console.log('Final URL for Supabase:', publicUrl);

            console.log('Updating database record...');
            await notifyProcessEvent('updating-db');

            let updateSuccess = false;
            try {
                updateSuccess = await updateRecordUrl(brandData.merchant_id, publicUrl);
                console.log('Database update success:', updateSuccess, 'for merchant ID:', brandData.merchant_id);
                console.log('URL saved to Supabase:', publicUrl);
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