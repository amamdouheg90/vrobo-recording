'use client';

import { useState, useEffect } from 'react';
import { MylerzBrand } from '@/utils/supabase';
import VoiceRecorder from '@/components/VoiceRecorder';

export default function Home() {
  const [brands, setBrands] = useState<MylerzBrand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<MylerzBrand | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [directFetchResult, setDirectFetchResult] = useState<string | null>(null);

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

  const handleBrandSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const brandId = parseInt(e.target.value);
    const brand = brands.find(b => b.id === brandId) || null;
    setSelectedBrand(brand);
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

  // Test API access
  async function testDirectFetch() {
    try {
      setDirectFetchResult("Fetching via API...");

      const response = await fetch('/api/brands');
      const data = await response.json();

      if (!response.ok) {
        setDirectFetchResult(`Error: ${data.message || response.statusText}`);
        return;
      }

      setDirectFetchResult(`Success! Found ${data.brands?.length || 0} brands`);
    } catch (err) {
      setDirectFetchResult(`Exception: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
          <h1 className="text-3xl md:text-4xl font-bold">Voice Cloning for Mylerz Brands</h1>
          <p className="mt-2 text-blue-100">Record and manage voice clones for your brands</p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex justify-center items-center my-12 p-8 bg-white rounded-lg shadow-md">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="ml-4 text-lg">Loading brands...</p>
          </div>
        ) : error ? (
          <div className="bg-white border-l-4 border-red-500 p-6 rounded-lg shadow-md mb-8">
            <h2 className="text-xl font-bold text-red-700 mb-2">Error loading brands</h2>
            <p className="mb-4">{error}</p>
            <p className="mb-4 text-sm text-gray-600">
              Check your Supabase configuration in .env.local file. Make sure the variables are set correctly.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={loadBrands}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                Retry
              </button>
              <button
                onClick={testDirectFetch}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
              >
                Test Direct Fetch
              </button>
            </div>
            {directFetchResult && (
              <div className="mt-4 p-3 bg-gray-100 rounded-md overflow-auto max-h-64 text-sm font-mono">
                {directFetchResult}
              </div>
            )}
          </div>
        ) : brands.length === 0 ? (
          <div className="bg-white border-l-4 border-yellow-500 p-6 rounded-lg shadow-md mb-8">
            <h2 className="text-xl font-bold text-yellow-700 mb-2">No brands found</h2>
            <p className="mb-4">
              There are no brands available in the database. Make sure the mylerzbrands table
              exists and contains data.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={loadBrands}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                Retry
              </button>
              <button
                onClick={testDirectFetch}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
              >
                Test Direct Fetch
              </button>
            </div>
            {directFetchResult && (
              <div className="mt-4 p-3 bg-gray-100 rounded-md overflow-auto max-h-64 text-sm font-mono">
                {directFetchResult}
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Brand Selection */}
            <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Select Brand</h2>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  onChange={handleBrandSelect}
                  value={selectedBrand?.id || ''}
                >
                  <option value="">-- Select a brand --</option>
                  {brands.map(brand => (
                    <option key={brand.id} value={brand.id}>
                      {brand.merchant_name} (ID: {brand.merchant_id})
                    </option>
                  ))}
                </select>

                {selectedBrand && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-md border border-blue-100">
                    <h3 className="font-medium text-blue-800">Selected Brand Info</h3>
                    <table className="mt-2 w-full text-sm">
                      <tbody>
                        <tr>
                          <td className="py-1 text-gray-600">Name:</td>
                          <td className="py-1 font-medium">{selectedBrand.merchant_name}</td>
                        </tr>
                        <tr>
                          <td className="py-1 text-gray-600">ID:</td>
                          <td className="py-1 font-medium">{selectedBrand.merchant_id}</td>
                        </tr>
                        <tr>
                          <td className="py-1 text-gray-600">Has Recording:</td>
                          <td className="py-1 font-medium">
                            {selectedBrand.record_url ? (
                              <span className="text-green-600">Yes</span>
                            ) : (
                              <span className="text-red-600">No</span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Voice Recorder */}
            <div className="lg:col-span-2">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <VoiceRecorder
                  selectedBrand={selectedBrand}
                  onRecordingComplete={handleRecordingComplete}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
