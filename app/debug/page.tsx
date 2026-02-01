export default function DebugPage() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'NOT SET';

    return (
        <div style={{ padding: '20px', fontFamily: 'monospace' }}>
            <h1>Debug Info</h1>
            <p><strong>NEXT_PUBLIC_API_URL:</strong> {apiUrl}</p>
            <p><strong>Expected:</strong> https://pablosmm.onrender.com/api</p>
            <p><strong>Google Login URL:</strong> {apiUrl}/auth/google/login</p>
            <button onClick={() => window.location.href = `${apiUrl}/auth/google/login`}>
                Test Google Login
            </button>
        </div>
    );
}
