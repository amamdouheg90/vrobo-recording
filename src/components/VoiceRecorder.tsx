import React, { useState, useRef, useEffect } from 'react';
import { MylerzBrand } from '@/utils/supabase';

// Add WebKit AudioContext type
interface WebKitWindow extends Window {
    webkitAudioContext: typeof AudioContext;
}

type RecordingStep = 'idle' | 'recording' | 'processing' | 'elevenlabs' | 'uploading' | 'updating_db' | 'preview' | 'completed' | 'error';

interface VoiceRecorderProps {
    selectedBrand: MylerzBrand | null;
    onRecordingComplete: (url: string) => void;
    onNext: () => void;
}

export default function VoiceRecorder({ selectedBrand, onRecordingComplete, onNext }: VoiceRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentStep, setCurrentStep] = useState<RecordingStep>('idle');
    const [error, setError] = useState<string | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const [isPreparing, setIsPreparing] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isNewRecording, setIsNewRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordButtonRef = useRef<HTMLButtonElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const timerRef = useRef<number | null>(null);
    const recordingStartTimeRef = useRef<number>(0);
    const audioPlayerRef = useRef<HTMLAudioElement>(null);

    const hasExistingRecording = !isNewRecording && selectedBrand?.record_url && selectedBrand.record_url.length > 0;

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            if (timerRef.current) {
                window.clearInterval(timerRef.current);
            }
        };
    }, []);

    // Handle recording timer
    useEffect(() => {
        if (isRecording) {
            recordingStartTimeRef.current = Date.now();
            setRecordingTime(0);
            timerRef.current = window.setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } else {
            if (timerRef.current) {
                window.clearInterval(timerRef.current);
            }
        }
        return () => {
            if (timerRef.current) {
                window.clearInterval(timerRef.current);
            }
        };
    }, [isRecording]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Handle touch events for mobile
    const handleTouchStart = async (e: React.TouchEvent) => {
        e.preventDefault(); // Prevent default touch behavior
        if (!isRecording && !isProcessing && !isPreparing) {
            setIsPreparing(true);
            // Wait 1 second before starting to record
            setTimeout(async () => {
                await startRecording();
                setIsPreparing(false);
            }, 1000);
        } else if (isRecording) {
            // Stop recording immediately
            stopRecording();
        }
    };

    const startRecording = async () => {
        if (!selectedBrand) {
            setError('Please select a brand first');
            return;
        }

        setError(null);
        audioChunksRef.current = [];
        setCurrentStep('recording');

        try {
            // First ensure any existing streams are properly cleaned up
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => {
                    track.stop();
                });
                streamRef.current = null;
            }

            // Request microphone access with specific constraints
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 44100,
                    sampleSize: 16,
                    echoCancellation: true,
                    noiseSuppression: true,
                }
            });

            // Store the stream reference
            streamRef.current = stream;

            // Check if the stream is actually active
            if (!stream.active) {
                throw new Error('Microphone stream is not active');
            }

            // Verify we have audio tracks
            if (stream.getAudioTracks().length === 0) {
                throw new Error('No audio tracks available');
            }

            // Try different MIME types in order of preference
            const mimeTypes = [
                'audio/webm',
                'audio/mp4',
                'audio/ogg',
                'audio/wav'
            ];

            let selectedMimeType = '';
            for (const mimeType of mimeTypes) {
                if (MediaRecorder.isTypeSupported(mimeType)) {
                    selectedMimeType = mimeType;
                    break;
                }
            }

            if (!selectedMimeType) {
                throw new Error('No supported audio MIME type found');
            }

            console.log('Using audio format:', selectedMimeType);
            console.log('Stream active:', stream.active);
            console.log('Audio tracks:', stream.getAudioTracks().length);

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: selectedMimeType,
            });

            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    console.log('Received audio chunk:', event.data.size, 'bytes');
                    audioChunksRef.current.push(event.data);
                }
            };

            const removeSilence = async (audioBlob: Blob): Promise<Blob> => {
                return new Promise((resolve, reject) => {
                    const AudioContextClass = (window as unknown as WebKitWindow).webkitAudioContext || window.AudioContext;
                    const audioContext = new AudioContextClass();
                    const reader = new FileReader();

                    reader.onload = async () => {
                        try {
                            const audioBuffer = await audioContext.decodeAudioData(reader.result as ArrayBuffer);
                            const channelData = audioBuffer.getChannelData(0); // Get the first channel
                            const threshold = 0.01; // Adjust this value to change silence sensitivity

                            // Find start index (first non-silent sample)
                            let startIndex = 0;
                            for (let i = 0; i < channelData.length; i++) {
                                if (Math.abs(channelData[i]) > threshold) {
                                    startIndex = Math.max(0, i - (audioContext.sampleRate * 0.1)); // Add 100ms buffer
                                    break;
                                }
                            }

                            // Find end index (last non-silent sample)
                            let endIndex = channelData.length - 1;
                            for (let i = channelData.length - 1; i >= 0; i--) {
                                if (Math.abs(channelData[i]) > threshold) {
                                    endIndex = Math.min(channelData.length - 1, i + (audioContext.sampleRate * 0.1)); // Add 100ms buffer
                                    break;
                                }
                            }

                            // If no non-silent parts found or very short audio, return original
                            if (startIndex >= endIndex || (endIndex - startIndex) < audioContext.sampleRate * 0.5) {
                                console.log('Audio too short or completely silent, using original');
                                resolve(audioBlob);
                                return;
                            }

                            // Create new buffer with trimmed audio
                            const trimmedLength = endIndex - startIndex;
                            const trimmedBuffer = audioContext.createBuffer(
                                audioBuffer.numberOfChannels,
                                trimmedLength,
                                audioBuffer.sampleRate
                            );

                            // Copy the non-silent portion for each channel
                            for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
                                const channelData = audioBuffer.getChannelData(channel);
                                const newChannelData = trimmedBuffer.getChannelData(channel);
                                for (let i = 0; i < trimmedLength; i++) {
                                    newChannelData[i] = channelData[startIndex + i];
                                }
                            }

                            // Convert buffer back to blob
                            const offlineContext = new OfflineAudioContext({
                                numberOfChannels: trimmedBuffer.numberOfChannels,
                                length: trimmedBuffer.length,
                                sampleRate: trimmedBuffer.sampleRate
                            });

                            const source = offlineContext.createBufferSource();
                            source.buffer = trimmedBuffer;
                            source.connect(offlineContext.destination);
                            source.start();

                            const renderedBuffer = await offlineContext.startRendering();

                            // Convert to WAV format
                            const wavBlob = await new Promise<Blob>((resolveBlob) => {
                                const length = renderedBuffer.length * renderedBuffer.numberOfChannels * 2;
                                const view = new DataView(new ArrayBuffer(44 + length));

                                // Write WAV header
                                writeString(view, 0, 'RIFF');
                                view.setUint32(4, 36 + length, true);
                                writeString(view, 8, 'WAVE');
                                writeString(view, 12, 'fmt ');
                                view.setUint32(16, 16, true);
                                view.setUint16(20, 1, true);
                                view.setUint16(22, renderedBuffer.numberOfChannels, true);
                                view.setUint32(24, renderedBuffer.sampleRate, true);
                                view.setUint32(28, renderedBuffer.sampleRate * renderedBuffer.numberOfChannels * 2, true);
                                view.setUint16(32, renderedBuffer.numberOfChannels * 2, true);
                                view.setUint16(34, 16, true);
                                writeString(view, 36, 'data');
                                view.setUint32(40, length, true);

                                // Write audio data
                                const volume = 0.8;
                                let offset = 44;
                                for (let i = 0; i < renderedBuffer.length; i++) {
                                    for (let channel = 0; channel < renderedBuffer.numberOfChannels; channel++) {
                                        const sample = Math.max(-1, Math.min(1, renderedBuffer.getChannelData(channel)[i])) * volume;
                                        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
                                        offset += 2;
                                    }
                                }

                                resolveBlob(new Blob([view.buffer], { type: 'audio/wav' }));
                            });

                            resolve(wavBlob);
                        } catch (error) {
                            console.error('Error processing audio:', error);
                            // If any error occurs, return the original blob
                            resolve(audioBlob);
                        } finally {
                            audioContext.close();
                        }
                    };

                    reader.onerror = (error) => reject(error);
                    reader.readAsArrayBuffer(audioBlob);
                });
            };

            // Helper function to write strings to DataView
            const writeString = (view: DataView, offset: number, string: string) => {
                for (let i = 0; i < string.length; i++) {
                    view.setUint8(offset + i, string.charCodeAt(i));
                }
            };

            mediaRecorder.onstop = async () => {
                try {
                    // Ensure we have audio chunks
                    if (audioChunksRef.current.length === 0) {
                        throw new Error('No audio data recorded');
                    }

                    // Create the audio blob
                    const audioBlob = new Blob(audioChunksRef.current, { type: selectedMimeType });

                    // Verify the blob size
                    if (audioBlob.size === 0) {
                        throw new Error('Recorded audio file is empty');
                    }

                    console.log('Recording completed:', {
                        format: selectedMimeType,
                        size: audioBlob.size,
                        chunks: audioChunksRef.current.length
                    });

                    try {
                        console.log('Removing silence from recording...');
                        const trimmedBlob = await removeSilence(audioBlob);
                        console.log('Silence removed. New size:', trimmedBlob.size);
                        await processRecording(trimmedBlob);
                    } catch (error) {
                        console.error('Error removing silence:', error);
                        // Fallback to original audio if silence removal fails
                        await processRecording(audioBlob);
                    }
                } catch (error) {
                    console.error('Error processing recording:', error);
                    setError('Failed to process recording. Please try again.');
                    setIsProcessing(false);
                    setCurrentStep('error');
                }
            };

            mediaRecorder.start(100); // Collect data in smaller chunks (100ms)
            setIsRecording(true);
        } catch (error) {
            console.error('Error starting recording:', error);
            // More specific error messages based on the error
            if (error instanceof DOMException) {
                if (error.name === 'NotAllowedError') {
                    setError('Microphone access was denied. Please allow microphone access and try again.');
                } else if (error.name === 'NotFoundError') {
                    setError('No microphone found. Please ensure your device has a working microphone.');
                } else {
                    setError(`Microphone error: ${error.message}. Please reload and try again.`);
                }
            } else {
                setError('Could not start recording. Please reload the page and try again.');
            }
            setCurrentStep('error');

            // Cleanup any partial stream
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            try {
                // No minimum duration check here since we already checked in handleTouchStart
                // Request final chunk of data
                mediaRecorderRef.current.requestData();
                // Stop the recorder
                mediaRecorderRef.current.stop();
                setIsRecording(false);
                setCurrentStep('processing');
            } catch (error) {
                console.error('Error stopping recording:', error);
                setError('Failed to stop recording properly. Please reload the page.');
                setCurrentStep('error');
            }

            // Always cleanup the stream
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => {
                    track.stop();
                    track.enabled = false;
                });
                streamRef.current = null;
            }
        }
    };

    const processRecording = async (audioBlob: Blob) => {
        if (!selectedBrand) return;

        setIsProcessing(true);
        setError(null);
        setCurrentStep('processing');

        try {
            console.log('Processing recording:', {
                type: audioBlob.type,
                size: audioBlob.size
            });

            const formData = new FormData();
            formData.append('audio', audioBlob);
            formData.append('brandId', selectedBrand.id.toString());

            console.log('Sending recording to voice-clone API');
            setCurrentStep('elevenlabs');

            const response = await fetch('/api/voice-clone', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to process recording');
            }

            const data = await response.json();

            let finalUrl = '';
            if (data.url) finalUrl = data.url;
            else if (data.gcsUrl) finalUrl = data.gcsUrl;
            else if (data.gcUrl) finalUrl = data.gcUrl;
            else if (data.storageUrl) finalUrl = data.storageUrl;
            else if (data.record_url) finalUrl = data.record_url;
            else if (data.data && typeof data.data === 'object') {
                if (data.data.url) finalUrl = data.data.url;
                else if (data.data.gcsUrl) finalUrl = data.data.gcsUrl;
                else if (data.data.record_url) finalUrl = data.data.record_url;
            }

            if (finalUrl) {
                try {
                    const url = new URL(finalUrl);
                    finalUrl = url.toString();
                } catch {
                    finalUrl = finalUrl.replace(/ /g, '%20');
                    try {
                        const url = new URL(finalUrl);
                        finalUrl = url.toString();
                    } catch {
                        console.error('Still invalid URL after encoding:', finalUrl);
                    }
                }

                // Save the recording immediately
                onRecordingComplete(finalUrl);

                // Then show preview
                setPreviewUrl(finalUrl);
                setCurrentStep('preview');
                setIsProcessing(false);
            } else {
                throw new Error('No URL received from the API');
            }
        } catch (error) {
            console.error('Error processing recording:', error);
            setError(error instanceof Error ? error.message : 'Failed to process recording. Please try again.');
            setCurrentStep('error');
            setIsProcessing(false);
        }
    };

    // Add effect to auto-play preview when it's ready
    useEffect(() => {
        if (currentStep === 'preview' && previewUrl && audioPlayerRef.current) {
            audioPlayerRef.current.play().catch(err => {
                console.error('Error auto-playing preview:', err);
            });
        }
    }, [currentStep, previewUrl]);

    // Reset states when merchant changes
    useEffect(() => {
        setIsRecording(false);
        setIsProcessing(false);
        setCurrentStep('idle');
        setError(null);
        setIsNewRecording(false);
        audioChunksRef.current = [];

        if (timerRef.current) {
            window.clearInterval(timerRef.current);
        }
    }, [selectedBrand]);

    return (
        <div className="w-full">
            {!selectedBrand ? (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-700">Please select a brand to start recording</p>
                </div>
            ) : hasExistingRecording ? (
                <div className="flex flex-col items-center w-full">
                    <div className="w-full mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <p className="text-blue-800 font-medium text-center">
                            {selectedBrand.merchant_name}
                        </p>
                    </div>

                    <div className="w-full max-w-md space-y-4">
                        <div className="p-4 bg-white rounded-lg shadow">
                            <p className="text-gray-600 mb-3 text-center">Existing Recording</p>
                            <audio
                                src={selectedBrand.record_url || undefined}
                                controls
                                className="w-full mb-4"
                            />
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => {
                                        setIsNewRecording(true);
                                        setCurrentStep('idle');
                                        setError(null);
                                    }}
                                    className="w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                                >
                                    Record New Audio
                                </button>
                                <button
                                    onClick={onNext}
                                    className="w-full py-2 px-4 bg-green-500 text-white rounded hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                                >
                                    Next Brand
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center w-full">
                    <div className="w-full mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <p className="text-blue-800 font-medium text-center">
                            {selectedBrand.merchant_name}
                        </p>
                    </div>

                    <div className="flex flex-col items-center w-full">
                        {/* Recording Timer */}
                        <div className="mb-4 text-xl font-semibold">
                            {isRecording && (
                                <span className="text-red-600">{formatTime(recordingTime)}</span>
                            )}
                        </div>

                        {currentStep === 'preview' && previewUrl ? (
                            <div className="w-full max-w-md space-y-4">
                                <div className="p-4 bg-white rounded-lg shadow">
                                    <p className="text-gray-600 mb-3 text-center">Recording Preview</p>
                                    <audio
                                        ref={audioPlayerRef}
                                        src={previewUrl}
                                        controls
                                        className="w-full mb-4"
                                    />
                                    <div className="flex flex-col gap-2">
                                        <p className="text-sm text-gray-500 text-center">
                                            Recording has been saved
                                        </p>
                                        <button
                                            onClick={onNext}
                                            className="w-full py-2 px-4 bg-green-500 text-white rounded hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                                        >
                                            Next Brand
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Microphone Button */}
                                <div
                                    className="relative my-4 touch-none select-none"
                                    style={{ touchAction: 'none' }}
                                >
                                    <button
                                        ref={recordButtonRef}
                                        onTouchStart={handleTouchStart}
                                        disabled={isProcessing || currentStep === 'processing' || currentStep === 'elevenlabs' || currentStep === 'uploading' || currentStep === 'updating_db'}
                                        className={`
                                        relative flex flex-col items-center justify-center
                                            w-40 h-40 rounded-full 
                                            shadow-lg
                                        active:shadow-inner
                                            transition-all duration-200 ease-in-out
                                            ${isProcessing || (currentStep !== 'idle' && currentStep !== 'recording' && currentStep !== 'completed' && currentStep !== 'error')
                                                ? 'bg-gray-300 cursor-not-allowed'
                                                : isRecording
                                                    ? 'bg-red-600 scale-105 shadow-red-200'
                                                    : isPreparing
                                                        ? 'bg-orange-500'
                                                        : 'bg-red-500'
                                            }
                                        focus:outline-none focus:ring-4 focus:ring-red-200
                                        touch-none select-none
                                    `}
                                        style={{ touchAction: 'none' }}
                                        aria-label="Record audio"
                                    >
                                        {/* Microphone Icon */}
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            fill="white"
                                            className={`w-20 h-20 ${isRecording ? 'animate-pulse' : ''}`}
                                        >
                                            <path d="M12 16c2.206 0 4-1.794 4-4V6c0-2.217-1.785-4.021-3.979-4.021a.933.933 0 0 0-.209.025A4.006 4.006 0 0 0 8 6v6c0 2.206 1.794 4 4 4zm-6 0v-2c0-.553-.447-1-1-1s-1 .447-1 1v2c0 3.309 2.691 6 6 6h2c3.309 0 6-2.691 6-6v-2c0-.553-.447-1-1-1s-1 .447-1 1v2c0 2.206-1.794 4-4 4h-2c-2.206 0-4-1.794-4-4z" />
                                        </svg>

                                        {/* Recording Indicator */}
                                        {isRecording && (
                                            <div className="absolute w-full h-full rounded-full animate-ping-slow bg-red-600 opacity-30"></div>
                                        )}
                                    </button>

                                    {/* Recording Status */}
                                    {isRecording && (
                                        <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 bg-red-100 px-4 py-2 rounded-full">
                                            <span className="text-red-600 font-medium animate-pulse">Recording...</span>
                                        </div>
                                    )}
                                </div>

                                {/* Status Text */}
                                <p className={`text-center font-medium mt-12 text-lg ${isRecording ? 'text-red-600' :
                                    isPreparing ? 'text-orange-600' :
                                        currentStep === 'processing' || currentStep === 'elevenlabs' ? 'text-blue-600' :
                                            'text-gray-600'
                                    }`}>
                                    {currentStep === 'processing' || currentStep === 'elevenlabs'
                                        ? 'Processing your recording...'
                                        : isRecording
                                            ? 'Tap to stop recording'
                                            : isPreparing
                                                ? 'Preparing to record...'
                                                : 'Tap to start recording'}
                                </p>
                            </>
                        )}

                        {error && (
                            <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg w-full">
                                <p className="text-red-600 text-center">{error}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
} 