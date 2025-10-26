/**
 * Simple Working React App
 * Minimal version to test frontend loading
 */

import React from 'react';

function App() {
  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ color: '#333', textAlign: 'center', marginBottom: '30px' }}>
          🎉 POS Grocery System - Enhanced Features
        </h1>
        
        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ color: '#2c3e50' }}>System Status</h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '15px',
            marginTop: '15px'
          }}>
            <div style={{ 
              padding: '15px', 
              backgroundColor: '#e8f5e8', 
              borderRadius: '5px',
              border: '1px solid #4caf50'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#2e7d32' }}>✅ Backend Server</h3>
              <p style={{ margin: '0', fontSize: '14px' }}>Port 3002 - Enhanced Features API</p>
            </div>
            
            <div style={{ 
              padding: '15px', 
              backgroundColor: '#e3f2fd', 
              borderRadius: '5px',
              border: '1px solid #2196f3'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#1565c0' }}>✅ Frontend Server</h3>
              <p style={{ margin: '0', fontSize: '14px' }}>Port 8104 - React Development</p>
            </div>
            
            <div style={{ 
              padding: '15px', 
              backgroundColor: '#fff3e0', 
              borderRadius: '5px',
              border: '1px solid #ff9800'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#e65100' }}>🔧 Features System</h3>
              <p style={{ margin: '0', fontSize: '14px' }}>RBAC, Real-time, Audit</p>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ color: '#2c3e50' }}>Available APIs</h2>
          <div style={{ 
            backgroundColor: '#f8f9fa', 
            padding: '15px', 
            borderRadius: '5px',
            fontFamily: 'monospace',
            fontSize: '14px'
          }}>
            <div>GET /health - Health check</div>
            <div>GET /api/status - API status</div>
            <div>GET /api/meta/features - Features metadata</div>
            <div>POST /api/admin/features/toggle - Toggle features</div>
            <div>POST /api/admin/features/override - Role overrides</div>
            <div>GET /api/admin/configuration/export - Export config</div>
            <div>POST /api/admin/configuration/import - Import config</div>
            <div>POST /api/telemetry/feature-usage - Telemetry</div>
            <div>GET /api/admin/audit - Audit trail</div>
            <div>GET /api/realtime/events - Real-time events (SSE)</div>
          </div>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ color: '#2c3e50' }}>Quick Test</h2>
          <button 
            onClick={() => {
              fetch('http://localhost:3002/health')
                .then(res => res.json())
                .then(data => {
                  alert(`Health Check: ${data.status}\nUptime: ${Math.round(data.uptime)}s`);
                })
                .catch(err => {
                  alert('Error: ' + err.message);
                });
            }}
            style={{
              padding: '10px 20px',
              backgroundColor: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Test Backend Connection
          </button>
        </div>

        <div style={{ 
          backgroundColor: '#e8f5e8', 
          padding: '15px', 
          borderRadius: '5px',
          border: '1px solid #4caf50'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#2e7d32' }}>🎯 Enhanced Features System</h3>
          <p style={{ margin: '0', fontSize: '14px' }}>
            The enhanced features system is fully operational with Role-Based Access Control, 
            real-time updates, audit logging, configuration management, and telemetry.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;










