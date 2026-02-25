// This tool call is actually just checking the file first.

import * as React from "react"
import { ChevronsUpDown } from "lucide-react"

const currencies = [
  { value: "USD", label: "USD", code: "us" },
  { value: "INR", label: "INR", code: "in" },
]

interface CurrencySelectProps {
  value?: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function CurrencySelect({ value, onChange, disabled }: CurrencySelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const currentCurrency = currencies.find(c => c.value === value) || currencies[0]

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="custom-select-container" ref={dropdownRef}>
      <div 
        className={`currency-select-wrapper ${isOpen ? 'active' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="display-value">
          <span className="flag">
             <img 
                src={`https://flagcdn.com/w40/${currentCurrency.code}.png`}
                alt={currentCurrency.label}
             />
          </span>
          <span className="code">{currentCurrency.label}</span>
        </div>
        
        <div className="icon-wrapper">
          <ChevronsUpDown />
        </div>
      </div>

      {isOpen && (
        <div className="custom-dropdown-options">
          {currencies.map((currency) => (
            <div 
                key={currency.value} 
                className={`option ${currency.value === value ? 'selected' : ''}`}
                onClick={() => {
                    onChange(currency.value);
                    setIsOpen(false);
                }}
            >
              <div className="flag">
                <img 
                    src={`https://flagcdn.com/w40/${currency.code}.png`} 
                    alt={currency.label} 
                />
              </div>
              <span>{currency.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
