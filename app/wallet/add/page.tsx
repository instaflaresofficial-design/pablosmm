"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useMemo, useState } from "react";

const page = () => {
  const [raw, setRaw] = useState<string>("");

  const formatted = useMemo(() => {
    if (!raw) return "";
    const n = Number(raw);
    return new Intl.NumberFormat("en-IN").format(n);
  }, [raw]);

  const press = (d: string) => {
    if (raw.length >= 7) return; // limit to keep layout intact
    if (raw === "0") return setRaw(d);
    setRaw((s) => (s || "") + d);
  };

  const back = () => setRaw((s) => s.slice(0, -1));
  const disabled = !raw || Number(raw) === 0;

  return (
    <div className="wallet-add-page">
      <Link href="/wallet" className="close-btn" aria-label="Close">
        ×
      </Link>

      <div className="header">
        <div className="avatar">
          <Image src="/wallet/user.png" alt="User" width={84} height={84} />
        </div>
        <h2 className="title">Swapnil&apos;s Wallet</h2>
        <p className="subtitle">ADD MONEY TO WALLET</p>
      </div>

      <div className="amount-display" role="button" aria-label="Amount">
        <span className="rupee">₹</span>
        <span className="amount">{formatted}</span>
        <span className={`caret ${raw ? "show" : ""}`} />
      </div>

      <button className="proceed" disabled={disabled}>
        Proceed to add money <span className="arrow">→</span>
      </button>

      <div className="keypad">
        {["1","2","3","4","5","6","7","8","9","", "0","⌫"].map((k, i) =>
          k === "" ? (
            <div key={i} className="key spacer" />
          ) : k === "⌫" ? (
            <button key={i} className="key erase" onClick={back} aria-label="Backspace">
              ⌫
            </button>
          ) : (
            <button key={i} className="key" onClick={() => press(k)}>{k}</button>
          )
        )}
      </div>
    </div>
  );
};

export default page;