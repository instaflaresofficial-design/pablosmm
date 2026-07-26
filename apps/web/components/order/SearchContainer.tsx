import React, { useState, useEffect } from 'react';

interface SearchProps {
  value?: string;
  onChange?: (v: string) => void;
  onFilterClick?: () => void;
}

const phrases = [
  "Instagram followers",
  "Youtube likes",
  "Telegram Non-drop members",
  "Facebook followers"
];

const SearchContainer: React.FC<SearchProps> = ({ value = '', onChange, onFilterClick }) => {
  const [placeholder, setPlaceholder] = useState('');
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentPhrase = phrases[phraseIndex];
    let timeoutId: NodeJS.Timeout;

    if (isDeleting) {
      if (charIndex > 0) {
        timeoutId = setTimeout(() => {
          setPlaceholder(currentPhrase.substring(0, charIndex - 1));
          setCharIndex(c => c - 1);
        }, 30); // Speed of deletion
      } else {
        setIsDeleting(false);
        setPhraseIndex((prev) => (prev + 1) % phrases.length);
      }
    } else {
      if (charIndex < currentPhrase.length) {
        timeoutId = setTimeout(() => {
          setPlaceholder(currentPhrase.substring(0, charIndex + 1));
          setCharIndex(c => c + 1);
        }, 70); // Speed of typing
      } else {
        timeoutId = setTimeout(() => {
          setIsDeleting(true);
        }, 2000); // Wait before deleting
      }
    }

    return () => clearTimeout(timeoutId);
  }, [charIndex, isDeleting, phraseIndex]);

  return (
    <div className="search-container">
      <div className="search-wrapper">
        <div className="btn-glow" />
        <input
          type="text"
          name="search"
          className="search"
          placeholder={placeholder}
          aria-label="Search for services"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
        />
        <button className="control" aria-label="Filters" onClick={onFilterClick}>
          <img src="/filter.png" alt="filters" className="control-icon" />
        </button>
      </div>
    </div>
  );
};

export default SearchContainer;