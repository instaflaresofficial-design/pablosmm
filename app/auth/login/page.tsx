"use client"
import React from 'react'
import { signIn } from 'next-auth/react'

export default function LoginPage() {
  return (
    <div style={{ padding: 24, zIndex: 100 }}>
      <h1>Sign in</h1>
      <p>Please sign in to continue.</p>
      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <button onClick={() => signIn('google')} style={{ padding: '8px 12px' }}>Sign in with Google</button>
        <button onClick={() => signIn()} style={{ padding: '8px 12px' }}>Other providers</button>
      </div>
    </div>
  )
}
