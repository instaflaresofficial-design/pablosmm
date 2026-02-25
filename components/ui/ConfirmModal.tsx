"use client";
import React from "react";
import ReactModal from "react-modal";
import { useEffect } from "react";

type Props = {
  open: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

// Call setAppElement when the component mounts on the client.
// This avoids calling it during module evaluation where `#\_\_next` may not exist.

export default function ConfirmModal({
  open,
  title = "Confirm",
  message = "",
  confirmLabel = "Confirm",
  onConfirm,
  onCancel,
}: Props) {
  // ensure app element is set for accessibility
  React.useEffect(() => {
    try {
      const root = document.getElementById("__next") || document.body;
      ReactModal.setAppElement(root);
    } catch (e) {
      // fall back silently
    }
  }, []);
  return (
    <ReactModal
      isOpen={open}
      onRequestClose={onCancel}
      overlayClassName="rm-overlay"
      className="rm-content"
      closeTimeoutMS={180}
    >
      <div role="dialog" aria-modal="true" className="modal-inner">
        <h3 className="modal-title">{title}</h3>
        <div className="modal-message">{message}</div>
        <div className="modal-actions">
          <button onClick={onCancel} className="btn-modal-cancel">Cancel</button>
          <button onClick={onConfirm} className="btn-modal-confirm">{confirmLabel}</button>
        </div>
      </div>
      <style jsx global>{`
        .rm-overlay {
          position: fixed; inset: 0;
          background: rgba(4,4,5,0.8);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display:flex; align-items:center; justify-content:center;
          z-index: 99999;
        }
        .rm-content {
          background: #0f0f13;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 24px;
          min-width: 320px;
          max-width: 90vw;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
          outline: none;
        }
        .modal-inner {
          display: flex;
          flex-direction: column;
        }
        .modal-title {
          font-family: 'GB', sans-serif;
          font-size: 1.2rem;
          color: #fff;
          margin: 0 0 8px 0;
        }
        .modal-message {
          font-family: 'GM', sans-serif;
          font-size: 0.95rem;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 24px;
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }
        .btn-modal-cancel {
          background: transparent;
          border: 1px solid rgba(255,255,255,0.15);
          color: #fff;
          border-radius: 8px;
          padding: 0 16px;
          height: 40px;
          font-family: 'GSB', sans-serif;
          font-size: 0.95rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        .btn-modal-cancel:hover {
          background: rgba(255,255,255,0.05);
        }
        .btn-modal-confirm {
          color: rgba(0, 0, 0, 0.8);
          cursor: pointer;
          background-image: url(/bg.png);
          background-position-y: center;
          background-repeat: no-repeat;
          background-size: cover;
          border: none;
          border-radius: 8px;
          padding: 0 24px;
          height: 40px;
          font-family: 'GB', sans-serif;
          font-size: 1rem;
          letter-spacing: -0.2px;
          transition: opacity 0.2s;
        }
        .btn-modal-confirm:hover {
          opacity: 0.9;
        }
      `}</style>
    </ReactModal>
  );
}
