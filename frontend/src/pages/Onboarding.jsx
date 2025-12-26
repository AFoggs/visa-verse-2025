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
  Plane,
  Home,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LocationSearch from '../components/LocationSearch';
import DestinationSearch from '../components/DestinationSearch';
import { userApi } from '../services/api';

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

// Mobility goals
const GOALS = [
  { id: 'MAKE_FRIENDS', label: 'Make new friends', icon: '👋' },
  { id: 'FEEL_WELCOME', label: 'Feel welcome in a new place', icon: '🏠' },
  { id: 'HELP_OTHERS', label: 'Help newcomers feel at home', icon: '🤝' },
  { id: 'BUILD_NETWORK', label: 'Build my professional network', icon: '💼' },
  { id: 'EXPLORE_CITY', label: 'Explore the city with others', icon: '🗺️' },
];

// Connection intents
const CONNECTION_INTENTS = [
  { id: 'COMMUNITY', label: 'Community & Social', desc: 'Friendship, belonging, social events', icon: '💙' },
  { id: 'CAREER', label: 'Career & Professional', desc: 'Networking, mentorship, opportunities', icon: '💼' },
  { id: 'EXPERIENCE', label: 'Experience & Activities', desc: 'Tourism, activities, adventures', icon: '🎯' },
];

// Travel reasons (for travelers)
const TRAVEL_REASONS = [
  { id: 'RELOCATING', label: 'Relocating permanently', icon: '📦' },
  { id: 'SCHOOL', label: 'Studying abroad', icon: '📚' },
  { id: 'CAREER', label: 'Work or career opportunity', icon: '💼' },
  { id: 'TOURISM', label: 'Tourism or vacation', icon: '🌴' },
  { id: 'FAMILY', label: 'Family reasons', icon: '👨‍👩‍👧' },
  { id: 'OTHER', label: 'Other', icon: '✨' },
];

// Local reasons (for locals)
const LOCAL_REASONS = [
  { id: 'WELCOME_OTHERS', label: 'Welcome newcomers to my city', icon: '🏠' },
  { id: 'CULTURAL_EXCHANGE', label: 'Cultural exchange', icon: '🌍' },
  { id: 'COMMUNITY_BUILDING', label: 'Help build community', icon: '🤝' },
  { id: 'PROFESSIONAL_NETWORK', label: 'Professional networking', icon: '💼' },
  { id: 'LANGUAGE_PRACTICE', label: 'Language practice', icon: '🗣️' },
  { id: 'OTHER', label: 'Other', icon: '✨' },
];


function Onboarding() {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState({
    name: '',
    dateOfBirth: '',
    location: { city: '', state: '', country: '', displayPreference: 'city' },
    whyHere: [],
    interests: [],
    preferences: {
      geographic: 'global',
      ageRange: 'any',
      communication: 'both',
    },
  });
  const [mobility, setMobility] = useState({
    mode: '', // 'LOCAL' or 'TRAVELER'
    area: { country: '', city: '' },
    travelReason: '',
    localReason: '',
    goal: '',
    connectionIntent: '',
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
  const isValidAge = calculatedAge !== null && calculatedAge >= 18 && calculatedAge <= 100;

  // Max date for DOB (must be at least 18 years old)
  const maxDOB = useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 18);
    return date.toISOString().split('T')[0];
  }, []);

  // Min date for DOB (reasonable limit of 100 years)
  const minDOB = useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 100);
    return date.toISOString().split('T')[0];
  }, []);

  const totalSteps = 6;

  const handleNext = () => {
    if (step < totalSteps) {
      // For locals moving from step 5 to 6, auto-fill location from mobility.area
      // since their destination IS their current location
      if (step === 5 && mobility.mode === 'LOCAL') {
        setProfile((prev) => ({
          ...prev,
          location: {
            city: mobility.area.city || '',
            state: '',
            country: mobility.area.country || '',
            displayPreference: 'city',
          },
        }));
      }
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

  const handleComplete = async () => {
    setLoading(true);
    try {
      // First update mobility
      await userApi.updateMobility({
        mode: mobility.mode,
        area: mobility.area,
        travelReason: mobility.mode === 'TRAVELER' ? mobility.travelReason : null,
        localReason: mobility.mode === 'LOCAL' ? mobility.localReason : null,
        goal: mobility.goal,
        connectionIntent: mobility.connectionIntent,
      });

      // Then complete profile
      const profileData = {
        profile: {
          ...profile,
          age: calculatedAge,
          whyHere: mobility.mode === 'TRAVELER'
            ? TRAVEL_REASONS.find(r => r.id === mobility.travelReason)?.label || ''
            : LOCAL_REASONS.find(r => r.id === mobility.localReason)?.label || '',
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
        return profile.name.trim().length >= 2 && isValidAge;
      case 2:
        return mobility.mode !== '';
      case 3:
        return mobility.area.country.trim().length > 0 &&
               (mobility.mode === 'TRAVELER' ? mobility.travelReason !== '' : mobility.localReason !== '');
      case 4:
        return mobility.goal !== '' && mobility.connectionIntent !== '';
      case 5:
        return profile.interests.length >= 5;
      case 6:
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
                  <h1 className="text-2xl font-bold mb-2">Welcome to 3Degrees</h1>
                  <p className="text-dark-300">Let's get you connected with the right people</p>
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
                        {isValidAge ? (
                          <p className="text-success-400 text-sm flex items-center gap-2">
                            <Check size={16} />
                            You are {calculatedAge} years old
                          </p>
                        ) : calculatedAge !== null && calculatedAge > 100 ? (
                          <p className="text-red-400 text-sm flex items-center gap-2">
                            <Info size={16} />
                            Please enter a valid date of birth
                          </p>
                        ) : (
                          <p className="text-red-400 text-sm flex items-center gap-2">
                            <Info size={16} />
                            You must be at least 18 years old to use 3Degrees
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Mode Selection (Local or Traveler) */}
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
                    <Globe className="text-primary-400" size={32} />
                  </div>
                  <h1 className="text-2xl font-bold mb-2">Are You a Local or Traveler?</h1>
                  <p className="text-dark-300">We'll match locals with travelers headed to the same destination</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => setMobility({ ...mobility, mode: 'LOCAL', travelReason: '' })}
                    className={`p-6 rounded-xl text-left transition-all duration-200 ${
                      mobility.mode === 'LOCAL'
                        ? 'bg-primary-400/20 border-2 border-primary-400'
                        : 'bg-dark-600 border-2 border-transparent hover:border-dark-500'
                    }`}
                  >
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-12 h-12 rounded-xl bg-primary-400/20 flex items-center justify-center">
                        <Home className="text-primary-400" size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">I'm a Local</h3>
                        <p className="text-sm text-dark-400">I live here</p>
                      </div>
                    </div>
                    <p className="text-dark-300 text-sm">
                      I want to welcome newcomers, share my city, and connect with travelers coming to my area.
                    </p>
                  </button>

                  <button
                    onClick={() => setMobility({ ...mobility, mode: 'TRAVELER', localReason: '' })}
                    className={`p-6 rounded-xl text-left transition-all duration-200 ${
                      mobility.mode === 'TRAVELER'
                        ? 'bg-accent-400/20 border-2 border-accent-400'
                        : 'bg-dark-600 border-2 border-transparent hover:border-dark-500'
                    }`}
                  >
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-12 h-12 rounded-xl bg-accent-400/20 flex items-center justify-center">
                        <Plane className="text-accent-400" size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">I'm a Traveler</h3>
                        <p className="text-sm text-dark-400">I'm going somewhere</p>
                      </div>
                    </div>
                    <p className="text-dark-300 text-sm">
                      I'm relocating, studying, working, or visiting somewhere new and want to connect with people there.
                    </p>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Destination and Reason */}
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
                    <MapPin className="text-primary-400" size={32} />
                  </div>
                  <h1 className="text-2xl font-bold mb-2">
                    {mobility.mode === 'LOCAL' ? 'Where Do You Live?' : 'Where Are You Going?'}
                  </h1>
                  <p className="text-dark-300">
                    {mobility.mode === 'LOCAL'
                      ? 'Select your home country and city to connect with travelers'
                      : 'Select your destination to find locals who can welcome you'}
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Country and City Selection */}
                  <DestinationSearch
                    value={mobility.area}
                    onChange={(area) => setMobility({ ...mobility, area })}
                    mode={mobility.mode}
                  />

                  {/* Reason based on mode */}
                  <div>
                    <label className="block text-sm text-dark-200 mb-3">
                      {mobility.mode === 'LOCAL' ? 'Why do you want to connect?' : 'Why are you traveling?'} *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(mobility.mode === 'LOCAL' ? LOCAL_REASONS : TRAVEL_REASONS).map((reason) => {
                        const isSelected = mobility.mode === 'LOCAL'
                          ? mobility.localReason === reason.id
                          : mobility.travelReason === reason.id;

                        return (
                          <button
                            key={reason.id}
                            onClick={() => {
                              if (mobility.mode === 'LOCAL') {
                                setMobility({ ...mobility, localReason: reason.id });
                              } else {
                                setMobility({ ...mobility, travelReason: reason.id });
                              }
                            }}
                            className={`p-3 rounded-xl text-left transition-all duration-200 ${
                              isSelected
                                ? 'bg-primary-400/20 border-2 border-primary-400'
                                : 'bg-dark-600 border-2 border-transparent hover:border-dark-500'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span className="text-xl">{reason.icon}</span>
                              <span className="text-sm">{reason.label}</span>
                              {isSelected && <Check size={16} className="text-primary-400 ml-auto" />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Goal and Connection Intent */}
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
                    <Heart className="text-primary-400" size={32} />
                  </div>
                  <h1 className="text-2xl font-bold mb-2">What Are You Looking For?</h1>
                  <p className="text-dark-300">These help us show you why each match fits your goals</p>
                </div>

                <div className="space-y-6">
                  {/* Primary Goal */}
                  <div>
                    <label className="block text-sm text-dark-200 mb-3">Your primary goal *</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {GOALS.map((goal) => (
                        <button
                          key={goal.id}
                          onClick={() => setMobility({ ...mobility, goal: goal.id })}
                          className={`p-3 rounded-xl text-left transition-all duration-200 ${
                            mobility.goal === goal.id
                              ? 'bg-primary-400/20 border-2 border-primary-400'
                              : 'bg-dark-600 border-2 border-transparent hover:border-dark-500'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span className="text-xl">{goal.icon}</span>
                            <span className="text-sm">{goal.label}</span>
                            {mobility.goal === goal.id && <Check size={16} className="text-primary-400 ml-auto" />}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Connection Intent */}
                  <div>
                    <label className="block text-sm text-dark-200 mb-3">What type of connections? *</label>
                    <div className="space-y-2">
                      {CONNECTION_INTENTS.map((intent) => (
                        <button
                          key={intent.id}
                          onClick={() => setMobility({ ...mobility, connectionIntent: intent.id })}
                          className={`w-full p-4 rounded-xl text-left transition-all duration-200 ${
                            mobility.connectionIntent === intent.id
                              ? 'bg-primary-400/20 border-2 border-primary-400'
                              : 'bg-dark-600 border-2 border-transparent hover:border-dark-500'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{intent.icon}</span>
                            <div className="flex-1">
                              <span className="block font-medium">{intent.label}</span>
                              <span className="block text-sm text-dark-400">{intent.desc}</span>
                            </div>
                            {mobility.connectionIntent === intent.id && (
                              <Check size={20} className="text-primary-400" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 5: Interests */}
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
                    <Sparkles className="text-primary-400" size={32} />
                  </div>
                  <h1 className="text-2xl font-bold mb-2">What Are You Into?</h1>
                  <p className="text-dark-300">
                    We'll find people who share your interests ({profile.interests.length}/10)
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

            {/* Step 6: Review & Location */}
            {step === 6 && (
              <motion.div
                key="step6"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="card"
              >
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400/20 to-accent-400/20 flex items-center justify-center mx-auto mb-4">
                    <Users className="text-primary-400" size={32} />
                  </div>
                  <h1 className="text-2xl font-bold mb-2">Almost Done!</h1>
                  <p className="text-dark-300">Just need your current location to finish setting up</p>
                </div>

                <div className="space-y-6">
                  {/* Current Location */}
                  <div>
                    <label className="block text-sm text-dark-200 mb-2">
                      <MapPin className="inline mr-2" size={16} />
                      Your Current Location
                    </label>
                    {mobility.mode === 'LOCAL' && profile.location.country && (
                      <p className="text-xs text-success-400 mb-2">
                        Auto-filled from your destination since you're a local. You can change it if needed.
                      </p>
                    )}
                    <LocationSearch
                      value={profile.location}
                      onChange={(location) => setProfile({ ...profile, location })}
                      placeholder="Search for your current city..."
                    />
                    {mobility.mode !== 'LOCAL' && (
                      <p className="text-xs text-dark-400 mt-2">
                        This is where you are now, not your destination.
                      </p>
                    )}
                  </div>

                  {/* Summary */}
                  <div className="bg-dark-700 rounded-xl p-4 space-y-3">
                    <h3 className="font-medium text-dark-200 mb-2">Your Profile Summary</h3>

                    <div className="flex items-center gap-2">
                      {mobility.mode === 'LOCAL' ? (
                        <Home size={16} className="text-primary-400" />
                      ) : (
                        <Plane size={16} className="text-accent-400" />
                      )}
                      <span className="text-sm">
                        {mobility.mode === 'LOCAL' ? 'Local' : 'Traveler'} in{' '}
                        <strong>{mobility.area.city ? `${mobility.area.city}, ` : ''}{mobility.area.country}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm text-dark-300">
                        Looking for: {GOALS.find(g => g.id === mobility.goal)?.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm text-dark-300">
                        Connection type: {CONNECTION_INTENTS.find(c => c.id === mobility.connectionIntent)?.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1 pt-2">
                      {profile.interests.slice(0, 5).map(interest => (
                        <span key={interest} className="px-2 py-0.5 bg-primary-400/20 text-primary-400 rounded-full text-xs">
                          {interest}
                        </span>
                      ))}
                      {profile.interests.length > 5 && (
                        <span className="px-2 py-0.5 bg-dark-600 rounded-full text-xs">
                          +{profile.interests.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-dark-700 rounded-lg">
                    <p className="text-xs text-dark-300 flex items-start gap-2">
                      <Info size={14} className="flex-shrink-0 mt-0.5" />
                      You can change any of these settings later in your profile.
                    </p>
                  </div>
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
                disabled={loading || !profile.location.city || !profile.location.country}
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
