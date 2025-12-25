import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Send, Trophy, AlertCircle } from 'lucide-react';

function TwoTruthsGame({ gameState, userId, otherUserName, onSubmitMove, onClose }) {
  const [statements, setStatements] = useState(['', '', '']);
  const [lieIndex, setLieIndex] = useState(null);
  const [selectedGuess, setSelectedGuess] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const hasSubmitted = gameState.submissions?.[userId];
  const otherUserId = Object.keys(gameState.submissions || {}).find(id => id !== userId);
  const otherSubmission = otherUserId ? gameState.submissions[otherUserId] : null;
  const hasGuessed = gameState.guesses?.[userId] !== undefined;
  const isComplete = gameState.status === 'complete';

  const handleStatementChange = (index, value) => {
    const newStatements = [...statements];
    newStatements[index] = value;
    setStatements(newStatements);
  };

  const handleSubmitStatements = async () => {
    if (statements.some(s => !s.trim()) || lieIndex === null) return;

    setSubmitting(true);
    try {
      await onSubmitMove({
        type: 'submit_statements',
        statements,
        lieIndex,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitGuess = async () => {
    if (selectedGuess === null) return;

    setSubmitting(true);
    try {
      await onSubmitMove({
        type: 'guess',
        guessIndex: selectedGuess,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Waiting for other player to submit
  if (hasSubmitted && !otherSubmission) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-dark-700 rounded-xl p-6 border border-dark-600"
      >
        <div className="text-center">
          <div className="text-4xl mb-4">🎭</div>
          <h3 className="text-xl font-semibold mb-2">Two Truths & a Lie</h3>
          <p className="text-dark-300 mb-4">
            Great! Your statements are ready. Waiting for {otherUserName} to submit theirs...
          </p>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-400" />
          </div>
        </div>
      </motion.div>
    );
  }

  // Game complete - show results
  if (isComplete) {
    const myGuessCorrect = otherSubmission && gameState.guesses?.[userId] === otherSubmission.lieIndex;
    const theirGuessCorrect = hasSubmitted && gameState.guesses?.[otherUserId] === gameState.submissions[userId]?.lieIndex;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-dark-700 rounded-xl p-6 border border-dark-600"
      >
        <div className="text-center mb-6">
          <Trophy className="mx-auto text-amber-400 mb-2" size={48} />
          <h3 className="text-xl font-semibold">Game Complete!</h3>
        </div>

        <div className="space-y-4">
          {/* Your result */}
          <div className={`p-4 rounded-lg ${myGuessCorrect ? 'bg-success-400/20 border border-success-400/30' : 'bg-error-400/20 border border-error-400/30'}`}>
            <div className="flex items-center gap-2 mb-2">
              {myGuessCorrect ? (
                <Check className="text-success-400" size={20} />
              ) : (
                <X className="text-error-400" size={20} />
              )}
              <span className="font-medium">
                {myGuessCorrect ? 'You guessed correctly!' : 'You guessed wrong!'}
              </span>
            </div>
            {otherSubmission && (
              <p className="text-sm text-dark-300">
                The lie was: "{otherSubmission.statements[otherSubmission.lieIndex]}"
              </p>
            )}
          </div>

          {/* Their result */}
          {hasSubmitted && (
            <div className={`p-4 rounded-lg ${theirGuessCorrect ? 'bg-error-400/20 border border-error-400/30' : 'bg-success-400/20 border border-success-400/30'}`}>
              <div className="flex items-center gap-2 mb-2">
                {theirGuessCorrect ? (
                  <AlertCircle className="text-error-400" size={20} />
                ) : (
                  <Check className="text-success-400" size={20} />
                )}
                <span className="font-medium">
                  {theirGuessCorrect ? `${otherUserName} guessed your lie!` : `${otherUserName} fell for your lie!`}
                </span>
              </div>
              <p className="text-sm text-dark-300">
                Your lie was: "{gameState.submissions[userId].statements[gameState.submissions[userId].lieIndex]}"
              </p>
            </div>
          )}
        </div>

        <button onClick={onClose} className="btn-primary w-full mt-6">
          Continue Chatting
        </button>
      </motion.div>
    );
  }

  // Guessing phase - guess the other player's lie
  if (gameState.status === 'guessing' && otherSubmission && !hasGuessed) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-dark-700 rounded-xl p-6 border border-dark-600"
      >
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🔍</div>
          <h3 className="text-xl font-semibold mb-1">Find the Lie!</h3>
          <p className="text-dark-300 text-sm">
            Which of {otherUserName}'s statements is false?
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {otherSubmission.statements.map((statement, index) => (
            <button
              key={index}
              onClick={() => setSelectedGuess(index)}
              className={`w-full p-4 rounded-lg text-left transition-all ${
                selectedGuess === index
                  ? 'bg-primary-400/20 border-2 border-primary-400'
                  : 'bg-dark-600 border-2 border-transparent hover:border-dark-500'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-dark-500 flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </span>
                <p>{statement}</p>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleSubmitGuess}
          disabled={selectedGuess === null || submitting}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <Send size={18} />
          {submitting ? 'Submitting...' : 'This is the Lie!'}
        </button>
      </motion.div>
    );
  }

  // Waiting for other player to guess
  if (gameState.status === 'guessing' && hasGuessed) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-dark-700 rounded-xl p-6 border border-dark-600"
      >
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <h3 className="text-xl font-semibold mb-2">Guess Submitted!</h3>
          <p className="text-dark-300 mb-4">
            Waiting for {otherUserName} to make their guess...
          </p>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-400" />
          </div>
        </div>
      </motion.div>
    );
  }

  // Submission phase - enter your statements
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-dark-700 rounded-xl p-6 border border-dark-600"
    >
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">🎭</div>
        <h3 className="text-xl font-semibold mb-1">Two Truths & a Lie</h3>
        <p className="text-dark-300 text-sm">
          Enter 2 true statements and 1 lie about yourself
        </p>
      </div>

      <div className="space-y-4 mb-6">
        {statements.map((statement, index) => (
          <div key={index} className="relative">
            <input
              type="text"
              value={statement}
              onChange={(e) => handleStatementChange(index, e.target.value)}
              placeholder={`Statement ${index + 1}...`}
              className="input w-full pr-20"
              maxLength={200}
            />
            <button
              onClick={() => setLieIndex(lieIndex === index ? null : index)}
              className={`absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded text-xs font-medium transition-colors ${
                lieIndex === index
                  ? 'bg-error-400 text-white'
                  : 'bg-dark-500 text-dark-300 hover:bg-dark-400'
              }`}
            >
              {lieIndex === index ? '← LIE' : 'Mark Lie'}
            </button>
          </div>
        ))}
      </div>

      <p className="text-dark-400 text-xs text-center mb-4">
        Click "Mark Lie" on your false statement
      </p>

      <button
        onClick={handleSubmitStatements}
        disabled={statements.some(s => !s.trim()) || lieIndex === null || submitting}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        <Send size={18} />
        {submitting ? 'Submitting...' : 'Submit Statements'}
      </button>
    </motion.div>
  );
}

export default TwoTruthsGame;
