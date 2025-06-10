'use client';

import { useState } from 'react';
import { trackError, trackPerformance, trackSecurity } from '@/lib/monitoring';

export default function TestMonitoring() {
  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">🚫 Development Only</h1>
        <p className="text-gray-300">This page is only available in development mode.</p>
      </div>
    );
  }

  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testError = () => {
    trackError('Test error message', new Error('Sample error'), { 
      context: 'test-page',
      testData: 'some context'
    });
    addResult('✅ Error tracked');
  };

  const testPerformance = () => {
    const duration = Math.floor(Math.random() * 1000) + 100; // Random 100-1100ms
    trackPerformance('test-operation', duration, Math.random() > 0.3);
    addResult(`✅ Performance tracked: ${duration}ms`);
  };

  const testSecurity = () => {
    const events = ['login_attempt', 'failed_login', 'rate_limit', 'signup'] as const;
    const randomEvent = events[Math.floor(Math.random() * events.length)];
    trackSecurity(randomEvent, {
      testData: 'sample security event',
      userAgent: navigator.userAgent
    });
    addResult(`✅ Security event tracked: ${randomEvent}`);
  };

  const testAll = () => {
    testError();
    setTimeout(() => testPerformance(), 500);
    setTimeout(() => testSecurity(), 1000);
    addResult('🚀 Running all tests...');
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-6">🧪 Monitoring System Test</h1>
      
      <div className="bg-gray-900 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">Test Controls</h2>
        <div className="flex gap-4 flex-wrap">
          <button
            onClick={testError}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
          >
            🔴 Test Error
          </button>
          <button
            onClick={testPerformance}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            📈 Test Performance
          </button>
          <button
            onClick={testSecurity}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            🛡️ Test Security
          </button>
          <button
            onClick={testAll}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded"
          >
            🚀 Test All
          </button>
          <button
            onClick={clearResults}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
          >
            🧹 Clear
          </button>
        </div>
      </div>

      <div className="bg-gray-900 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">Instructions</h2>
        <ul className="text-gray-300 space-y-2">
          <li>1. Click the test buttons above to generate monitoring events</li>
          <li>2. Check the <strong>📊 Monitor</strong> button in the bottom-right corner</li>
          <li>3. Events should appear in the dashboard in real-time</li>
          <li>4. In development, events also log to the browser console</li>
        </ul>
      </div>

      <div className="bg-gray-900 p-6 rounded-lg">
        <h2 className="text-xl font-semibold text-white mb-4">Test Results</h2>
        <div className="bg-black p-4 rounded font-mono text-sm">
          {testResults.length === 0 ? (
            <div className="text-gray-500">No tests run yet. Click a test button above.</div>
          ) : (
            testResults.map((result, index) => (
              <div key={index} className="text-green-400 mb-1">
                {result}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 