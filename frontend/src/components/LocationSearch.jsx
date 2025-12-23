import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Search, Loader2, X } from 'lucide-react';

// Debounce hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

function LocationSearch({ value, onChange, placeholder = 'Search for a city...' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const debouncedQuery = useDebounce(query, 400);

  // Search for locations using OpenStreetMap Nominatim
  const searchLocations = useCallback(async (searchQuery) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&addressdetails=1&limit=6&featuretype=city`,
        {
          headers: {
            'Accept-Language': 'en',
          },
        }
      );
      const data = await response.json();

      // Parse and deduplicate results
      const parsed = data
        .filter((item) => {
          // Filter for cities, towns, villages, and states
          const type = item.type;
          return ['city', 'town', 'village', 'hamlet', 'municipality', 'administrative'].includes(type);
        })
        .map((item) => {
          const address = item.address || {};
          return {
            id: item.place_id,
            displayName: item.display_name,
            city: address.city || address.town || address.village || address.municipality || address.county || '',
            state: address.state || address.region || '',
            country: address.country || '',
            lat: item.lat,
            lon: item.lon,
          };
        })
        .filter((item) => item.city && item.country);

      // Remove duplicates by city+country combination
      const seen = new Set();
      const unique = parsed.filter((item) => {
        const key = `${item.city}-${item.country}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setResults(unique);
    } catch (error) {
      console.error('Location search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Search when debounced query changes
  useEffect(() => {
    if (debouncedQuery) {
      searchLocations(debouncedQuery);
    }
  }, [debouncedQuery, searchLocations]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (location) => {
    onChange({
      city: location.city,
      state: location.state,
      country: location.country,
      displayPreference: value.displayPreference || 'city',
    });
    setQuery('');
    setShowDropdown(false);
    setResults([]);
  };

  const handleClear = () => {
    onChange({
      city: '',
      state: '',
      country: '',
      displayPreference: 'city',
    });
    setQuery('');
    setResults([]);
  };

  const hasLocation = value.city && value.country;

  return (
    <div className="relative">
      {/* Selected Location Display */}
      {hasLocation && (
        <div className="mb-4 p-4 bg-dark-600 rounded-xl border border-dark-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-400/20 flex items-center justify-center">
                <MapPin className="text-primary-400" size={20} />
              </div>
              <div>
                <p className="font-medium">{value.city}</p>
                <p className="text-dark-300 text-sm">
                  {value.state && `${value.state}, `}{value.country}
                </p>
              </div>
            </div>
            <button
              onClick={handleClear}
              className="p-2 text-dark-400 hover:text-red-400 hover:bg-dark-500 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder={hasLocation ? 'Search for a different city...' : placeholder}
          className="input pl-11 pr-10"
        />
        {loading && (
          <Loader2
            size={18}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-primary-400 animate-spin"
          />
        )}
      </div>

      {/* Search Results Dropdown */}
      {showDropdown && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 bg-dark-700 border border-dark-600 rounded-xl shadow-xl overflow-hidden"
        >
          {results.map((location) => (
            <button
              key={location.id}
              onClick={() => handleSelect(location)}
              className="w-full px-4 py-3 text-left hover:bg-dark-600 transition-colors flex items-center gap-3"
            >
              <MapPin size={18} className="text-primary-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-medium truncate">{location.city}</p>
                <p className="text-dark-400 text-sm truncate">
                  {location.state && `${location.state}, `}{location.country}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {showDropdown && query.length >= 2 && !loading && results.length === 0 && debouncedQuery && (
        <div className="absolute z-50 w-full mt-2 bg-dark-700 border border-dark-600 rounded-xl shadow-xl p-4 text-center text-dark-400">
          No cities found. Try a different search term.
        </div>
      )}

      {/* Display Preference (shown when location is selected) */}
      {hasLocation && (
        <div className="mt-4">
          <label className="block text-sm text-dark-200 mb-3">
            What should others see?
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'city', label: 'City & Country', preview: `${value.city}, ${value.country}` },
              { value: 'state', label: 'State Only', preview: value.state || value.country },
              { value: 'country', label: 'Country Only', preview: value.country },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() =>
                  onChange({
                    ...value,
                    displayPreference: opt.value,
                  })
                }
                className={`p-3 rounded-lg text-sm transition-all ${
                  value.displayPreference === opt.value
                    ? 'bg-primary-400/20 border-2 border-primary-400'
                    : 'bg-dark-600 border-2 border-transparent hover:border-dark-500'
                }`}
              >
                <span className="block font-medium">{opt.label}</span>
                <span className="block text-xs text-dark-400 mt-1 truncate">{opt.preview}</span>
              </button>
            ))}
          </div>
          <p className="text-dark-400 text-xs mt-2">
            This controls what location info other users can see on your profile.
          </p>
        </div>
      )}
    </div>
  );
}

export default LocationSearch;
