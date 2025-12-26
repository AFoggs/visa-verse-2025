import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MapPin,
  Calendar,
  Globe,
  MessageSquare,
  Edit2,
  ArrowLeft,
  Sparkles,
  Users,
  Save,
  Lock,
  MapPinned,
  MessageCircle,
  Heart,
  Check,
  Info,
  Plane,
  Home,
  Target,
  Compass,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../services/api';
import LocationSearch from '../components/LocationSearch';
import ProfilePhoto from '../components/ProfilePhoto';

// Top 30 common interests
const TOP_INTERESTS = [
  'Travel', 'Music', 'Movies', 'Reading', 'Cooking', 'Fitness',
  'Photography', 'Gaming', 'Technology', 'Art', 'Sports', 'Hiking',
  'Nature', 'Podcasts', 'Writing', 'Yoga', 'Fashion', 'Pets',
  'Science', 'Dancing', 'Coffee', 'Food', 'Running', 'Anime',
  'Board Games', 'Languages', 'Entrepreneurship', 'Philosophy',
  'Meditation', 'Volunteering',
];

// Additional 73 interests
const EXTRA_INTERESTS = [
  'AI', 'Astrology', 'Backpacking', 'Baking', 'Beach', 'Birdwatching',
  'Camping', 'Card Games', 'Cars', 'Chess', 'Climbing', 'Coding',
  'Collecting', 'Comedy', 'Concerts', 'Cosplay', 'Crafts', 'Crypto',
  'Cuisine', 'Cycling', 'Design', 'Documentaries', 'Drawing', 'Escape Rooms',
  'Festivals', 'Filmmaking', 'Fishing', 'Gardening', 'Gym', 'History',
  'Home Improvement', 'Instruments', 'Investing', 'Karaoke', 'Kayaking',
  'Knitting', 'K-pop', 'Manga', 'Martial Arts', 'Memes', 'Minimalism',
  'Mixology', 'Mobile Games', 'Models', 'Mountain Biking', 'Museums',
  'Networking', 'Parenting', 'Psychology', 'Puzzles', 'Real Estate',
  'Robotics', 'Self-Improvement', 'Singing', 'Skateboarding', 'Skiing',
  'Social Media', 'Spirituality', 'Streaming', 'Surfing', 'Sustainability',
  'Swimming', 'Team Sports', 'Tennis', 'Theater', 'Thrifting', 'Trivia',
  'TV Shows', 'Vintage', 'Vlogging', 'VR', 'Wine', 'Woodworking',
];

const REASONS = [
  { id: 'friends', label: 'Make new friends', icon: '👋' },
  { id: 'interests', label: 'Find people with similar interests', icon: '🎯' },
  { id: 'expand', label: 'Expand my social circle', icon: '🌐' },
  { id: 'skills', label: 'Practice communication skills', icon: '💬' },
  { id: 'cultures', label: 'Meet people from different cultures', icon: '🌍' },
  { id: 'loneliness', label: 'Combat loneliness', icon: '💙' },
  { id: 'activities', label: 'Find activity partners', icon: '🎮' },
  { id: 'curious', label: 'Just curious to try it', icon: '✨' },
];

// Mobility constants
const GOALS = [
  { id: 'MAKE_FRIENDS', label: 'Make friends', icon: '👋' },
  { id: 'FEEL_WELCOME', label: 'Feel welcome', icon: '🏠' },
  { id: 'HELP_OTHERS', label: 'Help others', icon: '🤝' },
  { id: 'BUILD_NETWORK', label: 'Build network', icon: '🔗' },
  { id: 'EXPLORE_CITY', label: 'Explore the city', icon: '🗺️' },
];

const CONNECTION_INTENTS = [
  { id: 'COMMUNITY', label: 'Community', icon: '👥', desc: 'Social & belonging' },
  { id: 'CAREER', label: 'Career', icon: '💼', desc: 'Professional networking' },
  { id: 'EXPERIENCE', label: 'Experience', icon: '✨', desc: 'Tourism & activities' },
];

const TRAVEL_REASONS = [
  { id: 'RELOCATING', label: 'Relocating' },
  { id: 'SCHOOL', label: 'Studying abroad' },
  { id: 'CAREER', label: 'Work/Career' },
  { id: 'TOURISM', label: 'Tourism' },
  { id: 'FAMILY', label: 'Family reasons' },
  { id: 'OTHER', label: 'Other' },
];

const LOCAL_REASONS = [
  { id: 'WELCOME_OTHERS', label: 'Welcome newcomers' },
  { id: 'CULTURAL_EXCHANGE', label: 'Cultural exchange' },
  { id: 'COMMUNITY_BUILDING', label: 'Community building' },
  { id: 'PROFESSIONAL_NETWORK', label: 'Professional networking' },
  { id: 'LANGUAGE_PRACTICE', label: 'Language practice' },
  { id: 'OTHER', label: 'Other' },
];

// Helper to get random items from array
function getRandomItems(arr, count) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function Profile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user, userProfile, updateUserProfile } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({});
  const [showMoreInterests, setShowMoreInterests] = useState(false);
  const [randomExtraInterests, setRandomExtraInterests] = useState([]);

  const isOwnProfile = !userId || userId === user?.uid;

  useEffect(() => {
    async function loadProfile() {
      if (isOwnProfile) {
        setProfile(userProfile);
        setEditData({
          name: userProfile?.profile?.name || '',
          bio: userProfile?.extendedProfile?.bio || '',
          location: userProfile?.profile?.location || { city: '', country: '' },
          interests: userProfile?.profile?.interests || [],
          preferences: userProfile?.profile?.preferences || {},
          photoUrl: userProfile?.profile?.photoUrl || null,
          whyHereIds: userProfile?.profile?.whyHereIds || [],
        });
        setLoading(false);
      } else {
        try {
          const data = await userApi.getProfile(userId);
          setProfile(data.user);
        } catch (error) {
          console.error('Error loading profile:', error);
          navigate(-1);
        } finally {
          setLoading(false);
        }
      }
    }
    loadProfile();
  }, [userId, userProfile, isOwnProfile, navigate]);

  const toggleInterest = (interest) => {
    setEditData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : prev.interests.length < 10
          ? [...prev.interests, interest]
          : prev.interests,
    }));
  };

  const toggleReason = (reasonId) => {
    setEditData((prev) => ({
      ...prev,
      whyHereIds: prev.whyHereIds.includes(reasonId)
        ? prev.whyHereIds.filter((r) => r !== reasonId)
        : prev.whyHereIds.length < 3
          ? [...prev.whyHereIds, reasonId]
          : prev.whyHereIds,
    }));
  };

  const handlePhotoChange = async (photoUrl) => {
    // Update photo immediately without needing to save the whole form
    try {
      await updateUserProfile({
        profile: {
          ...userProfile.profile,
          photoUrl,
        },
      });
      setEditData((prev) => ({ ...prev, photoUrl }));
    } catch (error) {
      console.error('Photo update error:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Convert whyHereIds to labels for display
      const whyHereLabels = editData.whyHereIds.map(id =>
        REASONS.find(r => r.id === id)?.label || id
      );

      await updateUserProfile({
        profile: {
          ...userProfile.profile,
          name: editData.name,
          location: editData.location,
          interests: editData.interests,
          preferences: editData.preferences,
          photoUrl: editData.photoUrl,
          whyHere: whyHereLabels.join(', '),
          whyHereIds: editData.whyHereIds,
        },
        extendedProfile: {
          ...userProfile.extendedProfile,
          bio: editData.bio,
        },
      });
      setEditing(false);
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-400" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <Users className="mx-auto text-dark-400 mb-4" size={48} />
        <h2 className="text-xl font-bold mb-2">Profile Not Found</h2>
        <p className="text-dark-300">This profile doesn't exist or you don't have access.</p>
      </div>
    );
  }

  const displayProfile = editing ? editData : profile.profile;
  const displayExtended = editing ? editData : profile.extendedProfile;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Back button for other profiles */}
      {!isOwnProfile && (
        <button
          onClick={() => navigate(-1)}
          className="btn-ghost flex items-center gap-2 mb-4"
        >
          <ArrowLeft size={20} />
          Back
        </button>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-primary-400/20 to-accent-400/20 p-8 text-center relative">
          {isOwnProfile && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="absolute top-4 right-4 btn-ghost p-2"
            >
              <Edit2 size={20} />
            </button>
          )}

          <div className="flex justify-center mb-4">
            <ProfilePhoto
              userId={isOwnProfile ? user?.uid : userId}
              photoUrl={editing ? editData.photoUrl : displayProfile?.photoUrl}
              onPhotoChange={handlePhotoChange}
              canEdit={isOwnProfile && editing}
              isOwnProfile={isOwnProfile}
              isFriend={!isOwnProfile && profile.status === 'friends'}
              size="lg"
              name={editing ? editData.name : displayProfile?.name}
            />
          </div>
          {editing && (
            <p className="text-dark-400 text-xs flex items-center justify-center gap-1 mb-4">
              <Lock size={12} />
              Your photo is only visible to friends
            </p>
          )}

          {editing ? (
            <input
              type="text"
              value={editData.name}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              className="input text-center text-2xl font-bold bg-dark-700/50 max-w-xs mx-auto"
            />
          ) : (
            <h1 className="text-2xl font-bold mb-1">
              {displayProfile?.name}
              {displayProfile?.age && `, ${displayProfile.age}`}
            </h1>
          )}

          {!editing && (
            <p className="text-dark-300 flex items-center justify-center gap-1">
              <MapPin size={16} />
              {displayProfile?.location?.city}, {displayProfile?.location?.country}
            </p>
          )}
        </div>

        {/* Mobility Context */}
        <div className="p-6 border-b border-dark-600">
          <h3 className="text-sm text-dark-300 mb-3 flex items-center gap-2">
            <Globe size={16} />
            Mobility Status
          </h3>
          {(() => {
            const mobility = profile?.mobility;
            if (!mobility?.mode) {
              return (
                <p className="text-dark-400 italic">
                  {isOwnProfile ? 'Complete your mobility profile in onboarding' : 'No mobility info'}
                </p>
              );
            }

            const isTraveler = mobility.mode === 'TRAVELER';
            const destination = mobility.area?.city
              ? `${mobility.area.city}, ${mobility.area.country}`
              : mobility.area?.country || 'Not specified';
            const goal = GOALS.find(g => g.id === mobility.goal);
            const intent = CONNECTION_INTENTS.find(i => i.id === mobility.connectionIntent);
            const reason = isTraveler
              ? TRAVEL_REASONS.find(r => r.id === mobility.travelReason)
              : LOCAL_REASONS.find(r => r.id === mobility.localReason);

            return (
              <div className="space-y-3">
                {/* Mode Badge */}
                <div className="flex items-center gap-3">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                    isTraveler
                      ? 'bg-accent-400/20 text-accent-400'
                      : 'bg-primary-400/20 text-primary-400'
                  }`}>
                    {isTraveler ? <Plane size={16} /> : <Home size={16} />}
                    {isTraveler ? 'Traveler' : 'Local'}
                  </div>
                  <span className="text-dark-200">
                    {isTraveler ? 'Going to' : 'Living in'} <span className="font-medium text-white">{destination}</span>
                  </span>
                </div>

                {/* Goal & Intent */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {goal && (
                    <div className="flex items-center gap-2 p-3 bg-dark-700 rounded-lg">
                      <Target size={16} className="text-dark-400" />
                      <div>
                        <p className="text-xs text-dark-400">Goal</p>
                        <p className="text-sm font-medium flex items-center gap-1">
                          <span>{goal.icon}</span> {goal.label}
                        </p>
                      </div>
                    </div>
                  )}
                  {intent && (
                    <div className="flex items-center gap-2 p-3 bg-dark-700 rounded-lg">
                      <Compass size={16} className="text-dark-400" />
                      <div>
                        <p className="text-xs text-dark-400">Looking for</p>
                        <p className="text-sm font-medium flex items-center gap-1">
                          <span>{intent.icon}</span> {intent.label}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Reason */}
                {reason && (
                  <div className="flex items-center gap-2 text-sm text-dark-300">
                    <span className="text-dark-400">{isTraveler ? 'Why traveling:' : 'Why participating:'}</span>
                    <span className="text-white">{reason.label}</span>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Bio (Extended Profile - Friends only or own) */}
        {(isOwnProfile || profile.status === 'friends') && (
          <div className="p-6 border-b border-dark-600">
            <h3 className="text-sm text-dark-300 mb-2 flex items-center gap-2">
              <Sparkles size={16} />
              About
            </h3>
            {editing ? (
              <textarea
                value={editData.bio || ''}
                onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                placeholder="Tell people about yourself..."
                className="input resize-none"
                rows={3}
              />
            ) : (
              <p className={displayExtended?.bio ? '' : 'text-dark-400 italic'}>
                {displayExtended?.bio || 'No bio yet'}
              </p>
            )}
          </div>
        )}

        {/* Location (Editable) */}
        {editing && (
          <div className="p-6 border-b border-dark-600">
            <h3 className="text-sm text-dark-300 mb-3 flex items-center gap-2">
              <MapPin size={16} />
              Location
            </h3>
            <LocationSearch
              value={editData.location || { city: '', state: '', country: '', displayPreference: 'city' }}
              onChange={(location) => setEditData({ ...editData, location })}
              placeholder="Search for your city..."
            />
          </div>
        )}

        {/* Why Here */}
        <div className="p-6 border-b border-dark-600">
          <h3 className="text-sm text-dark-300 mb-3 flex items-center gap-2">
            <Heart size={16} />
            Looking for
            {editing && <span className="text-dark-400">({editData.whyHereIds?.length || 0}/3)</span>}
          </h3>
          {editing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {REASONS.map((reason) => {
                const isSelected = editData.whyHereIds?.includes(reason.id);
                const isDisabled = !isSelected && (editData.whyHereIds?.length || 0) >= 3;

                return (
                  <button
                    key={reason.id}
                    onClick={() => toggleReason(reason.id)}
                    disabled={isDisabled}
                    className={`p-3 rounded-xl text-left transition-all duration-200 flex items-center gap-3 ${
                      isSelected
                        ? 'bg-primary-400/20 border-2 border-primary-400'
                        : isDisabled
                          ? 'bg-dark-700 border-2 border-transparent opacity-50 cursor-not-allowed'
                          : 'bg-dark-600 border-2 border-transparent hover:border-dark-500'
                    }`}
                  >
                    <span className="text-xl">{reason.icon}</span>
                    <span className="flex-1 text-sm">{reason.label}</span>
                    {isSelected && <Check size={16} className="text-primary-400" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {displayProfile?.whyHereIds?.length > 0 ? (
                displayProfile.whyHereIds.map((id) => {
                  const reason = REASONS.find((r) => r.id === id);
                  return reason ? (
                    <span
                      key={id}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-400/20 text-primary-400 rounded-full text-sm"
                    >
                      <span>{reason.icon}</span>
                      {reason.label}
                    </span>
                  ) : null;
                })
              ) : (
                <p className="text-dark-400">{displayProfile?.whyHere || 'Not specified'}</p>
              )}
            </div>
          )}
        </div>

        {/* Interests */}
        <div className="p-6 border-b border-dark-600">
          <h3 className="text-sm text-dark-300 mb-3">
            Interests ({(editing ? editData.interests : displayProfile?.interests)?.length || 0}/10)
          </h3>
          {editing ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {/* Show top interests + any selected interests from extras */}
                {TOP_INTERESTS.map((interest) => (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    disabled={!editData.interests?.includes(interest) && (editData.interests?.length || 0) >= 10}
                    className={`px-3 py-1 rounded-full text-sm transition-all ${
                      editData.interests?.includes(interest)
                        ? 'bg-primary-400 text-white'
                        : (editData.interests?.length || 0) >= 10
                          ? 'bg-dark-700 text-dark-500 cursor-not-allowed'
                          : 'bg-dark-600 hover:bg-dark-500'
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>

              {/* Show More button and extra interests */}
              {randomExtraInterests.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-dark-600">
                  {randomExtraInterests.map((interest) => (
                    <button
                      key={interest}
                      onClick={() => toggleInterest(interest)}
                      disabled={!editData.interests?.includes(interest) && (editData.interests?.length || 0) >= 10}
                      className={`px-3 py-1 rounded-full text-sm transition-all ${
                        editData.interests?.includes(interest)
                          ? 'bg-primary-400 text-white'
                          : (editData.interests?.length || 0) >= 10
                            ? 'bg-dark-700 text-dark-500 cursor-not-allowed'
                            : 'bg-dark-600 hover:bg-dark-500'
                      }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              )}

              {/* Show more button - only show if there are more interests to load */}
              {randomExtraInterests.length < EXTRA_INTERESTS.length && (
                <button
                  onClick={() => {
                    // Get interests that haven't been loaded yet
                    const remainingInterests = EXTRA_INTERESTS.filter(
                      i => !randomExtraInterests.includes(i)
                    );
                    // Get next 10 random from remaining
                    const nextBatch = getRandomItems(remainingInterests, 10);
                    setRandomExtraInterests(prev => [...prev, ...nextBatch]);
                    setShowMoreInterests(true);
                  }}
                  className="text-primary-400 text-sm hover:underline"
                >
                  + Show more interests ({EXTRA_INTERESTS.length - randomExtraInterests.length} remaining)
                </button>
              )}

              {/* Show any selected extras that aren't in the current random set */}
              {editData.interests?.filter(i =>
                EXTRA_INTERESTS.includes(i) && !randomExtraInterests.includes(i)
              ).length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="text-xs text-dark-400 w-full">Your selected:</span>
                  {editData.interests?.filter(i =>
                    EXTRA_INTERESTS.includes(i) && !randomExtraInterests.includes(i)
                  ).map((interest) => (
                    <button
                      key={interest}
                      onClick={() => toggleInterest(interest)}
                      className="px-3 py-1 rounded-full text-sm bg-primary-400 text-white"
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {displayProfile?.interests?.map((interest) => (
                <span
                  key={interest}
                  className="px-3 py-1 bg-primary-400/20 text-primary-400 rounded-full text-sm"
                >
                  {interest}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Preferences */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm text-dark-300">Connection Preferences</h3>
            {editing && (
              <span className="text-xs text-dark-400 flex items-center gap-1">
                <Info size={12} />
                Affects who you're matched with
              </span>
            )}
          </div>
          {editing ? (
            <div className="space-y-6">
              {/* Geographic Preference */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🗺️</span>
                  <span className="text-sm font-medium">Where to connect</span>
                </div>
                <p className="text-xs text-dark-400 mb-3">You'll be matched with people from this area</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'local', label: 'Local', icon: '🏠', desc: 'Same city' },
                    { value: 'regional', label: 'Regional', icon: '🏙️', desc: 'Same country' },
                    { value: 'global', label: 'Global', icon: '🌍', desc: 'Anywhere' },
                    { value: 'online-only', label: 'Online Only', icon: '💻', desc: 'No preference' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() =>
                        setEditData({
                          ...editData,
                          preferences: { ...editData.preferences, geographic: opt.value },
                        })
                      }
                      className={`p-3 rounded-lg text-left transition-all ${
                        editData.preferences?.geographic === opt.value
                          ? 'bg-primary-400/20 border-2 border-primary-400'
                          : 'bg-dark-600 border-2 border-transparent hover:border-dark-500'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{opt.icon}</span>
                        <div>
                          <span className="text-sm font-medium block">{opt.label}</span>
                          <span className="text-xs text-dark-400">{opt.desc}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Age Range Preference */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium">Age range</span>
                </div>
                <p className="text-xs text-dark-400 mb-3">Match with people within this age range of you</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: '±5', label: '± 5 years', desc: 'Close to my age' },
                    { value: '±10', label: '± 10 years', desc: 'Moderate range' },
                    { value: '±15', label: '± 15 years', desc: 'Wide range' },
                    { value: 'any', label: 'Any age', desc: 'No limit' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() =>
                        setEditData({
                          ...editData,
                          preferences: { ...editData.preferences, ageRange: opt.value },
                        })
                      }
                      className={`p-3 rounded-lg text-left transition-all ${
                        editData.preferences?.ageRange === opt.value
                          ? 'bg-accent-400/20 border-2 border-accent-400'
                          : 'bg-dark-600 border-2 border-transparent hover:border-dark-500'
                      }`}
                    >
                      <div>
                        <span className="text-sm font-medium block">{opt.label}</span>
                        <span className="text-xs text-dark-400">{opt.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Communication Preference */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">💬</span>
                  <span className="text-sm font-medium">Communication style</span>
                </div>
                <p className="text-xs text-dark-400 mb-3">How you prefer to chat with matches</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'text', label: 'Text', icon: '⌨️', desc: 'Messages' },
                    { value: 'voice', label: 'Voice', icon: '🎤', desc: 'Calls' },
                    { value: 'both', label: 'Both', icon: '📱', desc: 'Any' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() =>
                        setEditData({
                          ...editData,
                          preferences: { ...editData.preferences, communication: opt.value },
                        })
                      }
                      className={`p-3 rounded-lg text-center transition-all ${
                        editData.preferences?.communication === opt.value
                          ? 'bg-success-400/20 border-2 border-success-400'
                          : 'bg-dark-600 border-2 border-transparent hover:border-dark-500'
                      }`}
                    >
                      <span className="text-xl block mb-1">{opt.icon}</span>
                      <span className="text-sm">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 bg-dark-700 rounded-lg">
                <span className="text-xl">
                  {displayProfile?.preferences?.geographic === 'local' ? '🏠' :
                   displayProfile?.preferences?.geographic === 'regional' ? '🏙️' :
                   displayProfile?.preferences?.geographic === 'online-only' ? '💻' : '🌍'}
                </span>
                <div>
                  <p className="text-xs text-dark-400">Location</p>
                  <p className="capitalize text-sm font-medium">
                    {displayProfile?.preferences?.geographic || 'Global'}
                  </p>
                </div>
              </div>
              <div className="p-3 bg-dark-700 rounded-lg">
                <p className="text-xs text-dark-400">Age Range</p>
                <p className="text-sm font-medium">
                  {displayProfile?.preferences?.ageRange === 'any' ? 'Any age' :
                   displayProfile?.preferences?.ageRange || 'Any age'}
                </p>
              </div>
              <div className="flex items-center gap-3 p-3 bg-dark-700 rounded-lg">
                <span className="text-xl">
                  {displayProfile?.preferences?.communication === 'text' ? '⌨️' :
                   displayProfile?.preferences?.communication === 'voice' ? '🎤' : '📱'}
                </span>
                <div>
                  <p className="text-xs text-dark-400">Communication</p>
                  <p className="capitalize text-sm font-medium">
                    {displayProfile?.preferences?.communication === 'text' ? 'Text' :
                     displayProfile?.preferences?.communication === 'voice' ? 'Voice' : 'Text & Voice'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Edit Actions */}
        {editing && (
          <div className="p-6 border-t border-dark-600 flex gap-3">
            <button
              onClick={() => {
                setEditing(false);
                setEditData({
                  name: userProfile?.profile?.name || '',
                  bio: userProfile?.extendedProfile?.bio || '',
                  location: userProfile?.profile?.location || { city: '', country: '' },
                  interests: userProfile?.profile?.interests || [],
                  preferences: userProfile?.profile?.preferences || {},
                  photoUrl: userProfile?.profile?.photoUrl || null,
                  whyHereIds: userProfile?.profile?.whyHereIds || [],
                });
              }}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={20} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default Profile;
