interface SearchProps {
  value?: string;
  onChange?: (v: string) => void;
  onFilterClick?: () => void;
}

const SearchContainer: React.FC<SearchProps> = ({ value = '', onChange, onFilterClick }) => {
  return (
    <div className="search-container">
      <div className="search-wrapper">
        <div className="btn-glow" />
        <input
          type="text"
          name="search"
          className="search"
          placeholder="Search for services"
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