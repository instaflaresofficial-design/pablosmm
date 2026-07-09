'use client';

import { useEffect, useState } from 'react';

interface DebugLog {
  time: string;
  message: string;
  type: 'info' | 'error' | 'success';
}

export function MobileDebugger() {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Intercept console.log, console.error
    const originalLog = console.log;
    const originalError = console.error;

    console.log = (...args: any[]) => {
      const message = args.map(arg => {
        if (typeof arg === 'object' && arg !== null) {
          try {
            return JSON.stringify(arg, null, 2);
          } catch (e) {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');
      
      if (message.includes('[AuthProvider]') || message.includes('[getApiBaseUrl]')) {
        setLogs(prev => [...prev.slice(-20), {
          time: new Date().toLocaleTimeString(),
          message,
          type: 'info'
        }]);
      }
      originalLog.apply(console, args);
    };

    console.error = (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      if (message.includes('[AuthProvider]')) {
        setLogs(prev => [...prev.slice(-20), {
          time: new Date().toLocaleTimeString(),
          message,
          type: 'error'
        }]);
      }
      originalError.apply(console, args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
    };
  }, []);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 9999,
          background: '#3b82f6',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          border: 'none',
          fontSize: '14px',
          fontWeight: 'bold',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}
      >
        🐛 Debug ({logs.length})
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      maxHeight: '50vh',
      background: '#1e293b',
      color: '#e2e8f0',
      zIndex: 9999,
      overflow: 'auto',
      fontFamily: 'monospace',
      fontSize: '11px',
      borderTop: '2px solid #3b82f6'
    }}>
      <div style={{
        padding: '10px',
        background: '#0f172a',
        borderBottom: '1px solid #334155',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0
      }}>
        <strong>🐛 Mobile Debugger</strong>
        <button
          onClick={() => setLogs([])}
          style={{
            background: '#dc2626',
            color: 'white',
            border: 'none',
            padding: '4px 8px',
            borderRadius: '4px',
            marginRight: '8px',
            fontSize: '11px'
          }}
        >
          Clear
        </button>
        <button
          onClick={() => setIsVisible(false)}
          style={{
            background: '#6366f1',
            color: 'white',
            border: 'none',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '11px'
          }}
        >
          Hide
        </button>
      </div>
      <div style={{ padding: '10px' }}>
        {logs.length === 0 ? (
          <p style={{ color: '#94a3b8', textAlign: 'center', margin: '20px 0' }}>
            No logs yet. Try logging in...
          </p>
        ) : (
          logs.map((log, i) => (
            <div
              key={i}
              style={{
                marginBottom: '8px',
                padding: '8px',
                background: log.type === 'error' ? '#7f1d1d' : '#1e3a5f',
                borderRadius: '4px',
                borderLeft: `3px solid ${log.type === 'error' ? '#ef4444' : '#3b82f6'}`
              }}
            >
              <div style={{ color: '#94a3b8', fontSize: '10px', marginBottom: '4px' }}>
                {log.time}
              </div>
              <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {log.message}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
