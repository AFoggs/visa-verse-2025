import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, HelpCircle, Check, X, Trophy, Lightbulb } from 'lucide-react';

function TwentyQuestionsGame({ gameState, userId, otherUserName, onSubmitMove, onClose }) {
  const [topic, setTopic] = useState('');
  const [question, setQuestion] = useState('');
  const [finalGuess, setFinalGuess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isTopicSetter = gameState.currentPlayer === userId && gameState.status === 'waiting_topic';
  const isGuesser = gameState.topic && gameState.currentPlayer !== userId ||
    (gameState.status === 'asking' && !isTopicSetter);
  const isAnswerer = gameState.topic && gameState.currentPlayer === userId && gameState.status !== 'waiting_topic';
  const needsAnswer = gameState.status === 'answering' && gameState.questions?.length > 0 &&
    gameState.questions[gameState.questions.length - 1]?.answer === null;
  const isComplete = gameState.status === 'complete';

  const handleSetTopic = async () => {
    if (!topic.trim()) return;
    setSubmitting(true);
    try {
      await onSubmitMove({
        type: 'set_topic',
        topic: topic.trim(),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!question.trim()) return;
    setSubmitting(true);
    try {
      await onSubmitMove({
        type: 'question',
        question: question.trim(),
      });
      setQuestion('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnswer = async (answer) => {
    setSubmitting(true);
    try {
      await onSubmitMove({
        type: 'answer',
        answer,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalGuess = async () => {
    if (!finalGuess.trim()) return;
    setSubmitting(true);
    try {
      await onSubmitMove({
        type: 'guess',
        guess: finalGuess.trim(),
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Game complete
  if (isComplete) {
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

        <div className={`p-4 rounded-lg mb-4 ${
          gameState.correct
            ? 'bg-success-400/20 border border-success-400/30'
            : 'bg-error-400/20 border border-error-400/30'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {gameState.correct ? (
              <Check className="text-success-400" size={24} />
            ) : (
              <X className="text-error-400" size={24} />
            )}
            <span className="font-semibold text-lg">
              {gameState.correct ? 'Correct!' : 'Not quite!'}
            </span>
          </div>
          <p className="text-dark-300">
            The answer was: <span className="font-semibold text-white">{gameState.topic}</span>
          </p>
          {gameState.finalGuess && (
            <p className="text-dark-400 text-sm mt-1">
              Guessed: "{gameState.finalGuess}"
            </p>
          )}
        </div>

        <div className="bg-dark-600 rounded-lg p-3 mb-4">
          <p className="text-sm text-dark-300 mb-2">
            Questions asked: {gameState.questions?.length || 0} / 20
          </p>
        </div>

        <button onClick={onClose} className="btn-primary w-full">
          Continue Chatting
        </button>
      </motion.div>
    );
  }

  // Topic setter phase
  if (isTopicSetter || gameState.status === 'waiting_topic') {
    if (gameState.currentPlayer === userId) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-dark-700 rounded-xl p-6 border border-dark-600"
        >
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">❓</div>
            <h3 className="text-xl font-semibold mb-1">20 Questions</h3>
            <p className="text-dark-300 text-sm">
              Think of something for {otherUserName} to guess!
            </p>
          </div>

          <div className="mb-4">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter a word or phrase..."
              className="input w-full"
              maxLength={100}
            />
            <p className="text-dark-400 text-xs mt-2">
              Pick something they can guess with yes/no questions (person, place, thing, etc.)
            </p>
          </div>

          <button
            onClick={handleSetTopic}
            disabled={!topic.trim() || submitting}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <Lightbulb size={18} />
            {submitting ? 'Setting...' : 'Set Topic'}
          </button>
        </motion.div>
      );
    }

    // Waiting for other player to set topic
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-dark-700 rounded-xl p-6 border border-dark-600"
      >
        <div className="text-center">
          <div className="text-4xl mb-4">🤔</div>
          <h3 className="text-xl font-semibold mb-2">20 Questions</h3>
          <p className="text-dark-300 mb-4">
            {otherUserName} is thinking of something for you to guess...
          </p>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-400" />
          </div>
        </div>
      </motion.div>
    );
  }

  // Answering phase - answer the question
  if (needsAnswer && isAnswerer) {
    const lastQuestion = gameState.questions[gameState.questions.length - 1];

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-dark-700 rounded-xl p-6 border border-dark-600"
      >
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">❓</div>
          <h3 className="text-lg font-semibold">Question #{gameState.questions.length}</h3>
          <p className="text-dark-400 text-sm">
            {gameState.questionsRemaining} questions remaining
          </p>
        </div>

        <div className="bg-dark-600 rounded-lg p-4 mb-4">
          <p className="text-lg text-center">"{lastQuestion.question}"</p>
        </div>

        <p className="text-dark-300 text-sm text-center mb-4">
          Your word: <span className="font-semibold text-primary-400">{gameState.topic}</span>
        </p>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleAnswer('yes')}
            disabled={submitting}
            className="btn bg-success-400/20 hover:bg-success-400/30 text-success-400 border border-success-400/30 py-3"
          >
            Yes
          </button>
          <button
            onClick={() => handleAnswer('sometimes')}
            disabled={submitting}
            className="btn bg-amber-400/20 hover:bg-amber-400/30 text-amber-400 border border-amber-400/30 py-3"
          >
            Sometimes
          </button>
          <button
            onClick={() => handleAnswer('no')}
            disabled={submitting}
            className="btn bg-error-400/20 hover:bg-error-400/30 text-error-400 border border-error-400/30 py-3"
          >
            No
          </button>
        </div>
      </motion.div>
    );
  }

  // Asking phase - ask questions or make final guess
  if (gameState.status === 'asking' || (gameState.status === 'answering' && !needsAnswer)) {
    // If I'm the guesser
    if (!isAnswerer) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-dark-700 rounded-xl p-6 border border-dark-600"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">20 Questions</h3>
            <span className="text-sm text-dark-400">
              {gameState.questionsRemaining} left
            </span>
          </div>

          {/* Question history */}
          {gameState.questions?.length > 0 && (
            <div className="bg-dark-600 rounded-lg p-3 mb-4 max-h-40 overflow-y-auto">
              {gameState.questions.map((q, index) => (
                <div key={index} className="flex justify-between items-center py-1 text-sm border-b border-dark-500 last:border-0">
                  <span className="text-dark-300 truncate flex-1 mr-2">
                    {index + 1}. {q.question}
                  </span>
                  {q.answer && (
                    <span className={`font-medium ${
                      q.answer === 'yes' ? 'text-success-400' :
                      q.answer === 'sometimes' ? 'text-amber-400' : 'text-error-400'
                    }`}>
                      {q.answer}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Waiting for answer */}
          {gameState.questions?.length > 0 &&
           gameState.questions[gameState.questions.length - 1]?.answer === null && (
            <div className="text-center py-4">
              <p className="text-dark-300 text-sm mb-2">Waiting for {otherUserName} to answer...</p>
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-400" />
              </div>
            </div>
          )}

          {/* Ask question or guess */}
          {(!gameState.questions?.length ||
            gameState.questions[gameState.questions.length - 1]?.answer !== null) && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask a yes/no question..."
                  className="input flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion()}
                />
                <button
                  onClick={handleAskQuestion}
                  disabled={!question.trim() || submitting}
                  className="btn-primary px-4"
                >
                  <HelpCircle size={18} />
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-dark-500" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-dark-700 px-2 text-xs text-dark-400">or</span>
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={finalGuess}
                  onChange={(e) => setFinalGuess(e.target.value)}
                  placeholder="Make your final guess..."
                  className="input flex-1"
                />
                <button
                  onClick={handleFinalGuess}
                  disabled={!finalGuess.trim() || submitting}
                  className="btn bg-accent-400/20 hover:bg-accent-400/30 text-accent-400 border border-accent-400/30 px-4"
                >
                  Guess!
                </button>
              </div>
            </div>
          )}
        </motion.div>
      );
    }

    // I'm the answerer, waiting for question
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-dark-700 rounded-xl p-6 border border-dark-600"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">20 Questions</h3>
          <span className="text-sm text-dark-400">
            {gameState.questionsRemaining} left
          </span>
        </div>

        <div className="bg-dark-600 rounded-lg p-3 mb-4">
          <p className="text-sm text-dark-400">Your word:</p>
          <p className="text-xl font-semibold text-primary-400">{gameState.topic}</p>
        </div>

        {/* Question history */}
        {gameState.questions?.length > 0 && (
          <div className="bg-dark-600/50 rounded-lg p-3 mb-4 max-h-32 overflow-y-auto">
            {gameState.questions.filter(q => q.answer).map((q, index) => (
              <div key={index} className="flex justify-between items-center py-1 text-sm border-b border-dark-500 last:border-0">
                <span className="text-dark-300 truncate flex-1 mr-2">
                  {index + 1}. {q.question}
                </span>
                <span className={`font-medium ${
                  q.answer === 'yes' ? 'text-success-400' :
                  q.answer === 'sometimes' ? 'text-amber-400' : 'text-error-400'
                }`}>
                  {q.answer}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="text-center py-4">
          <p className="text-dark-300 text-sm mb-2">Waiting for {otherUserName} to ask a question...</p>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-400" />
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
}

export default TwentyQuestionsGame;
