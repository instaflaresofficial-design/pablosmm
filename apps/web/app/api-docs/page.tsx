"use client";

import React, { useState } from 'react';
import Link from 'next/link';

export default function ApiDocsPage() {
    const [copied, setCopied] = useState(false);
    
    // Fallback if window is undefined on server
    const apiURL = typeof window !== 'undefined' ? `${window.location.origin}/api/v2` : 'https://YOUR_DOMAIN/api/v2';

    const handleCopy = () => {
        if (typeof window !== 'undefined') {
            navigator.clipboard.writeText(apiURL);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '24px', color: '#111827' }}>
                API Docs 
                <span style={{ marginLeft: '12px', fontSize: '14px', backgroundColor: '#fef3c7', color: '#d97706', padding: '4px 10px', borderRadius: '4px', verticalAlign: 'middle' }}>POST</span>
            </h1>

            <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '32px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '15px' }}>
                    <tbody>
                        <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <th style={{ padding: '16px 0', width: '25%', fontWeight: 600, color: '#4b5563' }}>HTTP Method</th>
                            <td style={{ padding: '16px 0' }}>POST</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <th style={{ padding: '16px 0', fontWeight: 600, color: '#4b5563' }}>API URL</th>
                            <td style={{ padding: '16px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <code style={{ backgroundColor: '#f3f4f6', padding: '6px 12px', borderRadius: '6px', color: '#ef4444' }}>{apiURL}</code>
                                <button 
                                    onClick={handleCopy}
                                    style={{ backgroundColor: copied ? '#10b981' : '#3b82f6', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', transition: 'background-color 0.2s' }}
                                >
                                    {copied ? 'Copied!' : 'Copy'}
                                </button>
                            </td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <th style={{ padding: '16px 0', fontWeight: 600, color: '#4b5563' }}>API Key</th>
                            <td style={{ padding: '16px 0', color: '#3b82f6' }}>
                                Get an API key on the <Link href="/profile" style={{ textDecoration: 'underline' }}>Account page</Link>
                            </td>
                        </tr>
                        <tr>
                            <th style={{ padding: '16px 0', fontWeight: 600, color: '#4b5563' }}>Response format</th>
                            <td style={{ padding: '16px 0' }}>
                                <span style={{ backgroundColor: '#dbeafe', color: '#1d4ed8', padding: '4px 10px', borderRadius: '16px', fontSize: '12px', fontWeight: 500 }}>JSON</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* ENDPOINT: ADD ORDER */}
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
                <div style={{ backgroundColor: '#f9fafb', padding: '16px 24px', borderBottom: '1px solid #e5e7eb', fontSize: '18px', fontWeight: 600, color: '#111827' }}>
                    <span style={{ color: '#ef4444', marginRight: '8px' }}>●</span> Add order
                </div>
                <div style={{ padding: '0' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '15px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <th style={{ padding: '16px 24px', color: '#6b7280', fontWeight: 500 }}>Parameters</th>
                                <th style={{ padding: '16px 24px', color: '#6b7280', fontWeight: 500 }}>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '16px 24px', color: '#374151', fontFamily: 'monospace' }}>key</td>
                                <td style={{ padding: '16px 24px', color: '#6b7280' }}>Your API key</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '16px 24px', color: '#374151', fontFamily: 'monospace' }}>action</td>
                                <td style={{ padding: '16px 24px', color: '#6b7280' }}><code>add</code></td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '16px 24px', color: '#374151', fontFamily: 'monospace' }}>service</td>
                                <td style={{ padding: '16px 24px', color: '#6b7280' }}>Service ID</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '16px 24px', color: '#374151', fontFamily: 'monospace' }}>link</td>
                                <td style={{ padding: '16px 24px', color: '#6b7280' }}>Link to page</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '16px 24px', color: '#374151', fontFamily: 'monospace' }}>quantity</td>
                                <td style={{ padding: '16px 24px', color: '#6b7280' }}>Needed quantity</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ENDPOINT: ORDER STATUS */}
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
                <div style={{ backgroundColor: '#f9fafb', padding: '16px 24px', borderBottom: '1px solid #e5e7eb', fontSize: '18px', fontWeight: 600, color: '#111827' }}>
                    <span style={{ color: '#ef4444', marginRight: '8px' }}>●</span> Order status
                </div>
                <div style={{ padding: '0' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '15px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <th style={{ padding: '16px 24px', color: '#6b7280', fontWeight: 500 }}>Parameters</th>
                                <th style={{ padding: '16px 24px', color: '#6b7280', fontWeight: 500 }}>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '16px 24px', color: '#374151', fontFamily: 'monospace' }}>key</td>
                                <td style={{ padding: '16px 24px', color: '#6b7280' }}>Your API key</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '16px 24px', color: '#374151', fontFamily: 'monospace' }}>action</td>
                                <td style={{ padding: '16px 24px', color: '#6b7280' }}><code>status</code></td>
                            </tr>
                            <tr>
                                <td style={{ padding: '16px 24px', color: '#374151', fontFamily: 'monospace' }}>order</td>
                                <td style={{ padding: '16px 24px', color: '#6b7280' }}>Order ID</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ENDPOINT: USER BALANCE */}
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
                <div style={{ backgroundColor: '#f9fafb', padding: '16px 24px', borderBottom: '1px solid #e5e7eb', fontSize: '18px', fontWeight: 600, color: '#111827' }}>
                    <span style={{ color: '#ef4444', marginRight: '8px' }}>●</span> User balance
                </div>
                <div style={{ padding: '0' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '15px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <th style={{ padding: '16px 24px', color: '#6b7280', fontWeight: 500 }}>Parameters</th>
                                <th style={{ padding: '16px 24px', color: '#6b7280', fontWeight: 500 }}>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '16px 24px', color: '#374151', fontFamily: 'monospace' }}>key</td>
                                <td style={{ padding: '16px 24px', color: '#6b7280' }}>Your API key</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '16px 24px', color: '#374151', fontFamily: 'monospace' }}>action</td>
                                <td style={{ padding: '16px 24px', color: '#6b7280' }}><code>balance</code></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ENDPOINT: SERVICES LIST */}
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
                <div style={{ backgroundColor: '#f9fafb', padding: '16px 24px', borderBottom: '1px solid #e5e7eb', fontSize: '18px', fontWeight: 600, color: '#111827' }}>
                    <span style={{ color: '#ef4444', marginRight: '8px' }}>●</span> Services list
                </div>
                <div style={{ padding: '0' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '15px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <th style={{ padding: '16px 24px', color: '#6b7280', fontWeight: 500 }}>Parameters</th>
                                <th style={{ padding: '16px 24px', color: '#6b7280', fontWeight: 500 }}>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '16px 24px', color: '#374151', fontFamily: 'monospace' }}>key</td>
                                <td style={{ padding: '16px 24px', color: '#6b7280' }}>Your API key</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '16px 24px', color: '#374151', fontFamily: 'monospace' }}>action</td>
                                <td style={{ padding: '16px 24px', color: '#6b7280' }}><code>services</code></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}
