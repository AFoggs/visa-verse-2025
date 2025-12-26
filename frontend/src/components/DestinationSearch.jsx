import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Search, Loader2, X, Globe, Building } from 'lucide-react';

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

function DestinationSearch({ value, onChange, mode = 'TRAVELER' }) {
  const [countryQuery, setCountryQuery] = useState('');
  const [cityQuery, setCityQuery] = useState('');
  const [countryResults, setCountryResults] = useState([]);
  const [cityResults, setCityResults] = useState([]);
  const [loadingCountry, setLoadingCountry] = useState(false);
  const [loadingCity, setLoadingCity] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  const countryInputRef = useRef(null);
  const cityInputRef = useRef(null);
  const countryDropdownRef = useRef(null);
  const cityDropdownRef = useRef(null);

  const debouncedCountryQuery = useDebounce(countryQuery, 400);
  const debouncedCityQuery = useDebounce(cityQuery, 400);

  // Search for countries using OpenStreetMap Nominatim
  const searchCountries = useCallback(async (searchQuery) => {
    if (!searchQuery || searchQuery.length < 2) {
      setCountryResults([]);
      return;
    }

    setLoadingCountry(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&addressdetails=1&limit=8&featuretype=country`,
        {
          headers: {
            'Accept-Language': 'en',
          },
        }
      );
      const data = await response.json();

      // Parse and filter for countries
      const parsed = data
        .filter((item) => {
          // Accept country-level results or items with country in address
          return item.type === 'country' ||
                 item.type === 'administrative' ||
                 (item.address && item.address.country);
        })
        .map((item) => {
          const address = item.address || {};
          // For country-level results, use the display name as country
          const countryName = item.type === 'country'
            ? item.name || address.country
            : address.country;
          return {
            id: item.place_id,
            displayName: item.display_name,
            country: countryName || '',
            countryCode: address.country_code?.toUpperCase() || '',
          };
        })
        .filter((item) => item.country);

      // Remove duplicates by country name
      const seen = new Set();
      const unique = parsed.filter((item) => {
        const key = item.country.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setCountryResults(unique);
    } catch (error) {
      console.error('Country search error:', error);
      setCountryResults([]);
    } finally {
      setLoadingCountry(false);
    }
  }, []);

  // Search for cities within selected country
  const searchCities = useCallback(async (searchQuery, country) => {
    if (!searchQuery || searchQuery.length < 2 || !country) {
      setCityResults([]);
      return;
    }

    setLoadingCity(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}, ${encodeURIComponent(country)}&addressdetails=1&limit=6&featuretype=city`,
        {
          headers: {
            'Accept-Language': 'en',
          },
        }
      );
      const data = await response.json();

      // Parse and filter for cities
      const parsed = data
        .filter((item) => {
          const type = item.type;
          return ['city', 'town', 'village', 'hamlet', 'municipality', 'administrative'].includes(type);
        })
        .map((item) => {
          const address = item.address || {};
          return {
            id: item.place_id,
            displayName: item.display_name,
            city: address.city || address.town || address.village || address.municipality || address.county || item.name || '',
            state: address.state || address.region || '',
            country: address.country || country,
          };
        })
        .filter((item) => item.city);

      // Remove duplicates by city name
      const seen = new Set();
      const unique = parsed.filter((item) => {
        const key = item.city.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setCityResults(unique);
    } catch (error) {
      console.error('City search error:', error);
      setCityResults([]);
    } finally {
      setLoadingCity(false);
    }
  }, []);

  // Search when debounced query changes
  useEffect(() => {
    if (debouncedCountryQuery) {
      searchCountries(debouncedCountryQuery);
    }
  }, [debouncedCountryQuery, searchCountries]);

  useEffect(() => {
    if (debouncedCityQuery && value.country) {
      searchCities(debouncedCityQuery, value.country);
    }
  }, [debouncedCityQuery, value.country, searchCities]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        countryDropdownRef.current &&
        !countryDropdownRef.current.contains(event.target) &&
        countryInputRef.current &&
        !countryInputRef.current.contains(event.target)
      ) {
        setShowCountryDropdown(false);
      }
      if (
        cityDropdownRef.current &&
        !cityDropdownRef.current.contains(event.target) &&
        cityInputRef.current &&
        !cityInputRef.current.contains(event.target)
      ) {
        setShowCityDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectCountry = (country) => {
    onChange({
      country: country.country,
      city: '', // Reset city when country changes
    });
    setCountryQuery('');
    setShowCountryDropdown(false);
    setCountryResults([]);
  };

  const handleSelectCity = (city) => {
    onChange({
      ...value,
      city: city.city,
    });
    setCityQuery('');
    setShowCityDropdown(false);
    setCityResults([]);
  };

  const handleClearCountry = () => {
    onChange({ country: '', city: '' });
    setCountryQuery('');
    setCityQuery('');
    setCountryResults([]);
    setCityResults([]);
  };

  const handleClearCity = () => {
    onChange({ ...value, city: '' });
    setCityQuery('');
    setCityResults([]);
  };

  const hasCountry = value.country && value.country.trim().length > 0;
  const hasCity = value.city && value.city.trim().length > 0;

  return (
    <div className="space-y-4">
      {/* Country Selection */}
      <div>
        <label className="block text-sm text-dark-200 mb-2">
          {mode === 'LOCAL' ? 'Your Country' : 'Destination Country'} *
        </label>

        {/* Selected Country Display */}
        {hasCountry && (
          <div className="mb-3 p-3 bg-dark-600 rounded-xl border border-dark-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-400/20 flex items-center justify-center">
                  <Globe className="text-primary-400" size={16} />
                </div>
                <p className="font-medium">{value.country}</p>
              </div>
              <button
                onClick={handleClearCountry}
                className="p-1.5 text-dark-400 hover:text-red-400 hover:bg-dark-500 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Country Search Input */}
        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400"
          />
          <input
            ref={countryInputRef}
            type="text"
            value={countryQuery}
            onChange={(e) => {
              setCountryQuery(e.target.value);
              setShowCountryDropdown(true);
            }}
            onFocus={() => setShowCountryDropdown(true)}
            placeholder={hasCountry ? 'Search for a different country...' : 'Search for a country...'}
            className="input pl-11 pr-10"
          />
          {loadingCountry && (
            <Loader2
              size={18}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-primary-400 animate-spin"
            />
          )}
        </div>

        {/* Country Results Dropdown */}
        {showCountryDropdown && countryResults.length > 0 && (
          <div
            ref={countryDropdownRef}
            className="absolute z-50 w-[calc(100%-2rem)] mt-2 bg-dark-700 border border-dark-600 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto"
          >
            {countryResults.map((country) => (
              <button
                key={country.id}
                onClick={() => handleSelectCountry(country)}
                className="w-full px-4 py-3 text-left hover:bg-dark-600 transition-colors flex items-center gap-3"
              >
                <Globe size={18} className="text-primary-400 flex-shrink-0" />
                <span className="font-medium">{country.country}</span>
              </button>
            ))}
          </div>
        )}

        {/* No results message for country */}
        {showCountryDropdown && countryQuery.length >= 2 && !loadingCountry && countryResults.length === 0 && debouncedCountryQuery && (
          <div className="absolute z-50 w-[calc(100%-2rem)] mt-2 bg-dark-700 border border-dark-600 rounded-xl shadow-xl p-4 text-center text-dark-400">
            No countries found. Try a different search term.
          </div>
        )}
      </div>

      {/* City Selection (only shown when country is selected) */}
      {hasCountry && (
        <div>
          <label className="block text-sm text-dark-200 mb-2">
            City (optional - helps find local matches)
          </label>

          {/* Selected City Display */}
          {hasCity && (
            <div className="mb-3 p-3 bg-dark-600 rounded-xl border border-dark-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent-400/20 flex items-center justify-center">
                    <Building className="text-accent-400" size={16} />
                  </div>
                  <div>
                    <p className="font-medium">{value.city}</p>
                    <p className="text-dark-400 text-sm">{value.country}</p>
                  </div>
                </div>
                <button
                  onClick={handleClearCity}
                  className="p-1.5 text-dark-400 hover:text-red-400 hover:bg-dark-500 rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          {/* City Search Input */}
          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400"
            />
            <input
              ref={cityInputRef}
              type="text"
              value={cityQuery}
              onChange={(e) => {
                setCityQuery(e.target.value);
                setShowCityDropdown(true);
              }}
              onFocus={() => setShowCityDropdown(true)}
              placeholder={hasCity ? 'Search for a different city...' : `Search for a city in ${value.country}...`}
              className="input pl-11 pr-10"
            />
            {loadingCity && (
              <Loader2
                size={18}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-primary-400 animate-spin"
              />
            )}
          </div>

          {/* City Results Dropdown */}
          {showCityDropdown && cityResults.length > 0 && (
            <div
              ref={cityDropdownRef}
              className="absolute z-50 w-[calc(100%-2rem)] mt-2 bg-dark-700 border border-dark-600 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto"
            >
              {cityResults.map((city) => (
                <button
                  key={city.id}
                  onClick={() => handleSelectCity(city)}
                  className="w-full px-4 py-3 text-left hover:bg-dark-600 transition-colors flex items-center gap-3"
                >
                  <MapPin size={18} className="text-accent-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{city.city}</p>
                    {city.state && (
                      <p className="text-dark-400 text-sm truncate">{city.state}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No results message for city */}
          {showCityDropdown && cityQuery.length >= 2 && !loadingCity && cityResults.length === 0 && debouncedCityQuery && (
            <div className="absolute z-50 w-[calc(100%-2rem)] mt-2 bg-dark-700 border border-dark-600 rounded-xl shadow-xl p-4 text-center text-dark-400">
              No cities found in {value.country}. Try a different search term.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DestinationSearch;
