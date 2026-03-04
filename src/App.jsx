import React, { useState} from 'react';
import CustomerApp from './CustomerApp';
import BusinessDashboard from './BusinessDashboard';

function App() {
    const [mode, setMode] = useState('customer');

    return (
        <div>
            <div className='fixed top-4 right-4 z-50 bg-white rounded-lg shadow-lg p-2'>
                <button
                  onClick={() => setMode('customer')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    mode === 'customer' ? 'bg-blue-600 text-white' : 'bg-gray-100'
                  }`}
                >
                  Customer 
                </button>
                <button
                  onClick={() => setMode('business')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    mode === 'business' ? 'bg-blue-600 text-white' : 'bg-gray-100'
                  }`}
                >
                    Business
                </button>
            </div>

            {mode === 'customer' ? <CustomerApp /> : <BusinessDashboard />}
        </div>
    );
}

export default App;