import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ArrowRight, RefreshCw, MessageCircle } from 'lucide-react';

function WouldYouRatherGame({ gameState, userId, otherUserName, onSubmitMove, onClose }) {
  const [submitting, setSubmitting] = useState(false);

  const myChoice = gameState.choices?.[userId];
  const otherUserId = Object.keys(gameState.choices || {}).find(id => id !== userId);
  const otherChoice = otherUserId ? gameState.choices[otherUserId] : null;
  const bothChosen = myChoice !== undefined && otherChoice !== undefined;
  const isComplete = gameState.status === 'complete';
  const isRevealed = gameState.status === 'revealed' || bothChosen;

  const handleChoice = async (choice) => {
    if (myChoice !== undefined) return;
    setSubmitting(true);
    try {
      await onSubmitMove({
        type: 'choose',
        choice, // 'A' or 'B'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextPrompt = async () => {
    setSubmitting(true);
    try {
      await onSubmitMove({
        type: 'next_prompt',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Show results when both have chosen or game is revealed
  if (isRevealed && gameState.prompt) {
    const sameChoice = myChoice === otherChoice;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-dark-700 rounded-xl p-6 border border-dark-600"
      >
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">🤔</div>
          <h3 className="text-lg font-semibold">Would You Rather</h3>
          {sameChoice ? (
            <p className="text-success-400 text-sm">You both chose the same! 🎉</p>
          ) : (
            <p className="text-accent-400 text-sm">Interesting - different choices!</p>
          )}
        </div>

        <div className="space-y-3 mb-6">
          {/* Option A */}
          <div className={`p-4 rounded-lg border-2 transition-all ${
            myChoice === 'A' && otherChoice === 'A'
              ? 'bg-success-400/20 border-success-400'
              : myChoice === 'A'
                ? 'bg-primary-400/20 border-primary-400'
                : otherChoice === 'A'
                  ? 'bg-accent-400/20 border-accent-400'
                  : 'bg-dark-600 border-dark-500'
          }`}>
            <div className="flex justify-between items-start">
              <p className="flex-1">{gameState.prompt.optionA}</p>
              <div className="flex gap-1 ml-2">
                {myChoice === 'A' && (
                  <span className="text-xs bg-primary-400 text-white px-2 py-0.5 rounded">You</span>
                )}
                {otherChoice === 'A' && (
                  <span className="text-xs bg-accent-400 text-white px-2 py-0.5 rounded">{otherUserName}</span>
                )}
              </div>
            </div>
          </div>

          <div className="text-center text-dark-400 text-sm">OR</div>

          {/* Option B */}
          <div className={`p-4 rounded-lg border-2 transition-all ${
            myChoice === 'B' && otherChoice === 'B'
              ? 'bg-success-400/20 border-success-400'
              : myChoice === 'B'
                ? 'bg-primary-400/20 border-primary-400'
                : otherChoice === 'B'
                  ? 'bg-accent-400/20 border-accent-400'
                  : 'bg-dark-600 border-dark-500'
          }`}>
            <div className="flex justify-between items-start">
              <p className="flex-1">{gameState.prompt.optionB}</p>
              <div className="flex gap-1 ml-2">
                {myChoice === 'B' && (
                  <span className="text-xs bg-primary-400 text-white px-2 py-0.5 rounded">You</span>
                )}
                {otherChoice === 'B' && (
                  <span className="text-xs bg-accent-400 text-white px-2 py-0.5 rounded">{otherUserName}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleNextPrompt}
            disabled={submitting}
            className="btn-secondary flex-1 flex items-center justify-center gap-2"
          >
            <RefreshCw size={16} className={submitting ? 'animate-spin' : ''} />
            Another One
          </button>
          <button onClick={onClose} className="btn-primary flex-1 flex items-center justify-center gap-2">
            <MessageCircle size={16} />
            Discuss
          </button>
        </div>
      </motion.div>
    );
  }

  // Waiting for other player's choice
  if (myChoice !== undefined && !isRevealed) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-dark-700 rounded-xl p-6 border border-dark-600"
      >
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <h3 className="text-xl font-semibold mb-2">Choice Locked In!</h3>
          <p className="text-dark-300 mb-2">
            You chose Option {myChoice}
          </p>
          <p className="text-dark-400 text-sm mb-4">
            Waiting for {otherUserName} to choose...
          </p>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-400" />
          </div>
        </div>
      </motion.div>
    );
  }

  // Choosing phase
  if (gameState.prompt) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-dark-700 rounded-xl p-6 border border-dark-600"
      >
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🤔</div>
          <h3 className="text-xl font-semibold mb-1">Would You Rather...</h3>
          <p className="text-dark-400 text-sm">
            Both of you choose, then reveal!
          </p>
        </div>

        <div className="space-y-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleChoice('A')}
            disabled={submitting}
            className="w-full p-4 bg-dark-600 hover:bg-primary-400/20 border-2 border-dark-500 hover:border-primary-400 rounded-lg text-left transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-primary-400/20 text-primary-400 flex items-center justify-center font-bold">
                A
              </span>
              <p>{gameState.prompt.optionA}</p>
            </div>
          </motion.button>

          <div className="text-center text-dark-400 text-sm py-1">OR</div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleChoice('B')}
            disabled={submitting}
            className="w-full p-4 bg-dark-600 hover:bg-accent-400/20 border-2 border-dark-500 hover:border-accent-400 rounded-lg text-left transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-accent-400/20 text-accent-400 flex items-center justify-center font-bold">
                B
              </span>
              <p>{gameState.prompt.optionB}</p>
            </div>
          </motion.button>
        </div>
      </motion.div>
    );
  }

  // Loading state
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-dark-700 rounded-xl p-6 border border-dark-600"
    >
      <div className="text-center">
        <div className="text-4xl mb-4">🎲</div>
        <h3 className="text-xl font-semibold mb-2">Loading prompt...</h3>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-400" />
        </div>
      </div>
    </motion.div>
  );
}

export default WouldYouRatherGame;
