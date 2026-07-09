"use client"
import React, { useState } from 'react';
import { Link } from 'lucide-react';
import Image from 'next/image';

interface LinkInputProps {
  onLinkChange: (link: string) => void;
  onContinue: () => void;
}

const LinkInput: React.FC<LinkInputProps> = ({ onLinkChange, onContinue }) => {
  const [link, setLink] = useState('');

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLink = event.target.value;
    setLink(newLink);
    onLinkChange(newLink); // Pass the link to the parent
  };

  return (
    <div className='platform-container'>
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
        <button className='submit-btn' onClick={onContinue}>Continue</button>
      </div>
    </div>
  );
}

export default LinkInput;