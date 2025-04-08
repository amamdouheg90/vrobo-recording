import { useState, useEffect } from 'react';

interface ServiceStatus {
    name: string;
    status: 'checking' | 'success' | 'error';
    message?: string;
}

export default function ServiceStatus() {
    const [services, setServices] = useState<ServiceStatus[]>([
        { name: 'Supabase', status: 'checking' },
        { name: 'Eleven Labs', status: 'checking' },
        { name: 'Google Cloud', status: 'checking' }
    ]);

    useEffect(() => {
        checkServices();
    }, []);

    const checkServices = async () => {
        // Check Supabase
        try {
            const supResponse = await fetch('/api/check/supabase');
            const supData = await supResponse.json();

            updateServiceStatus('Supabase',
                supData.success ? 'success' : 'error',
                supData.message
            );
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Connection failed';
            updateServiceStatus('Supabase', 'error', errorMessage);
        }

        // Check Eleven Labs
        try {
            const elevenlabsResponse = await fetch('/api/check/elevenlabs');
            const elevenlabsData = await elevenlabsResponse.json();

            updateServiceStatus('Eleven Labs',
                elevenlabsData.success ? 'success' : 'error',
                elevenlabsData.message
            );
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Connection failed';
            updateServiceStatus('Eleven Labs', 'error', errorMessage);
        }

        // Check Google Cloud
        try {
            const gcloudResponse = await fetch('/api/check/gcloud');
            const gcloudData = await gcloudResponse.json();

            updateServiceStatus('Google Cloud',
                gcloudData.success ? 'success' : 'error',
                gcloudData.message
            );
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Connection failed';
            updateServiceStatus('Google Cloud', 'error', errorMessage);
        }
    };

    const updateServiceStatus = (name: string, status: 'checking' | 'success' | 'error', message?: string) => {
        setServices(currentServices =>
            currentServices.map(service =>
                service.name === name ? { ...service, status, message } : service
            )
        );
    };

    return (
        <div className="w-full mb-8 bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-600">
                <h2 className="text-lg font-semibold text-white">Service Status</h2>
            </div>
            <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {services.map((service) => (
                        <div key={service.name} className="flex items-center p-3 border rounded-md">
                            <div className={`w-3 h-3 rounded-full mr-3 ${service.status === 'checking' ? 'bg-yellow-400' :
                                    service.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                                }`}></div>
                            <div>
                                <p className="font-medium">{service.name}</p>
                                <p className={`text-sm ${service.status === 'checking' ? 'text-yellow-600' :
                                        service.status === 'success' ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                    {service.status === 'checking' ? 'Checking...' :
                                        service.status === 'success' ? 'Connected' :
                                            service.message || 'Connection Error'}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
                <button
                    onClick={checkServices}
                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                    Refresh Status
                </button>
            </div>
        </div>
    );
} 