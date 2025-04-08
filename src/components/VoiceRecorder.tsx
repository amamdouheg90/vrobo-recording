import React, { useState, useRef, useEffect } from 'react';
import { MylerzBrand } from '@/utils/supabase';
import RecordingSteps, { RecordingStep } from './RecordingSteps';

interface VoiceRecorderProps {
    selectedBrand: MylerzBrand | null;
    onRecordingComplete: (url: string) => void;
}

export default function VoiceRecorder({ selectedBrand, onRecordingComplete }: VoiceRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentStep, setCurrentStep] = useState<RecordingStep>('idle');
    const [error, setError] = useState<string | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [eventSource, setEventSource] = useState<EventSource | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordButtonRef = useRef<HTMLButtonElement>(null);

    // Update audio URL when selected brand changes
    useEffect(() => {
        if (selectedBrand?.record_url) {
            setAudioUrl(selectedBrand.record_url);
        } else {
            setAudioUrl(null);
        }

        // Reset steps when brand changes
        setCurrentStep('idle');
        setError(null);
    }, [selectedBrand]);

    useEffect(() => {
        // Clean up event source when component unmounts
        return () => {
            if (eventSource) {
                eventSource.close();
            }
        };
    }, [eventSource]);

    const startRecording = async () => {
        if (!selectedBrand) {
            setError('Please select a brand first');
            return;
        }

        setError(null);
        audioChunksRef.current = [];
        setCurrentStep('recording');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 44100,
                    sampleSize: 16,
                    echoCancellation: true,
                    noiseSuppression: true,
                }
            });

            // Try to use WAV format if supported
            let mimeType = 'audio/wav';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'audio/webm';
            }

            console.log('Using audio format:', mimeType);

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: mimeType,
            });

            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                try {
                    const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
                    console.log('Recording completed:', {
                        format: mimeType,
                        size: audioBlob.size,
                        chunks: audioChunksRef.current.length
                    });
                    await processRecording(audioBlob);
                } catch (error) {
                    console.error('Error processing recording:', error);
                    setError('Failed to process recording. Please try again.');
                    setIsProcessing(false);
                    setCurrentStep('error');
                }
            };

            mediaRecorder.start(1000); // Collect data in 1-second chunks
            setIsRecording(true);
        } catch (error) {
            console.error('Error starting recording:', error);
            setError('Could not start recording. Please check microphone permissions.');
            setCurrentStep('error');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setCurrentStep('processing');

            // Stop all tracks in the stream
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
    };

    // Handle mouse events for "press-to-record" functionality
    const handleMouseDown = async () => {
        if (!isRecording && !isProcessing) {
            await startRecording();
        }
    };

    const handleMouseUp = () => {
        if (isRecording) {
            stopRecording();
        }
    };

    // Handle touch events for mobile
    const handleTouchStart = async () => {
        if (!isRecording && !isProcessing) {
            await startRecording();
        }
    };

    const handleTouchEnd = () => {
        if (isRecording) {
            stopRecording();
        }
    };

    // Clean up recording if component unmounts while recording
    useEffect(() => {
        return () => {
            if (mediaRecorderRef.current && isRecording) {
                mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [isRecording]);

    const processRecording = async (audioBlob: Blob) => {
        if (!selectedBrand) return;

        setIsProcessing(true);
        setError(null);

        try {
            console.log('Processing recording:', {
                type: audioBlob.type,
                size: audioBlob.size
            });

            // Connect to the process-events SSE endpoint
            console.log('Connecting to process-events endpoint');
            const newEventSource = new EventSource('/api/process-events');
            setEventSource(newEventSource);

            // Set up event handlers for SSE
            newEventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('Process event received:', data);

                    if (data.connected) {
                        console.log('Connected to SSE with client ID:', data.clientId);
                    }

                    if (data.step) {
                        console.log('Updating step to:', data.step);
                        setCurrentStep(data.step as RecordingStep);

                        if (data.step === 'completed') {
                            console.log('Processing completed, closing SSE connection');
                            newEventSource.close();
                            setEventSource(null);
                        }
                    }

                    if (data.error) {
                        console.error('Error from SSE:', data.error);
                        setError(data.error);
                        setCurrentStep('error');
                        newEventSource.close();
                        setEventSource(null);
                    }
                } catch (err) {
                    console.error('Error parsing event data:', err, event.data);
                }
            };

            newEventSource.onerror = (err) => {
                console.error('EventSource error:', err);
                setError('Connection to server lost. Please try again.');
                setCurrentStep('error');
                newEventSource.close();
                setEventSource(null);
            };

            // Prepare and send the form data
            const formData = new FormData();
            formData.append('audio', audioBlob);
            formData.append('brandId', selectedBrand.id.toString());

            // Send the recording to the API
            console.log('Sending recording to voice-clone API');
            const response = await fetch('/api/voice-clone', {
                method: 'POST',
                body: formData,
            });

            // Handle API response
            if (!response.ok) {
                const errorData = await response.json();
                console.error('API Error:', errorData);
                throw new Error(errorData.error || 'Failed to process recording');
            }

            const data = await response.json();
            console.log('API response received:', data);

            // Update audio URL and notify parent
            setAudioUrl(data.url);
            onRecordingComplete(data.url);

            // Note: We don't need to set the step to completed here as the SSE will do that

        } catch (error) {
            console.error('Error processing recording:', error);
            setError(error instanceof Error ? error.message : 'Failed to process recording. Please try again.');
            setCurrentStep('error');

            // Close event source if still open
            if (eventSource) {
                eventSource.close();
                setEventSource(null);
            }
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="mt-6 w-full">
            <h2 className="text-xl font-semibold mb-4">Voice Recorder</h2>

            {!selectedBrand ? (
                <p className="text-red-500">Please select a brand first</p>
            ) : (
                <div className="flex flex-col items-center w-full">
                    <p className="mb-4">
                        Selected Brand: <span className="font-medium">{selectedBrand.merchant_name}</span>
                    </p>

                    <div className="flex flex-col items-center w-full max-w-sm">
                        {/* Recording Steps Progress */}
                        {currentStep !== 'idle' && (
                            <RecordingSteps currentStep={currentStep} error={error || undefined} />
                        )}

                        {/* Microphone Button */}
                        <button
                            ref={recordButtonRef}
                            onMouseDown={handleMouseDown}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                            onTouchStart={handleTouchStart}
                            onTouchEnd={handleTouchEnd}
                            disabled={isProcessing || currentStep === 'processing' || currentStep === 'elevenlabs' || currentStep === 'uploading' || currentStep === 'updating_db'}
                            className={`
                                relative flex flex-col items-center justify-center
                                w-24 h-24 rounded-full 
                                shadow-lg mb-4 
                                active:shadow-inner
                                transition-all duration-200
                                ${isProcessing || currentStep !== 'idle' && currentStep !== 'recording' && currentStep !== 'completed' && currentStep !== 'error'
                                    ? 'bg-gray-300 cursor-not-allowed'
                                    : isRecording
                                        ? 'bg-red-600 animate-pulse scale-110'
                                        : 'bg-red-500 hover:bg-red-600'
                                }
                            `}
                            aria-label="Record audio"
                        >
                            {/* Microphone Icon */}
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="white"
                                className={`w-10 h-10 ${isRecording ? 'animate-pulse' : ''}`}
                            >
                                <path d="M12 16c2.206 0 4-1.794 4-4V6c0-2.217-1.785-4.021-3.979-4.021a.933.933 0 0 0-.209.025A4.006 4.006 0 0 0 8 6v6c0 2.206 1.794 4 4 4zm-6 0v-2c0-.553-.447-1-1-1s-1 .447-1 1v2c0 3.309 2.691 6 6 6h2c3.309 0 6-2.691 6-6v-2c0-.553-.447-1-1-1s-1 .447-1 1v2c0 2.206-1.794 4-4 4h-2c-2.206 0-4-1.794-4-4z" />
                            </svg>

                            {/* Recording Indicator Ripple Effect */}
                            {isRecording && (
                                <div className="absolute w-full h-full rounded-full animate-ping-slow bg-red-600 opacity-30"></div>
                            )}
                        </button>

                        {/* Status Text */}
                        <p className={`text-center font-medium ${isRecording ? 'text-red-600' : 'text-gray-600'}`}>
                            {currentStep === 'processing' || currentStep === 'elevenlabs' || currentStep === 'uploading' || currentStep === 'updating_db'
                                ? 'Processing...'
                                : isRecording
                                    ? 'Release to stop recording'
                                    : 'Press and hold to record'}
                        </p>

                        {error && currentStep !== 'error' && (
                            <p className="mt-4 text-red-500 text-center">{error}</p>
                        )}
                    </div>

                    {audioUrl && (
                        <div className="mt-8 w-full max-w-md">
                            <h3 className="text-lg font-medium mb-2">Brand Recording</h3>
                            <div className="bg-gray-100 p-4 rounded-md shadow">
                                <audio
                                    src={audioUrl}
                                    controls
                                    className="w-full"
                                />
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                    <p className="text-sm text-gray-600 break-all">
                                        <a href={audioUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                                            {audioUrl}
                                        </a>
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
} 