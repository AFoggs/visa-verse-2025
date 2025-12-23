import { Router } from 'express';
import { getDb } from '../config/firebase.js';

const router = Router();

// Start a game
router.post('/:matchId/start', async (req, res) => {
  try {
    const { matchId } = req.params;
    const { gameType } = req.body;

    if (!gameType) {
      return res.status(400).json({ error: 'Game type is required' });
    }

    const db = getDb();

    // Verify user is part of this match
    const matchDoc = await db.collection('matches').doc(matchId).get();
    if (!matchDoc.exists) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const matchData = matchDoc.data();
    if (matchData.user1Id !== req.user.uid && matchData.user2Id !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let gameState;

    switch (gameType) {
      case 'two_truths':
        gameState = {
          type: 'two_truths',
          status: 'waiting_submission',
          currentPlayer: req.user.uid,
          submissions: {},
          guesses: {},
          round: 1,
        };
        break;

      case 'twenty_questions':
        gameState = {
          type: 'twenty_questions',
          status: 'waiting_topic',
          currentPlayer: req.user.uid,
          topic: null,
          questions: [],
          questionsRemaining: 20,
        };
        break;

      case 'word_association':
        const startWords = ['Ocean', 'Dream', 'Adventure', 'Music', 'Coffee', 'Stars'];
        gameState = {
          type: 'word_association',
          status: 'active',
          currentPlayer: req.user.uid,
          chain: [startWords[Math.floor(Math.random() * startWords.length)]],
          turnTimeout: 30,
        };
        break;

      default:
        return res.status(400).json({ error: 'Invalid game type' });
    }

    // Save game state
    const convDoc = await db.collection('conversations').doc(matchId).get();

    if (convDoc.exists) {
      await db.collection('conversations').doc(matchId).update({
        gameState,
        updatedAt: new Date(),
      });
    } else {
      await db.collection('conversations').doc(matchId).set({
        conversationId: matchId,
        participants: [matchData.user1Id, matchData.user2Id],
        messages: [],
        gameState,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Notify other user via socket
    const io = req.app.get('io');
    if (io) {
      io.to(matchId).emit('game_started', {
        matchId,
        gameType,
        gameState,
        startedBy: req.user.uid,
      });
    }

    res.json({ gameState });
  } catch (error) {
    console.error('Start game error:', error);
    res.status(500).json({ error: 'Failed to start game' });
  }
});

// Submit a game move
router.post('/:matchId/move', async (req, res) => {
  try {
    const { matchId } = req.params;
    const { move } = req.body;

    if (!move) {
      return res.status(400).json({ error: 'Move is required' });
    }

    const db = getDb();

    // Get conversation with game state
    const convDoc = await db.collection('conversations').doc(matchId).get();
    if (!convDoc.exists) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const convData = convDoc.data();
    const gameState = convData.gameState;

    if (!gameState) {
      return res.status(400).json({ error: 'No active game' });
    }

    let updatedGameState;

    switch (gameState.type) {
      case 'two_truths':
        updatedGameState = handleTwoTruthsMove(gameState, req.user.uid, move);
        break;

      case 'twenty_questions':
        updatedGameState = handleTwentyQuestionsMove(gameState, req.user.uid, move);
        break;

      case 'word_association':
        updatedGameState = handleWordAssociationMove(gameState, req.user.uid, move);
        break;

      default:
        return res.status(400).json({ error: 'Invalid game type' });
    }

    await db.collection('conversations').doc(matchId).update({
      gameState: updatedGameState,
      updatedAt: new Date(),
    });

    // Notify via socket
    const io = req.app.get('io');
    if (io) {
      io.to(matchId).emit('game_move', {
        matchId,
        move,
        playerId: req.user.uid,
        gameState: updatedGameState,
      });
    }

    res.json({ gameState: updatedGameState });
  } catch (error) {
    console.error('Game move error:', error);
    res.status(500).json({ error: 'Failed to process move' });
  }
});

// Get current game state
router.get('/:matchId/state', async (req, res) => {
  try {
    const { matchId } = req.params;
    const db = getDb();

    const convDoc = await db.collection('conversations').doc(matchId).get();
    if (!convDoc.exists) {
      return res.json({ gameState: null });
    }

    res.json({ gameState: convDoc.data().gameState || null });
  } catch (error) {
    console.error('Get game state error:', error);
    res.status(500).json({ error: 'Failed to get game state' });
  }
});

// Helper functions for game logic

function handleTwoTruthsMove(gameState, playerId, move) {
  const newState = { ...gameState };

  if (move.type === 'submit_statements') {
    // Player submitting their two truths and a lie
    newState.submissions[playerId] = {
      statements: move.statements,
      lieIndex: move.lieIndex,
    };

    // If both players have submitted, move to guessing phase
    const submissions = Object.keys(newState.submissions);
    if (submissions.length === 2) {
      newState.status = 'guessing';
      newState.currentPlayer = submissions.find(id => id !== playerId);
    }
  } else if (move.type === 'guess') {
    // Player guessing the lie
    const otherPlayerId = Object.keys(newState.submissions).find(id => id !== playerId);
    newState.guesses[playerId] = move.guessIndex;

    const correct = move.guessIndex === newState.submissions[otherPlayerId].lieIndex;

    // Check if both players have guessed
    if (Object.keys(newState.guesses).length === 2) {
      newState.status = 'complete';
      newState.results = {
        [playerId]: correct,
      };
    }
  }

  return newState;
}

function handleTwentyQuestionsMove(gameState, playerId, move) {
  const newState = { ...gameState };

  if (move.type === 'set_topic') {
    newState.topic = move.topic;
    newState.status = 'asking';
    // Switch to other player
    newState.currentPlayer = null; // Will be set by other player asking
  } else if (move.type === 'question') {
    newState.questions.push({
      question: move.question,
      askedBy: playerId,
      answer: null,
    });
    newState.questionsRemaining--;
    newState.status = 'answering';
  } else if (move.type === 'answer') {
    const lastQuestion = newState.questions[newState.questions.length - 1];
    if (lastQuestion) {
      lastQuestion.answer = move.answer;
    }

    if (newState.questionsRemaining === 0) {
      newState.status = 'complete';
    } else {
      newState.status = 'asking';
    }
  } else if (move.type === 'guess') {
    newState.finalGuess = move.guess;
    newState.correct = move.guess.toLowerCase() === newState.topic.toLowerCase();
    newState.status = 'complete';
  }

  return newState;
}

function handleWordAssociationMove(gameState, playerId, move) {
  const newState = { ...gameState };

  if (move.type === 'word') {
    newState.chain.push(move.word);
    // Switch player
    newState.currentPlayer = playerId; // Will alternate
  }

  // End game if chain is too long or player gives up
  if (move.type === 'end' || newState.chain.length >= 20) {
    newState.status = 'complete';
  }

  return newState;
}

export default router;
