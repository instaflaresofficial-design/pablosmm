"use client"
import React, { useState } from 'react'
import { Link } from 'lucide-react';
import Image from 'next/image';

const LinkInput = () => {
  const [link, setLink] = useState('');

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLink(event.target.value);
  };

  return (
    <div className='platform-container'> {/* Reusing platform-container for consistent styling */}
        <div className="text-container">
            <span>STEP-3</span>
            <h3>Paste your link</h3>
        </div>
        <div className="link-input-container">
            <div className="warning-card">
                <Image
                    src="/circle.png"
                    alt="Warning Icon"
                    width={20}
                    height={20}
                />
                <span>MAKE SURE YOUR PROFILE OR POST IS PUBLIC</span>
            </div>
            <div className="input-field">
                <Image
                    src="/link.png"
                    alt="Link Icon"
                    width={20}
                    height={20}
                />
                <input
                    type="text"
                    placeholder="Paste your link here"
                    value={link}
                    onChange={handleInputChange}
                />
            </div>
            <button className='submit-btn'>Continue</button>
        </div>
    </div>
  )
}

export default LinkInput
