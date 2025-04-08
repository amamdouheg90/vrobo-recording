import { FC } from 'react';

export type RecordingStep =
    | 'idle'
    | 'recording'
    | 'processing'
    | 'elevenlabs'
    | 'uploading'
    | 'updating_db'
    | 'completed'
    | 'error';

interface RecordingStepsProps {
    currentStep: RecordingStep;
    error?: string;
}

const steps = [
    { id: 'recording', label: 'Recording' },
    { id: 'processing', label: 'Processing' },
    { id: 'elevenlabs', label: 'Voice Cloning' },
    { id: 'uploading', label: 'Uploading' },
    { id: 'updating_db', label: 'Database' },
    { id: 'completed', label: 'Complete' }
];

const RecordingSteps: FC<RecordingStepsProps> = ({ currentStep, error }) => {
    // Calculate which steps are completed, current, or pending
    const getStepStatus = (stepId: string): 'completed' | 'current' | 'pending' | 'error' => {
        if (currentStep === 'error') {
            if (steps.findIndex(s => s.id === stepId) >= steps.findIndex(s => s.id === currentStep)) {
                return 'error';
            } else {
                return 'completed';
            }
        }

        const currentIndex = steps.findIndex(s => s.id === currentStep);
        const stepIndex = steps.findIndex(s => s.id === stepId);

        if (stepIndex < currentIndex) return 'completed';
        if (stepIndex === currentIndex) return 'current';
        return 'pending';
    };

    if (currentStep === 'idle') return null;

    // For mobile, we'll show a simplified view with just the current step and indicator
    const currentStepIndex = steps.findIndex(s => s.id === currentStep);
    const currentStepData = steps[currentStepIndex];
    const totalSteps = steps.length;
    const progress = currentStepIndex / (totalSteps - 1) * 100;

    return (
        <div className="w-full mt-6 mb-4">
            <h3 className="text-lg font-medium mb-4 text-gray-700">Recording Progress</h3>

            {/* Mobile View */}
            <div className="md:hidden">
                <div className="mb-2 flex justify-between text-sm">
                    <span className="font-medium">
                        Step {currentStepIndex + 1} of {totalSteps}: {currentStepData?.label}
                    </span>
                    <span className="text-blue-600 font-medium">
                        {Math.round(progress)}%
                    </span>
                </div>

                {/* Progress Bar */}
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className={`h-full ${currentStep === 'error' ? 'bg-red-500' : 'bg-blue-500'}`}
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>

                {/* Current Step Indicator */}
                <div className="mt-4 flex items-center">
                    <div
                        className={`
                            flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                            ${currentStep === 'error' ? 'bg-red-500' :
                                currentStep === 'completed' ? 'bg-green-500' : 'bg-blue-500 animate-pulse'}
                        `}
                    >
                        {currentStep === 'error' && (
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        )}
                        {currentStep === 'completed' && (
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                        {currentStep !== 'error' && currentStep !== 'completed' && (
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                        )}
                    </div>
                    <div className="ml-3">
                        <p className={`font-medium ${currentStep === 'error' ? 'text-red-600' :
                                currentStep === 'completed' ? 'text-green-600' : 'text-blue-600'
                            }`}>
                            {currentStep === 'error' ? 'Error' :
                                currentStep === 'completed' ? 'Completed' : currentStepData?.label}
                        </p>
                        {currentStep === 'error' && error && (
                            <p className="text-sm text-red-500 mt-1">{error}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Desktop View - Original Step Indicators */}
            <div className="hidden md:block relative">
                {/* Progress Line */}
                <div className="absolute top-5 left-0 w-full h-1 bg-gray-200"></div>

                {/* Steps */}
                <div className="relative flex justify-between">
                    {steps.map((step, index) => {
                        const status = getStepStatus(step.id);
                        return (
                            <div key={step.id} className="flex flex-col items-center">
                                {/* Step Circle */}
                                <div
                                    className={`
                                        relative z-10 flex items-center justify-center w-10 h-10 rounded-full 
                                        ${status === 'completed' ? 'bg-green-500' :
                                            status === 'current' ? 'bg-blue-500 animate-pulse' :
                                                status === 'error' ? 'bg-red-500' :
                                                    'bg-gray-300'
                                        }
                                    `}
                                >
                                    {status === 'completed' && (
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                    {status === 'current' && (
                                        <div className="w-3 h-3 bg-white rounded-full"></div>
                                    )}
                                    {status === 'error' && (
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    )}
                                    {status === 'pending' && (
                                        <span className="text-xs text-gray-500">{index + 1}</span>
                                    )}
                                </div>

                                {/* Step Label */}
                                <div className={`mt-2 text-xs text-center w-16 ${status === 'completed' ? 'text-green-600' :
                                        status === 'current' ? 'text-blue-600 font-medium' :
                                            status === 'error' ? 'text-red-600' :
                                                'text-gray-500'
                                    }`}>
                                    {step.label}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Error Message - Desktop */}
            {error && currentStep === 'error' && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                    <strong>Error:</strong> {error}
                </div>
            )}
        </div>
    );
};

export default RecordingSteps; 