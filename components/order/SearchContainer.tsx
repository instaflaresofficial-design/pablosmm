const SearchContainer = () => {
  return (
    <div className="search-container">
      <div className="search-wrapper">
        <input
          type="text"
          name="search"
          className="search"
          placeholder="Search for services"
          aria-label="Search for services"
        />
        <button className="control" aria-label="Filters">
          {/* Use an inline SVG or an image in public/ (next.js: /public/filters.svg) */}
          <img src="/filter.png" alt="filters" className="control-icon" />
        </button>
      </div>
    </div>
  )
}

export default SearchContainer