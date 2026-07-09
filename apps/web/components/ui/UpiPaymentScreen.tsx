import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Check, Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type PaymentPhase = 'idle' | 'processing' | 'utr-input' | 'success' | 'failed';

interface UpiPaymentScreenProps {
  timeLeft: number;
  formattedAmount: string;
  formattedUniqueAmount?: string;
  rawAmount: string;
  uniqueAmount: number | null;
  upiId: string;
  requestId: number | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (utr?: string) => void;
  /** Called from parent when polling detects auto-verification */
  autoVerified?: boolean;
}

const UpiPaymentScreen: React.FC<UpiPaymentScreenProps> = ({
  timeLeft,
  formattedAmount,
  formattedUniqueAmount,
  rawAmount,
  uniqueAmount,
  upiId,
  requestId,
  isSubmitting,
  onClose,
  onSubmit,
  autoVerified,
}) => {
  const [copied, setCopied] = useState(false);
  const [phase, setPhase] = useState<PaymentPhase>('idle');
  const [utr, setUtr] = useState('');
  const [utrError, setUtrError] = useState('');
  const processingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayAmount = formattedUniqueAmount || formattedAmount;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const copyUpiId = useCallback(() => {
    if (upiId) {
      navigator.clipboard.writeText(upiId);
      setCopied(true);
      toast.success("UPI ID copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  }, [upiId]);

  // Build UPI intent link
  const getUpiLink = useCallback(() => {
    const amount = uniqueAmount || rawAmount;
    return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent('PabloSMM')}&am=${amount}&cu=INR`;
  }, [upiId, uniqueAmount, rawAmount]);

  const handleAppClick = useCallback((app: 'phonepe' | 'gpay' | 'paytm') => {
    const amount = uniqueAmount || rawAmount;
    const pa = encodeURIComponent(upiId);
    const pn = encodeURIComponent('PabloSMM');

    let intentUrl = '';
    switch (app) {
      case 'phonepe':
        intentUrl = `phonepe://pay?pa=${pa}&pn=${pn}&am=${amount}&cu=INR`;
        break;
      case 'gpay':
        intentUrl = `tez://upi/pay?pa=${pa}&pn=${pn}&am=${amount}&cu=INR`;
        break;
      case 'paytm':
        intentUrl = `paytmmp://pay?pa=${pa}&pn=${pn}&am=${amount}&cu=INR`;
        break;
    }

    // Try opening the intent. On desktop this will fail silently.
    const link = document.createElement('a');
    link.href = intentUrl;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Fallback: if on desktop or app not installed, try generic upi:// intent after a short delay
    setTimeout(() => {
      window.location.href = getUpiLink();
    }, 1500);
  }, [upiId, uniqueAmount, rawAmount, getUpiLink]);

  // When "I have paid" is clicked
  const handleIHavePaid = useCallback(() => {
    setPhase('processing');
    // Submit immediately (sends "Paid" as UTR for now)
    onSubmit();
    // After 15 seconds if not auto-verified, show UTR input
    processingTimerRef.current = setTimeout(() => {
      setPhase('utr-input');
    }, 15000);
  }, [onSubmit]);

  // If auto-verified from parent, jump to success
  useEffect(() => {
    if (autoVerified) {
      if (processingTimerRef.current) clearTimeout(processingTimerRef.current);
      setPhase('success');
    }
  }, [autoVerified]);

  // Timer expired
  useEffect(() => {
    if (timeLeft <= 0 && phase === 'idle') {
      setPhase('success');
    }
  }, [timeLeft, phase]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (processingTimerRef.current) clearTimeout(processingTimerRef.current);
    };
  }, []);

  const handleUtrSubmit = useCallback(() => {
    if (!utr.trim()) {
      setUtrError('Please enter your UTR / Reference ID');
      return;
    }
    setUtrError('');
    onSubmit(utr.trim());
    setPhase('success');
  }, [utr, onSubmit]);

  return (
    <div className="upi-payment-screen">
      {/* Header */}
      <div className="upi-header">
        <button onClick={onClose} className="back-btn">
          <Image src="/payment-methods/upi/back.png" alt="Back" width={26} height={26} />
        </button>
      </div>

      <div className="upi-content">
        {/* Timer Badge */}
        <div className="upi-timer">
          Pay within {formatTime(timeLeft)}
        </div>

        {/* Amount */}
        <h3 className="upi-amount">
          ₹{displayAmount}
        </h3>
        <p className="upi-subtitle">Scan using any UPI app</p>

        {/* UPI ID Box */}
        <div className="upi-id-box">
          <span className="upi-id-text">{upiId || 'pablosmm@upi'}</span>
          <button onClick={copyUpiId} className="upi-copy-btn">
            {copied ? <Check size={14} color="#22c55e" /> : <Copy size={14} />}
            Copy
          </button>
        </div>

        {/* QR Code */}
        <div className="upi-qr-container">
          {upiId ? (() => {
            const upiLink = getUpiLink();
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiLink)}&margin=0`;
            return (
              <img
                src={qrUrl}
                alt="UPI QR Code"
                width={240}
                height={240}
                className="qr-image"
              />
            );
          })() : (
            <div className="qr-placeholder">
              QR CODE
            </div>
          )}
        </div>

        {/* Divider OR */}
        <div className="upi-divider">
          <div className="line"></div>
          <span>OR</span>
          <div className="line"></div>
        </div>

        <p className="upi-direct-text">Pay directly using</p>

        {/* App Icons */}
        <div className="upi-app-icons">
          <div className="app-icon-circle" onClick={() => handleAppClick('phonepe')}>
            <Image src="/payment-methods/platforms/phonepe.png" alt="PhonePe" width={32} height={32} style={{ objectFit: 'contain' }} />
          </div>
          <div className="app-icon-circle" onClick={() => handleAppClick('gpay')}>
            <Image src="/payment-methods/platforms/gpay.png" alt="GPay" width={32} height={32} style={{ objectFit: 'contain' }} />
          </div>
          <div className="app-icon-circle" onClick={() => handleAppClick('paytm')}>
            <Image src="/payment-methods/platforms/paytm.png" alt="Paytm" width={40} height={40} style={{ objectFit: 'contain' }} />
          </div>
        </div>
      </div>

      {/* Bottom Fixed Container */}
      <div className="upi-bottom-container">
        <p className="upi-tap-text">Tap after completing payment</p>

        <button
          onClick={handleIHavePaid}
          disabled={isSubmitting || phase !== 'idle'}
          className="upi-submit-btn"
        >
          {isSubmitting ? "Submitting..." : "I have paid"}
        </button>
      </div>

      {/* ═══════ OVERLAY STATES ═══════ */}

      {/* Glass overlay (shown during processing, utr-input, success, failed) */}
      {phase !== 'idle' && (
        <div className="upi-glass-overlay active" />
      )}

      {/* Processing Drawer */}
      {phase === 'processing' && (
        <div className="upi-drawer upi-drawer-processing">
          <div className="drawer-handle" />
          <div className="drawer-icon">
            <Image src="/payment-methods/verify.png" alt="" width={48} height={48} style={{ filter: 'hue-rotate(30deg) brightness(1.5)', animation: 'upi-pulse 1.5s ease-in-out infinite' }} />
          </div>
          <h3 className="drawer-title">Processing payment...</h3>
          <p className="drawer-subtitle">Please complete the payment in your UPI app</p>
          <div className="drawer-dots">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
          </div>
        </div>
      )}

      {/* UTR Input Drawer */}
      {phase === 'utr-input' && (
        <div className="upi-drawer upi-drawer-utr">
          <div className="drawer-handle" />
          <div className="drawer-icon-warning">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 9v4m0 4h.01M12 2L2 20h20L12 2z" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3 className="drawer-title">Payment not detected</h3>
          <p className="drawer-subtitle">Enter your UTR / Reference ID to verify manually</p>
          <div className="utr-input-group">
            <input
              type="text"
              value={utr}
              onChange={(e) => { setUtr(e.target.value); setUtrError(''); }}
              placeholder="Enter 12-digit UTR / Ref ID"
              className="utr-input"
              maxLength={22}
            />
            {utrError && <span className="utr-error">{utrError}</span>}
          </div>
          <button
            onClick={handleUtrSubmit}
            disabled={isSubmitting}
            className="utr-submit-btn"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Verify Payment'}
          </button>
          <button onClick={() => setPhase('idle')} className="utr-cancel-btn">
            Go back
          </button>
        </div>
      )}

      {/* Success Screen */}
      {phase === 'success' && (
        <div className="upi-result-screen upi-success-screen">
          <div className="result-badge success-badge">Payment Successful</div>
          <div className="result-icon-container success-glow">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="result-amount">₹{displayAmount}</h2>
          <p className="result-subtitle">Payment received successfully</p>

          <div className="result-info-cards">
            <div className="result-info-card">
              <div className="info-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="6" width="20" height="14" rx="3" stroke="#6b7280" strokeWidth="2"/>
                  <path d="M2 10h20" stroke="#6b7280" strokeWidth="2"/>
                </svg>
              </div>
              <span className="info-text">Amount added to wallet</span>
              <span className="info-amount">₹{displayAmount}</span>
            </div>
            <div className="result-info-card check-card">
              <div className="info-icon-check">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="info-text">Your transaction is secure and complete.</span>
            </div>
          </div>

          <div className="result-actions">
            <Link href="/wallet" className="result-btn result-btn-primary">
              Go to Wallet
            </Link>
            <Link href="/wallet" className="result-btn result-btn-secondary">
              View Transactions
            </Link>
          </div>
        </div>
      )}

      {/* Failed Screen */}
      {phase === 'failed' && (
        <div className="upi-result-screen upi-failed-screen">
          <div className="result-badge failed-badge">Payment Failed</div>
          <div className="result-icon-container failed-glow">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="result-amount">₹{displayAmount}</h2>
          <p className="result-subtitle">Payment could not be completed</p>

          <div className="result-info-cards">
            <div className="result-info-card">
              <div className="info-icon-warning">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 9v4m0 4h.01M12 2L2 20h20L12 2z" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="info-text">Session expired or payment was not received. If money was debited, it will be refunded in 24-48 hours.</span>
            </div>
          </div>

          <div className="result-actions">
            <button onClick={() => { setPhase('utr-input'); }} className="result-btn result-btn-primary">
              Enter UTR Manually
            </button>
            <button onClick={onClose} className="result-btn result-btn-secondary">
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UpiPaymentScreen;
