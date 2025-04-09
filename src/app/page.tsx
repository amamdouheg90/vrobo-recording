'use client';

import { useState, useEffect } from 'react';
import { MylerzBrand } from '@/utils/supabase';
import VoiceRecorder from '@/components/VoiceRecorder';

export default function Home() {
  const [brands, setBrands] = useState<MylerzBrand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<MylerzBrand | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'recorded' | 'unrecorded'>('all');

  useEffect(() => {
    loadBrands();
  }, []);

  async function loadBrands() {
    try {
      console.log('Checking Supabase setup via API...');
      setIsLoading(true);

      // Check if Supabase is properly configured
      const checkResponse = await fetch('/api/check/supabase');
      const checkData = await checkResponse.json();

      if (!checkData.success) {
        setError(`Supabase connection error: ${checkData.message}`);
        setIsLoading(false);
        return;
      }

      // Fetch brands using API route instead of direct Supabase client
      console.log('Fetching brands from API...');
      const brandsResponse = await fetch('/api/brands');
      const brandsData = await brandsResponse.json();

      if (!brandsResponse.ok) {
        throw new Error(brandsData.message || 'Failed to fetch brands');
      }

      console.log('Brands data:', brandsData);
      setBrands(brandsData.brands || []);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading brands:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      setIsLoading(false);
    }
  }

  const filteredBrands = brands.filter(brand => {
    switch (filterType) {
      case 'recorded':
        return brand.record_url && brand.record_url.length > 0;
      case 'unrecorded':
        return !brand.record_url || brand.record_url.length === 0;
      default:
        return true;
    }
  });

  const handleBrandSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const brandId = parseInt(e.target.value);
    const brand = brands.find(b => b.id === brandId) || null;
    setSelectedBrand(brand);
  };

  const handleNextBrand = () => {
    if (!selectedBrand || filteredBrands.length === 0) return;

    const currentIndex = filteredBrands.findIndex(b => b.id === selectedBrand.id);
    if (currentIndex === -1) return;

    const nextIndex = (currentIndex + 1) % filteredBrands.length;
    setSelectedBrand(filteredBrands[nextIndex]);
  };

  const handleRecordingComplete = (url: string) => {
    if (selectedBrand) {
      // Update the selected brand with the new URL
      setSelectedBrand({
        ...selectedBrand,
        record_url: url
      });

      // Update the brand in the brands array
      setBrands(brands.map(brand =>
        brand.id === selectedBrand.id
          ? { ...brand, record_url: url }
          : brand
      ));
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 text-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-4">
        {isLoading ? (
          <div className="flex justify-center items-center my-8 p-6 bg-white rounded-lg shadow-md">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="ml-3 text-lg text-gray-700">Loading brands...</p>
          </div>
        ) : error ? (
          <div className="bg-white border-l-4 border-red-500 p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-bold text-red-700 mb-2">Error loading brands</h2>
            <p className="mb-4 text-gray-800">{error}</p>
            <button
              onClick={loadBrands}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors shadow-sm"
            >
              Retry Loading
            </button>
          </div>
        ) : brands.length === 0 ? (
          <div className="bg-white border-l-4 border-yellow-500 p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-bold text-yellow-700 mb-2">No brands found</h2>
            <p className="mb-4 text-gray-800">
              There are no brands available in the database. Please check your database configuration.
            </p>
            <button
              onClick={loadBrands}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors shadow-sm"
            >
              Refresh List
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Brand Selection */}
            <div className="lg:col-span-1">
              <div className="bg-white p-4 rounded-lg shadow-md space-y-4">
                {/* Filter Options */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`flex-1 py-2 px-3 rounded-md transition-colors ${filterType === 'all'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilterType('recorded')}
                    className={`flex-1 py-2 px-3 rounded-md transition-colors ${filterType === 'recorded'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    Recorded
                  </button>
                  <button
                    onClick={() => setFilterType('unrecorded')}
                    className={`flex-1 py-2 px-3 rounded-md transition-colors ${filterType === 'unrecorded'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    Unrecorded
                  </button>
                </div>

                <div className="relative">
                  <select
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:ring-opacity-50 bg-white text-gray-800 appearance-none cursor-pointer"
                    onChange={handleBrandSelect}
                    value={selectedBrand?.id || ''}
                  >
                    <option value="">-- Select a brand --</option>
                    {filteredBrands.map(brand => (
                      <option key={brand.id} value={brand.id}>
                        {brand.merchant_name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>

                {selectedBrand && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Name:</span>
                        <span className="font-medium text-gray-800">{selectedBrand.merchant_name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Recording:</span>
                        <span className={`font-medium ${selectedBrand.record_url ? 'text-green-600' : 'text-red-600'}`}>
                          {selectedBrand.record_url ? 'Recorded' : 'Not Recorded'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Voice Recorder */}
            <div className="lg:col-span-2">
              <div className="bg-white p-4 rounded-lg shadow-md">
                <VoiceRecorder
                  selectedBrand={selectedBrand}
                  onRecordingComplete={handleRecordingComplete}
                  onNext={handleNextBrand}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
