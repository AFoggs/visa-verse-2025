import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowLeft,
  MapPin,
  Calendar,
  Globe,
  Users,
  MessageSquare,
  Sparkles,
  Check,
  Info,
  Heart,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LocationSearch from '../components/LocationSearch';

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

// Helper to get random items from array
function getRandomItems(arr, count) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

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

function Onboarding() {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState({
    name: '',
    dateOfBirth: '',
    location: { city: '', state: '', country: '', displayPreference: 'city' },
    whyHere: [], // Now an array for multiple selections
    interests: [],
    preferences: {
      geographic: 'global',
      ageRange: 'any',
      communication: 'both',
    },
  });
  const [loading, setLoading] = useState(false);
  const [showMoreInterests, setShowMoreInterests] = useState(false);
  const [randomExtraInterests, setRandomExtraInterests] = useState([]);

  const { userProfile, completeOnboarding } = useAuth();
  const navigate = useNavigate();

  // Pre-fill name from registration
  useEffect(() => {
    if (userProfile?.profile?.name) {
      setProfile((prev) => ({ ...prev, name: userProfile.profile.name }));
    }
  }, [userProfile]);

  // Calculate age from DOB
  const calculatedAge = useMemo(() => {
    if (!profile.dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(profile.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }, [profile.dateOfBirth]);

  const isAdult = calculatedAge !== null && calculatedAge >= 18;

  // Max date for DOB (must be at least 18 years old)
  const maxDOB = useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 18);
    return date.toISOString().split('T')[0];
  }, []);

  // Min date for DOB (reasonable limit of 120 years)
  const minDOB = useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 120);
    return date.toISOString().split('T')[0];
  }, []);

  const totalSteps = 5;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const toggleInterest = (interest) => {
    setProfile((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : prev.interests.length < 10
          ? [...prev.interests, interest]
          : prev.interests,
    }));
  };

  const toggleReason = (reasonId) => {
    setProfile((prev) => ({
      ...prev,
      whyHere: prev.whyHere.includes(reasonId)
        ? prev.whyHere.filter((r) => r !== reasonId)
        : prev.whyHere.length < 3
          ? [...prev.whyHere, reasonId]
          : prev.whyHere,
    }));
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      // Convert whyHere array to labels for storage
      const whyHereLabels = profile.whyHere.map(id =>
        REASONS.find(r => r.id === id)?.label || id
      );

      const profileData = {
        profile: {
          ...profile,
          age: calculatedAge,
          whyHere: whyHereLabels.join(', '),
          whyHereIds: profile.whyHere, // Store IDs too for reference
        },
      };
      await completeOnboarding(profileData);
      navigate('/dashboard');
    } catch (error) {
      console.error('Onboarding error:', error);
    } finally {
      setLoading(false);
    }
  };

  const isStepValid = () => {
    switch (step) {
      case 1:
        return profile.name.trim().length >= 2 && isAdult;
      case 2:
        return profile.location.city.trim() && profile.location.country.trim();
      case 3:
        return profile.whyHere.length >= 1 && profile.whyHere.length <= 3;
      case 4:
        return profile.interests.length >= 5;
      case 5:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-dark-800 flex flex-col">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-dark-700 z-50">
        <motion.div
          className="h-full bg-gradient-to-r from-primary-400 to-accent-400"
          initial={{ width: 0 }}
          animate={{ width: `${(step / totalSteps) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4 pt-12">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            {/* Step 1: Basic Info with DOB */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="card"
              >
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400/20 to-accent-400/20 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="text-primary-400" size={32} />
                  </div>
                  <h1 className="text-2xl font-bold mb-2">Let's Get to Know You</h1>
                  <p className="text-dark-300">First, some basics about yourself</p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm text-dark-200 mb-2">What should we call you?</label>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      placeholder="Your name"
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-dark-200 mb-2">
                      <Calendar className="inline mr-2" size={16} />
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={profile.dateOfBirth}
                      onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value })}
                      max={maxDOB}
                      min={minDOB}
                      className="input"
                    />
                    {profile.dateOfBirth && (
                      <div className="mt-2">
                        {isAdult ? (
                          <p className="text-success-400 text-sm flex items-center gap-2">
                            <Check size={16} />
                            You are {calculatedAge} years old
                          </p>
                        ) : (
                          <p className="text-red-400 text-sm flex items-center gap-2">
                            <Info size={16} />
                            You must be at least 18 years old to use 3Degrees
                          </p>
                        )}
                      </div>
                    )}
                    <p className="text-dark-400 text-xs mt-2">
                      Your exact date of birth won't be shared. Only your age will be visible to others.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Location */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="card"
              >
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400/20 to-accent-400/20 flex items-center justify-center mx-auto mb-4">
                    <MapPin className="text-primary-400" size={32} />
                  </div>
                  <h1 className="text-2xl font-bold mb-2">Where Are You?</h1>
                  <p className="text-dark-300">This helps us find connections near you</p>
                </div>

                <LocationSearch
                  value={profile.location}
                  onChange={(location) => setProfile({ ...profile, location })}
                  placeholder="Search for your city..."
                />
              </motion.div>
            )}

            {/* Step 3: Why Here - Multi-select */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="card"
              >
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400/20 to-accent-400/20 flex items-center justify-center mx-auto mb-4">
                    <Heart className="text-primary-400" size={32} />
                  </div>
                  <h1 className="text-2xl font-bold mb-2">Why Are You Here?</h1>
                  <p className="text-dark-300">
                    Select up to 3 reasons ({profile.whyHere.length}/3 selected)
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {REASONS.map((reason) => {
                    const isSelected = profile.whyHere.includes(reason.id);
                    const isDisabled = !isSelected && profile.whyHere.length >= 3;

                    return (
                      <button
                        key={reason.id}
                        onClick={() => toggleReason(reason.id)}
                        disabled={isDisabled}
                        className={`p-4 rounded-xl text-left transition-all duration-200 ${
                          isSelected
                            ? 'bg-primary-400/20 border-2 border-primary-400'
                            : isDisabled
                              ? 'bg-dark-700 border-2 border-transparent opacity-50 cursor-not-allowed'
                              : 'bg-dark-600 border-2 border-transparent hover:border-dark-500'
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <span className="text-2xl">{reason.icon}</span>
                          <span className="flex-1">{reason.label}</span>
                          {isSelected && <Check size={18} className="text-primary-400" />}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {profile.whyHere.length === 0 && (
                  <p className="text-center text-amber-400 text-sm mt-4">
                    Please select at least 1 reason
                  </p>
                )}
              </motion.div>
            )}

            {/* Step 4: Interests */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="card"
              >
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400/20 to-accent-400/20 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="text-primary-400" size={32} />
                  </div>
                  <h1 className="text-2xl font-bold mb-2">What Are You Into?</h1>
                  <p className="text-dark-300">
                    Select 5-10 interests ({profile.interests.length}/10 selected)
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Top 30 interests */}
                  <div className="flex flex-wrap gap-2 justify-center">
                    {TOP_INTERESTS.map((interest) => (
                      <button
                        key={interest}
                        onClick={() => toggleInterest(interest)}
                        disabled={!profile.interests.includes(interest) && profile.interests.length >= 10}
                        className={`px-4 py-2 rounded-full text-sm transition-all duration-200 ${
                          profile.interests.includes(interest)
                            ? 'bg-primary-400 text-white'
                            : profile.interests.length >= 10
                              ? 'bg-dark-700 text-dark-500 cursor-not-allowed'
                              : 'bg-dark-600 hover:bg-dark-500'
                        }`}
                      >
                        {interest}
                      </button>
                    ))}
                  </div>

                  {/* Show More button and extra interests */}
                  {!showMoreInterests ? (
                    <div className="text-center">
                      <button
                        onClick={() => {
                          setRandomExtraInterests(getRandomItems(EXTRA_INTERESTS, 10));
                          setShowMoreInterests(true);
                        }}
                        className="text-primary-400 text-sm hover:underline"
                      >
                        + See more interests
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2 justify-center pt-3 border-t border-dark-600">
                        {randomExtraInterests.map((interest) => (
                          <button
                            key={interest}
                            onClick={() => toggleInterest(interest)}
                            disabled={!profile.interests.includes(interest) && profile.interests.length >= 10}
                            className={`px-4 py-2 rounded-full text-sm transition-all duration-200 ${
                              profile.interests.includes(interest)
                                ? 'bg-primary-400 text-white'
                                : profile.interests.length >= 10
                                  ? 'bg-dark-700 text-dark-500 cursor-not-allowed'
                                  : 'bg-dark-600 hover:bg-dark-500'
                            }`}
                          >
                            {interest}
                          </button>
                        ))}
                      </div>
                      <div className="text-center">
                        <button
                          onClick={() => {
                            setRandomExtraInterests(getRandomItems(EXTRA_INTERESTS, 10));
                          }}
                          className="text-dark-400 text-sm hover:text-primary-400"
                        >
                          ↻ Show different interests
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Show any selected extras that aren't in the current random set */}
                  {profile.interests.filter(i =>
                    EXTRA_INTERESTS.includes(i) && !randomExtraInterests.includes(i)
                  ).length > 0 && (
                    <div className="flex flex-wrap gap-2 justify-center pt-3">
                      <span className="text-xs text-dark-400 w-full text-center">Your selected:</span>
                      {profile.interests.filter(i =>
                        EXTRA_INTERESTS.includes(i) && !randomExtraInterests.includes(i)
                      ).map((interest) => (
                        <button
                          key={interest}
                          onClick={() => toggleInterest(interest)}
                          className="px-4 py-2 rounded-full text-sm bg-primary-400 text-white"
                        >
                          {interest}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {profile.interests.length < 5 && (
                  <p className="text-center text-amber-400 text-sm mt-4">
                    Please select at least 5 interests
                  </p>
                )}
              </motion.div>
            )}

            {/* Step 5: Preferences - Improved */}
            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="card"
              >
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400/20 to-accent-400/20 flex items-center justify-center mx-auto mb-4">
                    <Users className="text-primary-400" size={32} />
                  </div>
                  <h1 className="text-2xl font-bold mb-2">Connection Preferences</h1>
                  <p className="text-dark-300">
                    These settings help us find better matches for you within the app
                  </p>
                </div>

                <div className="space-y-8">
                  {/* Geographic */}
                  <div>
                    <div className="flex items-start gap-3 mb-3">
                      <Globe className="text-primary-400 mt-0.5" size={20} />
                      <div>
                        <label className="block text-sm font-medium text-dark-100">
                          Geographic Preference
                        </label>
                        <p className="text-xs text-dark-400 mt-1">
                          Where would you like your connections to be from?
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'local', label: 'Local', desc: 'Same city' },
                        { value: 'regional', label: 'Regional', desc: 'Same country' },
                        { value: 'global', label: 'Global', desc: 'Anywhere in the world' },
                        { value: 'online-only', label: 'Online Only', desc: 'No location preference' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() =>
                            setProfile({
                              ...profile,
                              preferences: { ...profile.preferences, geographic: opt.value },
                            })
                          }
                          className={`p-3 rounded-lg text-left transition-all ${
                            profile.preferences.geographic === opt.value
                              ? 'bg-primary-400/20 border-2 border-primary-400'
                              : 'bg-dark-600 border-2 border-transparent hover:border-dark-500'
                          }`}
                        >
                          <span className="block text-sm font-medium">{opt.label}</span>
                          <span className="block text-xs text-dark-400">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Age Range */}
                  <div>
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-dark-100">
                        Age Range Preference
                      </label>
                      <p className="text-xs text-dark-400 mt-1">
                        Match with people within this age range of you
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: '±5', label: '± 5 years', desc: 'Close to your age' },
                        { value: '±10', label: '± 10 years', desc: 'Moderate range' },
                        { value: '±15', label: '± 15 years', desc: 'Wide range' },
                        { value: 'any', label: 'No preference', desc: 'Open to all ages' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() =>
                            setProfile({
                              ...profile,
                              preferences: { ...profile.preferences, ageRange: opt.value },
                            })
                          }
                          className={`p-3 rounded-lg text-left transition-all ${
                            profile.preferences.ageRange === opt.value
                              ? 'bg-primary-400/20 border-2 border-primary-400'
                              : 'bg-dark-600 border-2 border-transparent hover:border-dark-500'
                          }`}
                        >
                          <span className="block text-sm font-medium">{opt.label}</span>
                          <span className="block text-xs text-dark-400">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Communication */}
                  <div>
                    <div className="flex items-start gap-3 mb-3">
                      <MessageSquare className="text-primary-400 mt-0.5" size={20} />
                      <div>
                        <label className="block text-sm font-medium text-dark-100">
                          Communication Style
                        </label>
                        <p className="text-xs text-dark-400 mt-1">
                          How do you prefer to communicate in the app?
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 'text', label: 'Text', desc: 'Messages only' },
                        { value: 'voice', label: 'Voice', desc: 'Voice/Video calls' },
                        { value: 'both', label: 'Both', desc: 'Any communication' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() =>
                            setProfile({
                              ...profile,
                              preferences: { ...profile.preferences, communication: opt.value },
                            })
                          }
                          className={`p-3 rounded-lg text-center transition-all ${
                            profile.preferences.communication === opt.value
                              ? 'bg-primary-400/20 border-2 border-primary-400'
                              : 'bg-dark-600 border-2 border-transparent hover:border-dark-500'
                          }`}
                        >
                          <span className="block text-sm font-medium">{opt.label}</span>
                          <span className="block text-xs text-dark-400">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-dark-700 rounded-lg">
                  <p className="text-xs text-dark-300 flex items-start gap-2">
                    <Info size={14} className="flex-shrink-0 mt-0.5" />
                    These preferences help us suggest better matches within 3Degrees.
                    You can change these anytime in your profile settings.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation buttons */}
          <div className="flex justify-between mt-6">
            <button
              onClick={handleBack}
              disabled={step === 1}
              className={`btn-ghost flex items-center gap-2 ${step === 1 ? 'invisible' : ''}`}
            >
              <ArrowLeft size={20} />
              Back
            </button>

            {step < totalSteps ? (
              <button
                onClick={handleNext}
                disabled={!isStepValid()}
                className="btn-primary flex items-center gap-2"
              >
                Continue
                <ArrowRight size={20} />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={loading}
                className="btn-success flex items-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Complete Setup
                    <Check size={20} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Onboarding;
