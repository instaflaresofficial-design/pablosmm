"use client"
import React from 'react'

type Props = { userId: number }

export default function CreditButton({ userId }: Props) {
  async function handle() {
    const raw = prompt('Enter amount to credit (e.g. 10.50)')
    if (!raw) return
    const amt = Number(raw.replace(/[^0-9.\-]/g, ''))
    if (!Number.isFinite(amt) || Math.abs(amt) <= 0) return alert('Invalid amount')
    try {
      const res = await fetch('/api/admin/users/credit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, amount: amt }) })
      const j = await res.json()
      if (!res.ok) return alert('Error: ' + (j?.error || JSON.stringify(j)))
      alert('Success. New balance: $' + ((j.balance || 0) / 100).toFixed(2))
      // reload to show updated balance
      location.reload()
    } catch (e: any) {
      alert('Request failed: ' + String(e))
    }
  }

  return <button onClick={handle}>Add Balance</button>
}
