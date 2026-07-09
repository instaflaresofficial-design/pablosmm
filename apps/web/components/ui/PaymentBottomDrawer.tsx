import React, { useState } from 'react' // force HMR
import Image from 'next/image'
import { Loader2 } from 'lucide-react'

interface PaymentBottomDrawerProps {
  onPay: (method: 'UPI' | 'USDT') => void;
  isSubmitting: boolean;
  onClose: () => void;
}

const PaymentBottomDrawer = ({ onPay, isSubmitting, onClose }: PaymentBottomDrawerProps) => {
  const [selected, setSelected] = useState<'UPI' | 'USDT' | null>(null);

  return (
    <div className='payment-bottom-drawer-overlay' onClick={onClose}>
      <div className='payment-bottom-drawer' onClick={(e) => e.stopPropagation()}>
        <div className="label">
            <p>Select Payment Method</p>
        </div>
        <div className="payment-options">
            <div 
              className={`payment-method upi ${selected === 'UPI' ? 'selected' : ''}`}
              onClick={() => setSelected('UPI')}
            >
                <div className="left">
                    <Image src="/payment-methods/upi.png" alt="UPI" width={60} height={40} style={{ objectFit: 'contain' }} />
                </div>
                <div className="right">
                    <div className="text-container">
                        <h3>Pay via UPI</h3>
                        <p>Instant payment using any UPI app<br />(GPay, PhonePe, Paytm)</p>
                    </div>
                    <div className="image-container icons-right">   
                        <Image src="/payment-methods/gpay.png" alt="GPay" width={20} height={20} />
                        <Image src="/payment-methods/phonepe.png" alt="PhonePe" width={20} height={20} />
                        <Image src="/payment-methods/paytm.png" alt="Paytm" width={40} height={20} style={{ objectFit: 'contain' }} />
                    </div>
                </div>
            </div>

            <div 
              className={`payment-method cryptomus ${selected === 'USDT' ? 'selected' : ''}`}
              onClick={() => setSelected('USDT')}
            >
                <div className="left">
                    <Image src="/payment-methods/cryptomus.png" alt="Cryptomus" width={60} height={40} style={{ objectFit: 'contain' }} />
                </div>
                <div className="right">
                    <div className="text-container">
                        <h3>Pay with Crypto</h3>
                        <p>Pay using USDT or other supported<br />cryptocurrencies</p>
                    </div>
                    <div className="image-container crypto-container">
                        <p>More than<br/><span>15+ Currency</span></p>
                        <div className="crypto-icons">
                            <Image src="/payment-methods/btc.png" alt="BTC" width={18} height={18} />
                            <Image src="/payment-methods/ltc.png" alt="LTC" width={18} height={18} />
                            <Image src="/payment-methods/eth.png" alt="ETH" width={18} height={18} />
                            <Image src="/payment-methods/usdt.png" alt="USDT" width={18} height={18} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <button 
          className="pay-now-btn" 
          disabled={!selected || isSubmitting}
          onClick={() => selected && onPay(selected)}
        >
          {isSubmitting ? <Loader2 className="animate-spin" /> : 'PAY NOW'}
        </button>
      </div>
    </div>
  )
}

export default PaymentBottomDrawer