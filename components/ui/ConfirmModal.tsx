"use client"
import React from 'react'
import ReactModal from 'react-modal'
import { useEffect } from 'react'

type Props = {
  open: boolean
  title?: string
  message?: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

// Call setAppElement when the component mounts on the client.
// This avoids calling it during module evaluation where `#\_\_next` may not exist.

export default function ConfirmModal({ open, title = 'Confirm', message = '', confirmLabel = 'Confirm', onConfirm, onCancel }: Props) {
  // ensure app element is set for accessibility
  React.useEffect(() => {
    try {
      const root = document.getElementById('__next') || document.body
      ReactModal.setAppElement(root)
    } catch (e) {
      // fall back silently
    }
  }, [])
  return (
    <ReactModal
      isOpen={open}
      onRequestClose={onCancel}
      overlayClassName="rm-overlay"
      className="rm-content"
      closeTimeoutMS={180}
    >
      <div role="dialog" aria-modal="true">
        <h3 style={{ margin: 0, marginBottom: 8 }}>{title}</h3>
        <div style={{ marginBottom: 16 }}>{message}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onCancel} style={{ padding: '8px 12px', background: 'transparent', border: '1px solid #ddd', borderRadius: 6 }}>Cancel</button>
          <button onClick={onConfirm} style={{ padding: '8px 12px', background: '#111827', color: '#fff', border: 'none', borderRadius: 6 }}>{confirmLabel}</button>
        </div>
      </div>
      <style jsx global>{`
        .rm-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display:flex; align-items:center; justify-content:center; z-index:10000; }
        .rm-content { background: white; border-radius:8px; padding:20px; min-width:320px; box-shadow:0 10px 30px rgba(0,0,0,0.3); outline:none; }
      `}</style>
    </ReactModal>
  )
}
