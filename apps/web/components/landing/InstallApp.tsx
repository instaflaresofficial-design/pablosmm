"use client";
import React, { useRef, useEffect, useState } from 'react';
import Image from 'next/image';

// Extend window with the PWA install prompt event
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallApp = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  // PWA state
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Detect platform
    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua);
    const android = /android/i.test(ua);
    setIsIOS(ios);
    setIsAndroid(android);

    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
    }

    // Capture the Android install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Listen for successful install
    window.addEventListener('appinstalled', () => setInstalled(true));

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const handleAndroid = async () => {
    if (deferredPrompt.current) {
      await deferredPrompt.current.prompt();
      const { outcome } = await deferredPrompt.current.userChoice;
      if (outcome === 'accepted') setInstalled(true);
      deferredPrompt.current = null;
    } else {
      // Fallback if the prompt isn't available (e.g. not meeting PWA criteria yet or already installed)
      alert("To install, tap the 3-dots menu in your browser and select 'Add to Home screen' or 'Install app'.");
    }
  };

  const handleIOS = () => {
    setShowIOSModal(true);
  };

  return (
    <div ref={sectionRef} className="install-section">

      {/* Download card with corner brackets */}
      <div className={`install-card-wrap${visible ? ' is-visible' : ''}`}>
        {/* Corner brackets */}
        <span className="corner tl" />
        <span className="corner tr" />
        <span className="corner bl" />
        <span className="corner br" />

        <div className="install-card">
          {/* QR Code */}
          <div className="qr-wrap">
            <Image
              src="/landing/install/qr.png"
              alt="Scan to install Pablo"
              width={160}
              height={160}
              className="qr-img"
            />
          </div>

          {/* Download buttons */}
          <div className="install-btns">
            {/* Android button */}
            {!isIOS && (
              installed ? (
                <div className="install-badge installed-badge">
                  ✓ Installed
                </div>
              ) : (
                <button
                  onClick={handleAndroid}
                  id="install-android-btn"
                  className="install-badge-btn"
                  aria-label="Install on Android"
                >
                  <Image
                    src="/landing/install/android.png"
                    alt="Get it on Google Play"
                    width={200}
                    height={60}
                    className="install-badge"
                  />
                </button>
              )
            )}

            {/* iOS button */}
            {!isAndroid && (
              <button
                onClick={handleIOS}
                id="install-ios-btn"
                className="install-badge-btn"
                aria-label="Install on iPhone"
              >
                <Image
                  src="/landing/install/apple.png"
                  alt="Download on the App Store"
                  width={200}
                  height={60}
                  className="install-badge"
                />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sticky bottom label */}
      <div className="install-bottom-label">
        <span>DOWNLOAD</span>
        <span className="install-icon-sm" aria-hidden="true">
          <span className="bar" /><span className="bar" /><span className="bar" /><span className="bar" /><span className="bar" />
        </span>
        <span>THE APP</span>
      </div>

      {/* iOS instruction modal */}
      {showIOSModal && (
        <div className="ios-modal-overlay" onClick={() => setShowIOSModal(false)}>
          <div className="ios-modal" onClick={e => e.stopPropagation()}>
            <button className="ios-modal-close" onClick={() => setShowIOSModal(false)} aria-label="Close">✕</button>
            <p className="ios-modal-title">Add to Home Screen</p>
            <ol className="ios-modal-steps">
              <li>
                Tap the{' '}
                <span className="ios-modal-icon" aria-label="Share">
                  {/* iOS share icon */}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                    <polyline points="16 6 12 2 8 6"/>
                    <line x1="12" y1="2" x2="12" y2="15"/>
                  </svg>
                </span>{' '}
                <strong>Share</strong> button in Safari or Chrome
              </li>
              <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
              <li>Tap <strong>"Add"</strong> in the top right</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstallApp;
