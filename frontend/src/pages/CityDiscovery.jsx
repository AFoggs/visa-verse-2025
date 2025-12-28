import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Compass,
  Home,
  Sparkles,
  Users,
  Bookmark,
  BookmarkCheck,
  RefreshCw,
  ChevronDown,
  Lightbulb,
  Map,
  Star,
  Coffee,
  Music,
  Palette,
  TreePine,
  MessageCircle,
  StickyNote,
  X,
  Check,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { cityDiscoveryApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const TABS = [
  { id: 'overview', label: 'Overview', icon: Compass },
  { id: 'neighborhoods', label: 'Areas', icon: Map },
  { id: 'activities', label: 'To Do', icon: Star },
  { id: 'hidden-gems', label: 'Gems', icon: Sparkles },
  { id: 'locals', label: 'Locals', icon: Users },
];

const CATEGORY_ICONS = {
  food: Coffee,
  culture: Palette,
  outdoor: TreePine,
  nightlife: Music,
  default: Star,
};

function CityDiscovery() {
  const { userProfile } = useAuth();
  const [selectedCity, setSelectedCity] = useState(null);
  const [availableCities, setAvailableCities] = useState([]);
  const [cityContent, setCityContent] = useState(null);
  const [cityInfo, setCityInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [bookmarks, setBookmarks] = useState([]);
  const [locals, setLocals] = useState([]);
  const [localsLoading, setLocalsLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notesLoading, setNotesLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load available cities when userProfile is available
  useEffect(() => {
    if (userProfile) {
      loadAvailableCities();
    }
  }, [userProfile]);

  // Auto-select city based on user's mobility
  useEffect(() => {
    if (availableCities.length > 0 && !selectedCity) {
      const userCity = userProfile?.mobility?.area?.city;
      const userCountry = userProfile?.mobility?.area?.country;

      if (userCity) {
        const matchingCity = availableCities.find(
          c => c.cityName.toLowerCase() === userCity.toLowerCase()
        );
        if (matchingCity) {
          setSelectedCity(matchingCity.cityId);
          return;
        }
      }

      // Default to first city if no match
      if (availableCities.length > 0) {
        setSelectedCity(availableCities[0].cityId);
      }
    }
  }, [availableCities, userProfile, selectedCity]);

  // Load city content when selection changes
  useEffect(() => {
    if (selectedCity) {
      loadCityContent(selectedCity);
      loadBookmarks(selectedCity);
      loadNotes(selectedCity);
    }
  }, [selectedCity]);

  const loadAvailableCities = async () => {
    try {
      const data = await cityDiscoveryApi.getAvailableCities();
      let cities = data.cities || [];

      // If no cities available, try to create one based on user's location
      if (cities.length === 0 && userProfile?.mobility?.area) {
        const userCity = userProfile.mobility.area.city;
        const userCountry = userProfile.mobility.area.country;

        if (userCity && userCountry) {
          try {
            const newCity = await cityDiscoveryApi.createCity(userCity, userCountry);
            cities = [{
              cityId: newCity.cityId,
              cityName: userCity,
              country: userCountry,
            }];
          } catch (createErr) {
            console.error('Failed to create city:', createErr);
          }
        }
      }

      setAvailableCities(cities);
      // If still no cities available, stop loading
      if (cities.length === 0) {
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed to load cities:', err);
      setError('Failed to load available cities');
      setLoading(false);
    }
  };

  const loadCityContent = async (cityId) => {
    setLoading(true);
    setError(null);
    try {
      const data = await cityDiscoveryApi.getCityContent(cityId);
      setCityContent(data.content);
      setCityInfo(data.cityInfo);
    } catch (err) {
      console.error('Failed to load city content:', err);
      setError('Failed to load city content. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadBookmarks = async (cityId) => {
    try {
      const data = await cityDiscoveryApi.getBookmarks(cityId);
      setBookmarks(data.bookmarks || []);
    } catch (err) {
      console.error('Failed to load bookmarks:', err);
    }
  };

  const loadNotes = async (cityId) => {
    try {
      const data = await cityDiscoveryApi.getNotes(cityId);
      setNotes(data.notes || '');
    } catch (err) {
      console.error('Failed to load notes:', err);
    }
  };

  const loadLocals = async () => {
    if (!selectedCity) return;
    setLocalsLoading(true);
    try {
      const data = await cityDiscoveryApi.getRelevantLocals(selectedCity);
      setLocals(data.locals || []);
    } catch (err) {
      console.error('Failed to load locals:', err);
    } finally {
      setLocalsLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!selectedCity || regenerating) return;
    setRegenerating(true);
    try {
      const data = await cityDiscoveryApi.regenerateCityContent(selectedCity);
      setCityContent(data.content);
    } catch (err) {
      console.error('Failed to regenerate:', err);
      setError('Failed to refresh recommendations');
    } finally {
      setRegenerating(false);
    }
  };

  const toggleBookmark = async (item) => {
    if (!selectedCity) return;
    const itemKey = typeof item === 'string' ? item : JSON.stringify(item);
    const isBookmarked = bookmarks.some(b =>
      (typeof b === 'string' ? b : JSON.stringify(b)) === itemKey
    );

    try {
      if (isBookmarked) {
        await cityDiscoveryApi.removeBookmark(selectedCity, item);
        setBookmarks(prev => prev.filter(b =>
          (typeof b === 'string' ? b : JSON.stringify(b)) !== itemKey
        ));
      } else {
        await cityDiscoveryApi.addBookmark(selectedCity, item);
        setBookmarks(prev => [...prev, item]);
      }
    } catch (err) {
      console.error('Bookmark error:', err);
    }
  };

  const isBookmarked = (item) => {
    const itemKey = typeof item === 'string' ? item : JSON.stringify(item);
    return bookmarks.some(b =>
      (typeof b === 'string' ? b : JSON.stringify(b)) === itemKey
    );
  };

  const saveNotes = async () => {
    if (!selectedCity) return;
    setNotesLoading(true);
    try {
      await cityDiscoveryApi.saveNotes(selectedCity, notes);
      setShowNotesModal(false);
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setNotesLoading(false);
    }
  };

  // Load locals when tab changes to locals
  useEffect(() => {
    if (activeTab === 'locals' && locals.length === 0 && selectedCity) {
      loadLocals();
    }
  }, [activeTab, selectedCity]);

  if (loading && !cityContent) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-400" />
      </div>
    );
  }

  if (error && !cityContent) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-dark-700 flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="text-error-400" size={40} />
        </div>
        <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
        <p className="text-dark-300 mb-8">{error}</p>
        <button onClick={() => loadCityContent(selectedCity)} className="btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  if (availableCities.length === 0 && !loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-dark-700 flex items-center justify-center mx-auto mb-6">
          <MapPin className="text-dark-400" size={40} />
        </div>
        <h2 className="text-2xl font-bold mb-4">No Cities Available</h2>
        <p className="text-dark-300">
          City guides are being added. Check back soon!
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header with City Selector */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center">
            <Compass size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold">City Discovery</h1>
            <p className="text-sm text-dark-300">AI-powered travel insights</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNotesModal(true)}
            className="btn-ghost p-2"
            title="My Notes"
          >
            <StickyNote size={20} />
          </button>
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="btn-ghost p-2"
            title="Refresh Recommendations"
          >
            <RefreshCw size={20} className={regenerating ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* City Selector */}
      <div className="mb-6">
        <div className="relative">
          <select
            value={selectedCity || ''}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="w-full p-3 pr-10 bg-dark-700 border border-dark-600 rounded-xl appearance-none focus:border-primary-400 focus:outline-none"
          >
            {availableCities.map(city => (
              <option key={city.cityId} value={city.cityId}>
                {city.cityName}, {city.country}
              </option>
            ))}
          </select>
          <ChevronDown size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 pointer-events-none" />
        </div>
      </div>

      {/* Custom Intro */}
      {cityContent?.customIntro && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-4 mb-6 bg-gradient-to-r from-primary-400/10 to-accent-400/10 border-primary-400/20"
        >
          <div className="flex items-start gap-3">
            <Sparkles className="text-primary-400 flex-shrink-0 mt-1" size={20} />
            <p className="text-dark-200 italic">{cityContent.customIntro}</p>
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-1 mb-6 pb-2 -mx-4 px-4">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-primary-400 text-white'
                  : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Practical Tips */}
              {cityContent?.practicalTips?.length > 0 && (
                <div className="card p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Lightbulb size={18} className="text-accent-400" />
                    Tips for You
                  </h3>
                  <ul className="space-y-2">
                    {cityContent.practicalTips.map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-dark-200">
                        <Check size={16} className="text-success-400 flex-shrink-0 mt-0.5" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Local Connection Suggestions */}
              {cityContent?.localConnectionSuggestions && (
                <div className="card p-4 border-accent-400/20">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Users size={18} className="text-accent-400" />
                    Connect With
                  </h3>
                  <p className="text-sm text-dark-200">
                    {cityContent.localConnectionSuggestions}
                  </p>
                </div>
              )}

              {/* Base City Info */}
              {cityInfo?.baseContent?.overview && (
                <div className="card p-4">
                  <h3 className="font-semibold mb-2">About {cityInfo.cityName}</h3>
                  <p className="text-sm text-dark-300">{cityInfo.baseContent.overview}</p>
                </div>
              )}
            </div>
          )}

          {/* Neighborhoods Tab */}
          {activeTab === 'neighborhoods' && (
            <div className="space-y-4">
              {cityContent?.recommendedNeighborhoods?.length > 0 ? (
                cityContent.recommendedNeighborhoods.map((area, idx) => (
                  <div key={idx} className="card p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold flex items-center gap-2">
                            <Home size={16} className="text-primary-400" />
                            {area.name}
                          </h3>
                          {area.link && (
                            <a
                              href={area.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 hover:bg-dark-600 rounded transition-colors"
                              title="View on map"
                            >
                              <ExternalLink size={14} className="text-primary-400" />
                            </a>
                          )}
                        </div>
                        <p className="text-sm text-accent-400 mt-1">{area.whyMatch}</p>
                      </div>
                      <button
                        onClick={() => toggleBookmark({ type: 'neighborhood', name: area.name })}
                        className="p-2 hover:bg-dark-600 rounded-lg transition-colors"
                      >
                        {isBookmarked({ type: 'neighborhood', name: area.name }) ? (
                          <BookmarkCheck size={18} className="text-primary-400" />
                        ) : (
                          <Bookmark size={18} className="text-dark-400" />
                        )}
                      </button>
                    </div>
                    {area.highlights?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {area.highlights.map((highlight, hIdx) => (
                          <span
                            key={hIdx}
                            className="px-2 py-1 bg-dark-600 rounded-full text-xs text-dark-200"
                          >
                            {highlight}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-dark-400">
                  No neighborhood recommendations yet
                </div>
              )}
            </div>
          )}

          {/* Activities Tab */}
          {activeTab === 'activities' && (
            <div className="space-y-4">
              {cityContent?.mustDoActivities?.length > 0 ? (
                cityContent.mustDoActivities.map((activity, idx) => {
                  const CategoryIcon = CATEGORY_ICONS[activity.category] || CATEGORY_ICONS.default;
                  return (
                    <div key={idx} className="card p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary-400/20 flex items-center justify-center flex-shrink-0">
                            <CategoryIcon size={20} className="text-primary-400" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{activity.activity}</h3>
                              {activity.link && (
                                <a
                                  href={activity.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 hover:bg-dark-600 rounded transition-colors"
                                  title="View details"
                                >
                                  <ExternalLink size={14} className="text-primary-400" />
                                </a>
                              )}
                            </div>
                            <p className="text-sm text-dark-300 mt-1">{activity.whyRelevant}</p>
                            {activity.address && (
                              <p className="text-xs text-dark-400 mt-1 flex items-center gap-1">
                                <MapPin size={12} />
                                {activity.address}
                              </p>
                            )}
                            <span className="inline-block px-2 py-0.5 bg-dark-600 rounded text-xs text-dark-400 mt-2 capitalize">
                              {activity.category}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleBookmark({ type: 'activity', name: activity.activity })}
                          className="p-2 hover:bg-dark-600 rounded-lg transition-colors"
                        >
                          {isBookmarked({ type: 'activity', name: activity.activity }) ? (
                            <BookmarkCheck size={18} className="text-primary-400" />
                          ) : (
                            <Bookmark size={18} className="text-dark-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-dark-400">
                  No activity recommendations yet
                </div>
              )}
            </div>
          )}

          {/* Hidden Gems Tab */}
          {activeTab === 'hidden-gems' && (
            <div className="space-y-4">
              {cityContent?.hiddenGems?.length > 0 ? (
                cityContent.hiddenGems.map((gem, idx) => (
                  <div key={idx} className="card p-4 border-accent-400/20">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold flex items-center gap-2">
                            <Sparkles size={16} className="text-accent-400" />
                            {gem.place}
                          </h3>
                          {gem.link && (
                            <a
                              href={gem.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 hover:bg-dark-600 rounded transition-colors"
                              title="View details"
                            >
                              <ExternalLink size={14} className="text-accent-400" />
                            </a>
                          )}
                        </div>
                        <p className="text-sm text-dark-200 mt-2">{gem.description}</p>
                        {gem.interest && (
                          <span className="inline-block px-2 py-0.5 bg-accent-400/20 text-accent-400 rounded text-xs mt-2">
                            Matches: {gem.interest}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => toggleBookmark({ type: 'gem', name: gem.place })}
                        className="p-2 hover:bg-dark-600 rounded-lg transition-colors"
                      >
                        {isBookmarked({ type: 'gem', name: gem.place }) ? (
                          <BookmarkCheck size={18} className="text-primary-400" />
                        ) : (
                          <Bookmark size={18} className="text-dark-400" />
                        )}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-dark-400">
                  No hidden gems discovered yet
                </div>
              )}
            </div>
          )}

          {/* Locals Tab */}
          {activeTab === 'locals' && (
            <div className="space-y-4">
              {localsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-400" />
                </div>
              ) : locals.length > 0 ? (
                <>
                  <p className="text-sm text-dark-400 mb-4">
                    Your connections and potential matches in this city
                  </p>
                  {locals.map((local, idx) => (
                    <div key={idx} className="card p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-lg font-bold">
                          {local.name?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{local.name}</h3>
                            {local.connectionStatus === 'friend' && (
                              <span className="px-2 py-0.5 bg-success-400/20 text-success-400 rounded text-xs">
                                Friend
                              </span>
                            )}
                            {local.connectionStatus === 'connected' && (
                              <span className="px-2 py-0.5 bg-primary-400/20 text-primary-400 rounded text-xs">
                                Connected
                              </span>
                            )}
                            {local.connectionStatus === 'pending' && (
                              <span className="px-2 py-0.5 bg-accent-400/20 text-accent-400 rounded text-xs">
                                Pending
                              </span>
                            )}
                            {local.connectionStatus === 'suggested' && (
                              <span className="px-2 py-0.5 bg-dark-500/50 text-dark-300 rounded text-xs">
                                Suggested
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {local.sharedInterests?.slice(0, 3).map((interest, iIdx) => (
                              <span
                                key={iIdx}
                                className="px-2 py-0.5 bg-primary-400/20 text-primary-400 rounded text-xs"
                              >
                                {interest}
                              </span>
                            ))}
                          </div>
                        </div>
                        {local.canMessage ? (
                          <button className="btn-ghost p-2" title="Send message">
                            <MessageCircle size={20} className="text-primary-400" />
                          </button>
                        ) : (
                          <button className="btn-ghost p-2 text-dark-400" title="Connect first to message">
                            <Users size={20} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-center py-8">
                  <Users size={40} className="text-dark-500 mx-auto mb-4" />
                  <p className="text-dark-400">No matching locals found yet</p>
                  <p className="text-sm text-dark-500 mt-2">
                    Use the Discover tab to find and connect with locals who share your interests
                  </p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Bookmarks Summary */}
      {bookmarks.length > 0 && (
        <div className="mt-8 p-4 bg-dark-700/50 rounded-xl border border-dark-600">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <BookmarkCheck size={18} className="text-primary-400" />
            Your Bookmarks ({bookmarks.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {bookmarks.slice(0, 6).map((bookmark, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-dark-600 rounded text-sm text-dark-200"
              >
                {typeof bookmark === 'string' ? bookmark : bookmark.name}
              </span>
            ))}
            {bookmarks.length > 6 && (
              <span className="px-2 py-1 bg-dark-600 rounded text-sm text-dark-400">
                +{bookmarks.length - 6} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {showNotesModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-dark-800 rounded-xl w-full max-w-md p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <StickyNote size={18} className="text-accent-400" />
                My Notes - {cityInfo?.cityName}
              </h3>
              <button
                onClick={() => setShowNotesModal(false)}
                className="p-1 hover:bg-dark-600 rounded"
              >
                <X size={20} />
              </button>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add your personal notes about this city..."
              className="w-full h-40 p-3 bg-dark-700 border border-dark-600 rounded-lg resize-none focus:border-primary-400 focus:outline-none"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowNotesModal(false)}
                className="btn-ghost flex-1"
              >
                Cancel
              </button>
              <button
                onClick={saveNotes}
                disabled={notesLoading}
                className="btn-primary flex-1"
              >
                {notesLoading ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default CityDiscovery;
