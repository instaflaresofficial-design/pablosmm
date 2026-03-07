"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { getApiBaseUrl } from "@/lib/config";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Clock, CheckCircle, Copy, Check } from "lucide-react";

export default function WalletAddPage() {
  const { user, loading, currencySymbol } = useAuth();
  const router = useRouter();

  // Steps: 'amount' | 'method' | 'pay' | 'success'
  const [step, setStep] = useState<'amount' | 'method' | 'pay' | 'success'>('amount');
  const [rawAmount, setRawAmount] = useState<string>("");
  const [method, setMethod] = useState<'UPI' | 'USDT' | null>(null);
  const [utr, setUtr] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // UPI Auto-verify: unique amount and UPI ID returned by backend
  const [uniqueAmount, setUniqueAmount] = useState<number | null>(null);
  const [upiId, setUpiId] = useState<string>("");
  const [requestId, setRequestId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [autoVerified, setAutoVerified] = useState(false);

  // Timer for QR Page
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes

  useEffect(() => {
    if (step === 'pay' && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [step, timeLeft]);

  // Poll for auto-verification status when on the pay step with UPI method
  useEffect(() => {
    if (step !== 'pay' || method !== 'UPI' || !requestId) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/wallet/deposit/status?id=${requestId}`, {
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'approved') {
            setAutoVerified(true);
            setStep('success');
            toast.success('Payment verified automatically!');
            clearInterval(pollInterval);
            setTimeout(() => router.push('/wallet?r=' + Date.now()), 2500);
          }
        }
      } catch {
        // ignore polling errors
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [step, method, requestId, router]);

  const formattedAmount = useMemo(() => {
    if (!rawAmount) return "";
    const n = Number(rawAmount);
    return new Intl.NumberFormat("en-IN").format(n);
  }, [rawAmount]);

  const formattedUniqueAmount = useMemo(() => {
    if (!uniqueAmount) return "";
    return uniqueAmount.toFixed(2);
  }, [uniqueAmount]);

  const handleKeyPress = (d: string) => {
    if (rawAmount.length >= 7) return;
    if (rawAmount === "0") return setRawAmount(d);
    setRawAmount((s) => (s || "") + d);
  };

  const handleBackspace = () => setRawAmount((s) => s.slice(0, -1));

  const handleMethodSelect = async (selectedMethod: 'UPI' | 'USDT') => {
    setMethod(selectedMethod);

    if (selectedMethod === 'UPI') {
      // Create deposit request and get unique amount from backend
      setIsSubmitting(true);
      try {
        const res = await fetch(`${getApiBaseUrl()}/wallet/deposit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: Number(rawAmount),
            method: "UPI",
            transaction_id: "" // UTR comes later or from auto-verify
          }),
          credentials: "include"
        });

        if (!res.ok) {
          const text = await res.text();
          let msg = "Failed to create deposit request";
          try { const j = JSON.parse(text); msg = j.error || msg; } catch { msg = text || msg; }
          throw new Error(msg);
        }

        const data = await res.json();
        if (data.unique_amount) setUniqueAmount(data.unique_amount);
        if (data.upi_id) setUpiId(data.upi_id);
        if (data.request_id) setRequestId(data.request_id);

        setStep('pay');
        setTimeLeft(300); // Reset timer
      } catch (error: any) {
        console.error(error);
        toast.error(error.message);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setStep('pay');
    }
  };

  const submitDeposit = async () => {
    if (!utr || !method || !rawAmount) return;
    setIsSubmitting(true);
    try {
      let res: Response;

      if (method === 'UPI' && requestId) {
        // UPI: update existing request with UTR (don't create a duplicate)
        res = await fetch(`${getApiBaseUrl()}/wallet/deposit/utr`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            request_id: requestId,
            transaction_id: utr
          }),
          credentials: "include"
        });
      } else {
        // USDT or fallback: create new deposit request
        res = await fetch(`${getApiBaseUrl()}/wallet/deposit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: Number(rawAmount),
            method: method,
            transaction_id: utr
          }),
          credentials: "include"
        });
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Submission failed");
      }

      setStep('success');
      toast.success("Deposit request submitted!");
      setTimeout(() => router.push('/wallet'), 2000);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyAmount = useCallback(() => {
    if (uniqueAmount) {
      navigator.clipboard.writeText(uniqueAmount.toFixed(2));
      setCopied(true);
      toast.success("Amount copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  }, [uniqueAmount]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) return null;

  return (
    <div className="wallet-add-page">
      {/* Header / Close */}
      {step === 'amount' ? (
        <Link href="/wallet" className="close-btn" aria-label="Close">×</Link>
      ) : (
        <button onClick={() => setStep(step === 'pay' ? 'method' : 'amount')}
          className="close-btn" style={{ fontSize: '1rem', width: 'auto', padding: '0 8px', border: 'none' }}>
          <ArrowLeft size={24} />
        </button>
      )}

      {/* STEP 1: AMOUNT - RESTORED ORIGINAL STRUCTURE */}
      {step === 'amount' && (
        <>
          <div className="header">
            <div className="avatar">
              <img
                src={user?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name || "User"}`}
                alt="User"
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
              />
            </div>
            <h2 className="title">{user?.name?.split(' ')[0]}&apos;s Wallet</h2>
            <p className="subtitle">ADD MONEY TO WALLET</p>
          </div>

          <div className="amount-display">
            <span className="rupee">{currencySymbol}</span>
            <span className="amount">{formattedAmount || "0"}</span>
            <span className={`caret ${rawAmount ? "show" : ""}`} />
          </div>

          <button
            className="proceed"
            disabled={!rawAmount || Number(rawAmount) <= 0}
            onClick={() => setStep('method')}
          >
            Proceed to add money <span className="arrow">→</span>
          </button>

          <div className="keypad">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"].map((k, i) =>
              k === "." ? (
                <div key={i} className="key spacer" />
              ) : k === "⌫" ? (
                <button key={i} className="key erase" onClick={handleBackspace} aria-label="Backspace">⌫</button>
              ) : (
                <button key={i} className="key" onClick={() => handleKeyPress(k)}>{k}</button>
              )
            )}
          </div>
        </>
      )}

      {/* STEP 2: METHOD SELECTION */}
      {step === 'method' && (
        <div style={{ padding: '0 16px', marginTop: '60px', width: '100%', maxWidth: '560px' }}>
          <h2 style={{ fontSize: '1.2rem', fontFamily: 'GB', marginBottom: '24px', textAlign: 'center' }}>Select Payment Method</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div onClick={() => handleMethodSelect('UPI')}
              style={{ background: '#1a1a1a', padding: '16px', borderRadius: '12px', border: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: isSubmitting ? 'wait' : 'pointer', opacity: isSubmitting ? 0.6 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Image src="/wallet/upi.png" width={40} height={40} alt="UPI" style={{ background: '#fff', borderRadius: '4px', padding: '2px' }} />
                <div>
                  <p style={{ fontFamily: 'GB', fontSize: '1rem', margin: 0 }}>UPI Payment</p>
                  <p style={{ fontFamily: 'GSB', fontSize: '0.75rem', color: '#888', margin: 0 }}>0% Fee • Auto-Verified</p>
                </div>
              </div>
              {isSubmitting && method === 'UPI' ? (
                <Loader2 size={20} className="animate-spin" style={{ color: '#888' }} />
              ) : (
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '1px solid #666' }}></div>
              )}
            </div>
            <div onClick={() => handleMethodSelect('USDT')}
              style={{ background: '#1a1a1a', padding: '16px', borderRadius: '12px', border: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Image src="/wallet/usdt.png" width={40} height={40} alt="USDT" style={{ background: '#fff', borderRadius: '4px', padding: '2px' }} />
                <div>
                  <p style={{ fontFamily: 'GB', fontSize: '1rem', margin: 0 }}>USDT (TRC20)</p>
                  <p style={{ fontFamily: 'GSB', fontSize: '0.75rem', color: '#888', margin: 0 }}>Network Fee Applies</p>
                </div>
              </div>
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '1px solid #666' }}></div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: PAY (UPI) */}
      {step === 'pay' && method === 'UPI' && (
        <div className="step-container" style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', overflowY: 'auto' }}>
          <button onClick={() => setStep('method')} style={{ position: 'absolute', top: '16px', left: '16px', background: 'none', border: 'none', color: '#888' }}><ArrowLeft size={24} /></button>

          <div style={{ textAlign: 'center', marginTop: '40px', marginBottom: '16px' }}>
            <p style={{ textTransform: 'uppercase', fontSize: '0.7rem', color: '#888', letterSpacing: '1px' }}>Pay Exactly</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '4px' }}>
              <h3 style={{ fontSize: '2.5rem', fontFamily: 'GB', margin: '4px 0' }}>
                ₹{formattedUniqueAmount || formattedAmount}
              </h3>
              <button onClick={copyAmount} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                {copied ? <Check size={18} color="#22c55e" /> : <Copy size={18} color="#888" />}
              </button>
            </div>
            {uniqueAmount && (
              <p style={{ fontSize: '0.75rem', color: '#eab308', marginTop: '4px' }}>
                ⚠️ Pay the exact amount shown above for auto-verification
              </p>
            )}
          </div>

          {/* UPI QR Code */}
          <div style={{ background: '#fff', padding: '12px', borderRadius: '12px', marginBottom: '16px' }}>
            {upiId ? (() => {
              const upiLink = `upi://pay?pa=${upiId}&pn=PabloSMM&am=${uniqueAmount || rawAmount}&cu=INR`;
              const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiLink)}`;
              return (
                <img
                  src={qrUrl}
                  alt="UPI QR Code"
                  width={200}
                  height={200}
                  style={{ display: 'block' }}
                />
              );
            })() : (
              <div style={{ width: '200px', height: '200px', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: '0.8rem', textAlign: 'center' }}>
                QR CODE FOR UPI
              </div>
            )}
          </div>

          {upiId && (
            <p style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '8px', textAlign: 'center' }}>
              UPI ID: <strong style={{ color: '#fff' }}>{upiId}</strong>
            </p>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#eab308', background: 'rgba(234, 179, 8, 0.1)', padding: '8px 16px', borderRadius: '20px', marginBottom: '16px', fontFamily: 'GB' }}>
            <Clock size={16} />
            <span>{formatTime(timeLeft)}</span>
          </div>

          {/* Auto-verify info */}
          <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', maxWidth: '400px', width: '100%' }}>
            <p style={{ fontSize: '0.8rem', color: '#22c55e', margin: 0, textAlign: 'center' }}>
              ✨ Payment will be auto-verified within 1-2 minutes
            </p>
          </div>

          <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '0.7rem', color: '#666', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Transaction ID / UTR (Optional — Auto-verified)</label>
              <input
                type="text"
                value={utr}
                onChange={(e) => setUtr(e.target.value)}
                placeholder="Enter 12-digit UTR (optional)"
                style={{ width: '100%', background: '#222', border: '1px solid #333', borderRadius: '12px', padding: '14px', color: '#fff', fontSize: '1rem', outline: 'none', textAlign: 'center' }}
              />
            </div>

            <button
              onClick={submitDeposit}
              disabled={!utr || isSubmitting}
              style={{ width: '100%', background: '#3b82f6', color: '#fff', height: '56px', borderRadius: '12px', border: 'none', fontFamily: 'GB', fontSize: '1rem', cursor: 'pointer', opacity: (!utr || isSubmitting) ? 0.5 : 1 }}
            >
              {isSubmitting ? "Submitting..." : "Submit UTR Manually"}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3b: PAY (USDT) — Same as before */}
      {step === 'pay' && method === 'USDT' && (
        <div className="step-container" style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
          <button onClick={() => setStep('method')} style={{ position: 'absolute', top: '16px', left: '16px', background: 'none', border: 'none', color: '#888' }}><ArrowLeft size={24} /></button>

          <div style={{ textAlign: 'center', marginTop: '40px', marginBottom: '24px' }}>
            <p style={{ textTransform: 'uppercase', fontSize: '0.7rem', color: '#888', letterSpacing: '1px' }}>Total Payable</p>
            <h3 style={{ fontSize: '2.5rem', fontFamily: 'GB', margin: '4px 0' }}>{currencySymbol}{formattedAmount}</h3>
            <p style={{ fontSize: '0.8rem', color: '#eab308' }}>1 USD ≈ {currencySymbol}92</p>
          </div>

          <div style={{ background: '#fff', padding: '12px', borderRadius: '12px', marginBottom: '24px' }}>
            <div style={{ width: '200px', height: '200px', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: '0.8rem', textAlign: 'center' }}>
              QR CODE FOR<br />USDT
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#eab308', background: 'rgba(234, 179, 8, 0.1)', padding: '8px 16px', borderRadius: '20px', marginBottom: '32px', fontFamily: 'GB' }}>
            <Clock size={16} />
            <span>{formatTime(timeLeft)}</span>
          </div>

          <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '0.7rem', color: '#666', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Transaction ID / UTR</label>
              <input
                type="text"
                value={utr}
                onChange={(e) => setUtr(e.target.value)}
                placeholder="Enter 12-digit UTR"
                style={{ width: '100%', background: '#222', border: '1px solid #333', borderRadius: '12px', padding: '14px', color: '#fff', fontSize: '1rem', outline: 'none', textAlign: 'center' }}
              />
            </div>

            <button
              onClick={submitDeposit}
              disabled={!utr || isSubmitting}
              style={{ width: '100%', background: '#3b82f6', color: '#fff', height: '56px', borderRadius: '12px', border: 'none', fontFamily: 'GB', fontSize: '1rem', cursor: 'pointer', opacity: (!utr || isSubmitting) ? 0.5 : 1 }}
            >
              {isSubmitting ? "Submitting..." : "Submit Payment"}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: SUCCESS */}
      {step === 'success' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', background: 'rgba(34, 197, 94, 0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
            <CheckCircle className="text-green-500" size={40} color="#22c55e" />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontFamily: 'GB', marginBottom: '8px' }}>
            {autoVerified ? "Payment Verified! ✅" : "Request Submitted"}
          </h2>
          <p style={{ color: '#888', maxWidth: '280px', marginBottom: '32px', lineHeight: '1.5' }}>
            {autoVerified ? (
              <>Your deposit of <strong>{currencySymbol}{formattedAmount}</strong> has been verified and added to your wallet.</>
            ) : (
              <>Your deposit of <strong>{currencySymbol}{formattedAmount}</strong> is under review. Your wallet will be credited within 1-2 minutes.</>
            )}
          </p>
          <Link href="/wallet" style={{ background: '#222', color: '#fff', padding: '16px 32px', borderRadius: '100px', textDecoration: 'none', fontFamily: 'GB' }}>
            Back to Wallet
          </Link>
        </div>
      )}
    </div>
  );
}