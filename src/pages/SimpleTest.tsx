import React from 'react';
import { useNavigate } from 'react-router-dom';

export function SimpleTest() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '20px', backgroundColor: 'white', minHeight: '100vh' }}>
      <h1 style={{ color: 'blue', fontSize: '24px', marginBottom: '20px' }}>
        🧪 Simple Navigation Test
      </h1>
      
      <p style={{ marginBottom: '20px' }}>
        This is a simple test to verify navigation is working.
      </p>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={() => {
            console.log('🧪 Navigating to Sales');
            navigate('/');
          }}
          style={{
            padding: '10px 20px',
            backgroundColor: 'blue',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Go to Sales (/)
        </button>

        <button
          onClick={() => {
            console.log('🧪 Navigating to Products');
            navigate('/products');
          }}
          style={{
            padding: '10px 20px',
            backgroundColor: 'green',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Go to Products (/products)
        </button>

        <button
          onClick={() => {
            console.log('🧪 Navigating to Inventory');
            navigate('/inventory');
          }}
          style={{
            padding: '10px 20px',
            backgroundColor: 'purple',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Go to Inventory (/inventory)
        </button>

        <button
          onClick={() => {
            console.log('🧪 Navigating to Audit');
            navigate('/audit');
          }}
          style={{
            padding: '10px 20px',
            backgroundColor: 'red',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Go to Audit (/audit)
        </button>
      </div>

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
        <h3>Test Instructions:</h3>
        <ol>
          <li>Open browser console (F12)</li>
          <li>Click the buttons above</li>
          <li>Check console for navigation messages</li>
          <li>Verify pages actually change</li>
        </ol>
      </div>
    </div>
  );
}


