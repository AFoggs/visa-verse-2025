import { useState } from 'react';
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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const INTERESTS = [
  'Technology', 'Gaming', 'Music', 'Movies', 'Travel', 'Fitness',
  'Cooking', 'Reading', 'Art', 'Photography', 'Nature', 'Science',
  'Sports', 'Fashion', 'Writing', 'Podcasts', 'Anime', 'Pets',
  'Entrepreneurship', 'Philosophy', 'Languages', 'Dancing', 'Yoga',
  'Hiking', 'Board Games', 'Crafts', 'Volunteering', 'Meditation',
];

const REASONS = [
  'Make new friends',
  'Find people with similar interests',
  'Expand my social circle',
  'Practice communication skills',
  'Meet people from different cultures',
  'Combat loneliness',
  'Find activity partners',
  'Just curious to try it',
];

function Onboarding() {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState({
    name: '',
    age: '',
    location: { city: '', country: '' },
    whyHere: '',
    interests: [],
    preferences: {
      geographic: 'global',
      ageRange: 'any',
      communication: 'both',
    },
  });
  const [loading, setLoading] = useState(false);

  const { userProfile, completeOnboarding } = useAuth();
  const navigate = useNavigate();

  // Pre-fill name from registration
  useState(() => {
    if (userProfile?.profile?.name) {
      setProfile((prev) => ({ ...prev, name: userProfile.profile.name }));
    }
  }, [userProfile]);

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

  const handleComplete = async () => {
    setLoading(true);
    try {
      await completeOnboarding({ profile });
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
        return profile.name.trim().length >= 2 && profile.age >= 13 && profile.age <= 120;
      case 2:
        return profile.location.city.trim() && profile.location.country.trim();
      case 3:
        return profile.whyHere.length > 0;
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
            {/* Step 1: Basic Info */}
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
                      How old are you?
                    </label>
                    <input
                      type="number"
                      value={profile.age}
                      onChange={(e) => setProfile({ ...profile, age: parseInt(e.target.value) || '' })}
                      placeholder="Your age"
                      min={13}
                      max={120}
                      className="input"
                    />
                    <p className="text-dark-400 text-sm mt-1">You must be at least 13 years old</p>
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

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm text-dark-200 mb-2">City</label>
                    <input
                      type="text"
                      value={profile.location.city}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          location: { ...profile.location, city: e.target.value },
                        })
                      }
                      placeholder="Your city"
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-dark-200 mb-2">Country</label>
                    <input
                      type="text"
                      value={profile.location.country}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          location: { ...profile.location, country: e.target.value },
                        })
                      }
                      placeholder="Your country"
                      className="input"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Why Here */}
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
                    <Users className="text-primary-400" size={32} />
                  </div>
                  <h1 className="text-2xl font-bold mb-2">Why Are You Here?</h1>
                  <p className="text-dark-300">What brings you to 3Degrees?</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {REASONS.map((reason) => (
                    <button
                      key={reason}
                      onClick={() => setProfile({ ...profile, whyHere: reason })}
                      className={`p-4 rounded-xl text-left transition-all duration-200 ${
                        profile.whyHere === reason
                          ? 'bg-primary-400/20 border-2 border-primary-400'
                          : 'bg-dark-600 border-2 border-transparent hover:border-dark-500'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {profile.whyHere === reason && <Check size={18} className="text-primary-400" />}
                        {reason}
                      </span>
                    </button>
                  ))}
                </div>
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

                <div className="flex flex-wrap gap-2 justify-center">
                  {INTERESTS.map((interest) => (
                    <button
                      key={interest}
                      onClick={() => toggleInterest(interest)}
                      className={`px-4 py-2 rounded-full text-sm transition-all duration-200 ${
                        profile.interests.includes(interest)
                          ? 'bg-primary-400 text-white'
                          : 'bg-dark-600 hover:bg-dark-500'
                      }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>

                {profile.interests.length < 5 && (
                  <p className="text-center text-amber-400 text-sm mt-4">
                    Please select at least 5 interests
                  </p>
                )}
              </motion.div>
            )}

            {/* Step 5: Preferences */}
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
                    <Globe className="text-primary-400" size={32} />
                  </div>
                  <h1 className="text-2xl font-bold mb-2">Your Preferences</h1>
                  <p className="text-dark-300">Who would you like to connect with?</p>
                </div>

                <div className="space-y-6">
                  {/* Geographic */}
                  <div>
                    <label className="block text-sm text-dark-200 mb-3">
                      <Globe className="inline mr-2" size={16} />
                      Geographic Preference
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'local', label: 'Local' },
                        { value: 'regional', label: 'Regional' },
                        { value: 'global', label: 'Global' },
                        { value: 'online-only', label: 'Online Only' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() =>
                            setProfile({
                              ...profile,
                              preferences: { ...profile.preferences, geographic: opt.value },
                            })
                          }
                          className={`p-3 rounded-lg text-sm transition-all ${
                            profile.preferences.geographic === opt.value
                              ? 'bg-primary-400/20 border-2 border-primary-400'
                              : 'bg-dark-600 border-2 border-transparent'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Age Range */}
                  <div>
                    <label className="block text-sm text-dark-200 mb-3">
                      <Calendar className="inline mr-2" size={16} />
                      Age Range Preference
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: '±5', label: '±5 years' },
                        { value: '±10', label: '±10 years' },
                        { value: 'any', label: 'Any age' },
                        { value: 'unspecified', label: 'No preference' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() =>
                            setProfile({
                              ...profile,
                              preferences: { ...profile.preferences, ageRange: opt.value },
                            })
                          }
                          className={`p-3 rounded-lg text-sm transition-all ${
                            profile.preferences.ageRange === opt.value
                              ? 'bg-primary-400/20 border-2 border-primary-400'
                              : 'bg-dark-600 border-2 border-transparent'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Communication */}
                  <div>
                    <label className="block text-sm text-dark-200 mb-3">
                      <MessageSquare className="inline mr-2" size={16} />
                      Communication Style
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 'text', label: 'Text Only' },
                        { value: 'voice', label: 'Voice Only' },
                        { value: 'both', label: 'Both' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() =>
                            setProfile({
                              ...profile,
                              preferences: { ...profile.preferences, communication: opt.value },
                            })
                          }
                          className={`p-3 rounded-lg text-sm transition-all ${
                            profile.preferences.communication === opt.value
                              ? 'bg-primary-400/20 border-2 border-primary-400'
                              : 'bg-dark-600 border-2 border-transparent'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
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
