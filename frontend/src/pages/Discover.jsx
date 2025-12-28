import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Home,
  Plane,
  Globe,
} from 'lucide-react';
import { matchesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

// Mode label helpers
const getModeIcon = (mode) => {
  if (mode === 'LOCAL') return <Home size={16} className="text-primary-400" />;
  if (mode === 'TRAVELER') return <Plane size={16} className="text-accent-400" />;
  return <Globe size={16} className="text-dark-400" />;
};

const getModeLabel = (mode) => {
  if (mode === 'LOCAL') return 'Local';
  if (mode === 'TRAVELER') return 'Traveler';
  return '';
};

function Discover() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [direction, setDirection] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackReason, setFeedbackReason] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  // Check for mobility data - redirect to onboarding if missing
  useEffect(() => {
    const mobility = userProfile?.mobility;
    if (userProfile && (!mobility?.mode || !mobility?.area?.country)) {
      navigate('/onboarding');
    }
  }, [userProfile, navigate]);

  const FEEDBACK_REASONS = [
    'Not what I\'m looking for',
    'Different destination',
    'Too few shared interests',
    'Age preference',
    'Other',
  ];

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    setLoading(true);
    try {
      const data = await matchesApi.getSuggestedMatches();
      setMatches(data.matches || []);
      setCurrentIndex(0);
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentMatch = matches[currentIndex];

  const removeCurrentMatch = () => {
    const newMatches = matches.filter((_, idx) => idx !== currentIndex);
    setMatches(newMatches);
    if (currentIndex >= newMatches.length && newMatches.length > 0) {
      setCurrentIndex(newMatches.length - 1);
    }
  };

  const handleConnect = async () => {
    if (!currentMatch || actionLoading) return;

    setActionLoading(true);
    setDirection('right');

    try {
      const result = await matchesApi.connect(currentMatch.userId);

      if (result.mutual) {
        setMessageType('success');
        setSuccessMessage(`It's a match! You and ${currentMatch.name} can now chat.`);
      } else if (result.pending) {
        setMessageType('pending');
        setSuccessMessage(result.message || `Request sent to ${currentMatch.name}. They need to connect back!`);
      } else if (result.alreadyConnected) {
        setMessageType('success');
        setSuccessMessage(`You're already connected with ${currentMatch.name}!`);
      } else {
        setMessageType('success');
        setSuccessMessage(`Connected with ${currentMatch.name}!`);
      }

      setTimeout(() => {
        setSuccessMessage('');
        removeCurrentMatch();
        setDirection(null);
        setActionLoading(false);
      }, 2000);
    } catch (error) {
      console.error('Connect error:', error);
      alert(`Failed to connect: ${error.message}`);
      setDirection(null);
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!currentMatch || actionLoading) return;

    if (!showFeedback) {
      setShowFeedback(true);
      return;
    }

    setActionLoading(true);
    setDirection('left');

    try {
      await matchesApi.decline(currentMatch.userId, feedbackReason);
      setShowFeedback(false);
      setFeedbackReason('');
      setTimeout(() => {
        removeCurrentMatch();
        setDirection(null);
        setActionLoading(false);
      }, 300);
    } catch (error) {
      console.error('Decline error:', error);
      setDirection(null);
      setActionLoading(false);
    }
  };

  const nextMatch = () => {
    if (currentIndex < matches.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const prevMatch = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // Get user's mobility for context
  const userMobility = userProfile?.mobility;
  const isUserLocal = userMobility?.mode === 'LOCAL';
  const userDestination = userMobility?.area?.city
    ? `${userMobility.area.city}, ${userMobility.area.country}`
    : userMobility?.area?.country || 'your destination';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-400" />
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-dark-700 flex items-center justify-center mx-auto mb-6">
          <Globe className="text-dark-400" size={40} />
        </div>
        <h2 className="text-2xl font-bold mb-4">No Matches Yet</h2>
        <p className="text-dark-300 mb-4">
          We're looking for {isUserLocal ? 'travelers coming to' : 'locals and travelers in'} {userDestination}.
        </p>
        <p className="text-dark-400 text-sm mb-8">
          Try broadening your search to country-level, or check back soon as more people join!
        </p>
        <button onClick={loadMatches} className="btn-primary flex items-center gap-2 mx-auto">
          <RefreshCw size={20} />
          Refresh Matches
        </button>
      </div>
    );
  }

  if (currentIndex >= matches.length) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-dark-700 flex items-center justify-center mx-auto mb-6">
          <Sparkles className="text-primary-400" size={40} />
        </div>
        <h2 className="text-2xl font-bold mb-4">That's Everyone!</h2>
        <p className="text-dark-300 mb-8">
          You've seen all current matches in {userDestination}. Check back later for more connections!
        </p>
        <button onClick={loadMatches} className="btn-primary flex items-center gap-2 mx-auto">
          <RefreshCw size={20} />
          Find More Matches
        </button>
      </div>
    );
  }

  // Ensure match reasons always exist with fallback
  const matchReasons = currentMatch?.matchReasons?.length > 0
    ? currentMatch.matchReasons
    : ['Compatible mobility goals'];

  // Get destination display for match
  const matchDestination = currentMatch?.mobility?.area?.city
    ? `${currentMatch.mobility.area.city}, ${currentMatch.mobility.area.country}`
    : currentMatch?.mobility?.area?.country;

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      {/* Progress indicator */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={prevMatch}
          disabled={currentIndex === 0}
          className="btn-ghost p-2 disabled:opacity-30"
        >
          <ChevronLeft size={24} />
        </button>
        <span className="text-dark-300">
          {currentIndex + 1} / {matches.length}
        </span>
        <button
          onClick={nextMatch}
          disabled={currentIndex >= matches.length - 1}
          className="btn-ghost p-2 disabled:opacity-30"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Match Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentMatch?.userId}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{
            opacity: 1,
            scale: 1,
            x: direction === 'left' ? -300 : direction === 'right' ? 300 : 0,
          }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.3 }}
          className="card p-0 overflow-hidden"
        >
          {/* Header with avatar */}
          <div className="bg-gradient-to-br from-primary-400/20 to-accent-400/20 p-8 text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-4xl font-bold mx-auto mb-4">
              {currentMatch?.name?.charAt(0) || '?'}
            </div>
            <h2 className="text-2xl font-bold mb-1">
              {currentMatch?.name}, {currentMatch?.age}
            </h2>

            {/* Mobility Info - Always show destination */}
            <div className="flex items-center justify-center gap-2 mb-2">
              {currentMatch?.mobility ? (
                <>
                  {getModeIcon(currentMatch.mobility.mode)}
                  <span className="text-sm">
                    {getModeLabel(currentMatch.mobility.mode)} in {matchDestination}
                  </span>
                </>
              ) : (
                <span className="text-sm text-dark-400">Destination not set</span>
              )}
            </div>
          </div>

          {/* Match Reasons - Always visible */}
          <div className="px-6 py-4 bg-dark-700/50 border-b border-dark-600">
            <h3 className="text-xs text-dark-400 mb-2 uppercase tracking-wide">Why this match</h3>
            <div className="flex flex-wrap gap-2">
              {matchReasons.map((reason, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-success-400/20 text-success-400 rounded-full text-sm"
                >
                  {reason}
                </span>
              ))}
            </div>

            {/* AI-generated match summary - scrollable */}
            {currentMatch?.aiSummary && (
              <div className="mt-3 max-h-20 overflow-y-auto">
                <p className="text-sm text-dark-200 italic">
                  {currentMatch.aiSummary}
                </p>
              </div>
            )}
          </div>

          {/* Compatibility */}
          <div className="p-6 border-b border-dark-600">
            <div className="flex items-center justify-between mb-2">
              <span className="text-dark-300">Compatibility</span>
              <span className="text-success-400 font-bold flex items-center gap-1">
                <Zap size={18} />
                {currentMatch?.compatibilityScore || 0}%
              </span>
            </div>
            <div className="w-full h-2 bg-dark-600 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-400 to-success-400 rounded-full transition-all"
                style={{ width: `${currentMatch?.compatibilityScore || 0}%` }}
              />
            </div>
          </div>

          {/* Why Here */}
          {currentMatch?.whyHere && (
            <div className="p-6 border-b border-dark-600">
              <h3 className="text-sm text-dark-300 mb-2">Looking for</h3>
              <p className="font-medium">{currentMatch.whyHere}</p>
            </div>
          )}

          {/* Shared Interests */}
          <div className="p-6">
            <h3 className="text-sm text-dark-300 mb-3">Shared Interests</h3>
            <div className="flex flex-wrap gap-2">
              {currentMatch?.sharedInterests?.length > 0 ? (
                currentMatch.sharedInterests.map((interest) => (
                  <span
                    key={interest}
                    className="px-3 py-1 bg-primary-400/20 text-primary-400 rounded-full text-sm"
                  >
                    {interest}
                  </span>
                ))
              ) : (
                <span className="text-dark-400 text-sm">No shared interests yet</span>
              )}
            </div>
            {currentMatch?.otherInterests?.length > 0 && (
              <>
                <h3 className="text-sm text-dark-300 mb-3 mt-4">Their Other Interests</h3>
                <div className="flex flex-wrap gap-2">
                  {currentMatch.otherInterests.slice(0, 5).map((interest) => (
                    <span
                      key={interest}
                      className="px-3 py-1 bg-dark-600 rounded-full text-sm"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Feedback Modal */}
      {showFeedback && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card mt-4 p-4"
        >
          <h3 className="font-medium mb-3">Why are you passing?</h3>
          <div className="space-y-2">
            {FEEDBACK_REASONS.map((reason) => (
              <button
                key={reason}
                onClick={() => setFeedbackReason(reason)}
                className={`w-full p-3 rounded-lg text-left text-sm transition-all ${
                  feedbackReason === reason
                    ? 'bg-primary-400/20 border-2 border-primary-400'
                    : 'bg-dark-600 border-2 border-transparent'
                }`}
              >
                {reason}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => {
                setShowFeedback(false);
                setFeedbackReason('');
              }}
              className="btn-ghost flex-1"
            >
              Cancel
            </button>
            <button
              onClick={handleDecline}
              disabled={!feedbackReason}
              className="btn-secondary flex-1"
            >
              Submit
            </button>
          </div>
        </motion.div>
      )}

      {/* Success/Pending Message */}
      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-4 p-4 rounded-xl text-center font-medium ${
            messageType === 'success'
              ? 'bg-success-400/20 border border-success-400/30 text-success-400'
              : 'bg-primary-400/20 border border-primary-400/30 text-primary-400'
          }`}
        >
          {successMessage}
        </motion.div>
      )}

      {/* Action Buttons */}
      {!showFeedback && !successMessage && (
        <div className="flex gap-4 mt-6">
          <button
            onClick={handleDecline}
            disabled={actionLoading}
            className="btn-secondary flex-1 py-4 flex items-center justify-center gap-2"
          >
            <ThumbsDown size={24} />
            Not Interested
          </button>
          <button
            onClick={handleConnect}
            disabled={actionLoading}
            className="btn-success flex-1 py-4 flex items-center justify-center gap-2"
          >
            <ThumbsUp size={24} />
            Connect Now
          </button>
        </div>
      )}
    </div>
  );
}

export default Discover;
