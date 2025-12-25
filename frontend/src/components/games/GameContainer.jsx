import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader, Gamepad2, Check, XCircle } from 'lucide-react';
import TwoTruthsGame from './TwoTruthsGame';
import TwentyQuestionsGame from './TwentyQuestionsGame';
import WouldYouRatherGame from './WouldYouRatherGame';
import { gamesApi } from '../../services/api';

const GAME_NAMES = {
  two_truths: 'Two Truths & a Lie',
  twenty_questions: '20 Questions',
  '20_questions': '20 Questions',
  would_you_rather: 'Would You Rather',
  word_association: 'Word Association',
};

function GameContainer({ matchId, gameState, userId, otherUserName, onGameUpdate, onClose }) {
  const [localGameState, setLocalGameState] = useState(gameState);
  const [error, setError] = useState(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    setLocalGameState(gameState);
  }, [gameState]);

  const handleSubmitMove = async (move) => {
    try {
      setError(null);
      const result = await gamesApi.submitMove(matchId, move);
      setLocalGameState(result.gameState);
      if (onGameUpdate) {
        onGameUpdate(result.gameState);
      }
      return result.gameState;
    } catch (err) {
      console.error('Game move error:', err);
      setError('Failed to submit move. Please try again.');
      throw err;
    }
  };

  const handleAcceptGame = async () => {
    try {
      setAccepting(true);
      setError(null);
      const result = await gamesApi.acceptGame(matchId);
      setLocalGameState(result.gameState);
      if (onGameUpdate) {
        onGameUpdate(result.gameState);
      }
    } catch (err) {
      console.error('Accept game error:', err);
      setError('Failed to accept game. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  const handleDeclineGame = async () => {
    try {
      setError(null);
      await gamesApi.declineGame(matchId);
      onClose();
    } catch (err) {
      console.error('Decline game error:', err);
      setError('Failed to decline game.');
    }
  };

  const handleClose = async () => {
    onClose();
  };

  if (!localGameState) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-dark-700 rounded-xl p-6 border border-dark-600"
      >
        <div className="text-center">
          <Loader className="mx-auto animate-spin mb-4" size={32} />
          <p className="text-dark-300">Loading game...</p>
        </div>
      </motion.div>
    );
  }

  // Pending invitation state
  if (localGameState.status === 'pending_acceptance') {
    const isInitiator = localGameState.initiator === userId;
    const gameName = GAME_NAMES[localGameState.type] || localGameState.type;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-dark-700 rounded-xl p-6 border border-primary-400/30"
      >
        <div className="text-center">
          <Gamepad2 className="mx-auto text-primary-400 mb-4" size={48} />
          <h3 className="text-xl font-semibold mb-2">{gameName}</h3>

          {isInitiator ? (
            <>
              <p className="text-dark-300 mb-4">
                Waiting for {otherUserName} to accept...
              </p>
              <div className="flex justify-center mb-4">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-400" />
              </div>
              <button
                onClick={handleClose}
                className="btn-secondary text-sm"
              >
                Cancel Invitation
              </button>
            </>
          ) : (
            <>
              <p className="text-dark-300 mb-6">
                {otherUserName} wants to play {gameName}!
              </p>

              {error && (
                <p className="text-error-400 text-sm mb-4">{error}</p>
              )}

              <div className="flex justify-center gap-3">
                <button
                  onClick={handleDeclineGame}
                  className="btn-secondary flex items-center gap-2"
                >
                  <XCircle size={18} />
                  Decline
                </button>
                <button
                  onClick={handleAcceptGame}
                  disabled={accepting}
                  className="btn-primary flex items-center gap-2"
                >
                  <Check size={18} />
                  {accepting ? 'Joining...' : "Let's Play!"}
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    );
  }

  const renderGame = () => {
    switch (localGameState.type) {
      case 'two_truths':
        return (
          <TwoTruthsGame
            gameState={localGameState}
            userId={userId}
            otherUserName={otherUserName}
            onSubmitMove={handleSubmitMove}
            onClose={handleClose}
          />
        );

      case 'twenty_questions':
      case '20_questions':
        return (
          <TwentyQuestionsGame
            gameState={localGameState}
            userId={userId}
            otherUserName={otherUserName}
            onSubmitMove={handleSubmitMove}
            onClose={handleClose}
          />
        );

      case 'would_you_rather':
        return (
          <WouldYouRatherGame
            gameState={localGameState}
            userId={userId}
            otherUserName={otherUserName}
            onSubmitMove={handleSubmitMove}
            onClose={handleClose}
          />
        );

      default:
        return (
          <div className="bg-dark-700 rounded-xl p-6 border border-dark-600">
            <div className="text-center">
              <p className="text-dark-300 mb-4">Unknown game type: {localGameState.type}</p>
              <button onClick={handleClose} className="btn-secondary">
                Close
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative"
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute -top-2 -right-2 z-10 w-8 h-8 rounded-full bg-dark-600 border border-dark-500 flex items-center justify-center text-dark-300 hover:text-white hover:bg-dark-500 transition-colors"
          title="Close game"
        >
          <X size={16} />
        </button>

        {/* Error display */}
        {error && (
          <div className="mb-3 p-3 bg-error-400/20 border border-error-400/30 rounded-lg text-error-400 text-sm">
            {error}
          </div>
        )}

        {/* Game component */}
        {renderGame()}
      </motion.div>
    </AnimatePresence>
  );
}

export default GameContainer;
