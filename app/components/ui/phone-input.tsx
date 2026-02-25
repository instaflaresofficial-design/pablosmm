"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface PhoneInputProps {
  value?: string
  onChange: (value?: string) => void
  disabled?: boolean
  className?: string
}

import { countries } from "@/app/lib/countries"

interface PhoneInputProps {
  value?: string
  onChange: (value?: string) => void
  disabled?: boolean
  className?: string
}

export function PhoneInput({ value, onChange, disabled, className }: PhoneInputProps) {
  const [country, setCountry] = React.useState(countries.find(c => c.code === "US")?.dial || "+1")
  const [number, setNumber] = React.useState("")
  const [isOpen, setIsOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setIsOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  React.useEffect(() => {
    if (value) {
      // Find the country code that matches the start of the value (sort by length descending to match longest code first)
      const matched = [...countries].sort((a,b) => b.dial.length - a.dial.length).find(c => value.startsWith(c.dial))
      if (matched) {
        setCountry(matched.dial)
        setNumber(value.slice(matched.dial.length))
      } else {
         setNumber(value)
      }
    }
  }, [value])

  const handleCountrySelect = (dialCode: string) => {
    setCountry(dialCode)
    onChange(`${dialCode}${number}`)
    setIsOpen(false)
  }

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newNumber = e.target.value
    setNumber(newNumber)
    onChange(`${country}${newNumber}`)
  }

  // Find current country object for flag
  const currentCountry = countries.find(c => c.dial === country)

  return (
    <div className={cn("phone-input-group", className)} ref={dropdownRef}>
      <div className="custom-select-container" style={{ width: 'auto' }}>
        <div 
            className="display-value" 
            style={{ paddingRight: '8px', cursor: 'pointer' }}
            onClick={() => !disabled && setIsOpen(!isOpen)}
        >
            <span className="flag">
                {currentCountry && (
                    <img 
                        src={`https://flagcdn.com/w40/${currentCountry.code.toLowerCase()}.png`}
                        alt={currentCountry.name}
                    />
                )}
            </span>
            <span className="dial-code">{country}</span>
        </div>

        {isOpen && (
            <div className="custom-dropdown-options" style={{ width: '300px' }}>
                {countries.map(c => (
                    <div 
                        key={c.code} 
                        className={`option ${c.dial === country ? 'selected' : ''}`}
                        onClick={() => handleCountrySelect(c.dial)}
                    >
                        <div className="flag">
                            <img 
                                src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`}
                                alt={c.name}
                            />
                        </div>
                        <span>{c.name}</span>
                        <span className="dial-code">{c.dial}</span>
                    </div>
                ))}
            </div>
        )}
      </div>
        
      <div className="separator"></div>

      <input
            type="tel"
            value={number}
            onChange={handleNumberChange}
            disabled={disabled}
            placeholder="Phone number"
      />
    </div>
  )
}
